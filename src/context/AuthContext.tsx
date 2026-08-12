"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, githubProvider } from "@/lib/firebase";
import { 
  syncUserProfileWithPostgres,
  restoreArchivedAccountAction,
  startFreshAction,
  fetchUserProfileAndSecurity
} from "@/app/actions/settings-actions";

export interface UserProfile {
  uid: string;
  fullName: string;
  displayName?: string | null;
  username: string;
  email: string;
  avatarUrl?: string; // compatible name
  avatar?: string;    // unified name
  university?: string;
  roleInContriTrack?: string; // compatible name
  role?: string;              // unified name
  githubUsername?: string;
  linkedinUrl?: string;       // compatible name
  linkedin?: string;          // unified name
  userType?: string;          // compatible name
  classification?: string;    // unified name
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isArchived: boolean;
  archiveEmail: string;
  archiveUserId: string;
  archiveDeletedAt: string | null;
  archiveRecoverableUntil: string | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (data: { fullName: string; email: string; password: string; university?: string; githubUsername?: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  checkEmailVerifiedStatus: () => Promise<boolean>;
  restoreArchivedAccount: () => Promise<void>;
  startFresh: () => Promise<void>;
  syncProfile: (firebaseUser: User, extraData?: { fullName?: string; displayName?: string; university?: string; githubUsername?: string; avatarUrl?: string; skipPostgresSync?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Recovery Interstitial States
  const [isArchived, setIsArchived] = useState(false);
  const [archiveEmail, setArchiveEmail] = useState("");
  const [archiveUserId, setArchiveUserId] = useState("");
  const [archiveDeletedAt, setArchiveDeletedAt] = useState<string | null>(null);
  const [archiveRecoverableUntil, setArchiveRecoverableUntil] = useState<string | null>(null);

  // Sync user metadata to Firestore users collection
  const syncProfile = React.useCallback(async (
    firebaseUser: User,
    extraData?: {
      fullName?: string;
      displayName?: string;
      university?: string;
      githubUsername?: string;
      avatarUrl?: string;
      skipPostgresSync?: boolean;
    }
  ) => {
    // Optimistic Client-Side State Update
    if (extraData && profile) {
      const updatedProfile: UserProfile = {
        ...profile,
        fullName: extraData.fullName !== undefined ? extraData.fullName : profile.fullName,
        displayName: extraData.displayName !== undefined ? extraData.displayName : profile.displayName,
        university: extraData.university !== undefined ? extraData.university : profile.university,
        githubUsername: extraData.githubUsername !== undefined ? extraData.githubUsername : profile.githubUsername,
        avatarUrl: extraData.avatarUrl !== undefined ? extraData.avatarUrl : profile.avatarUrl,
        avatar: extraData.avatarUrl !== undefined ? extraData.avatarUrl : profile.avatar,
      };
      setProfile(updatedProfile);

      // Perform backend operations in the background
      void (async () => {
        if (!extraData.skipPostgresSync) {
          try {
            await syncUserProfileWithPostgres(firebaseUser.uid, {
              fullName: updatedProfile.fullName,
              displayName: updatedProfile.displayName || undefined,
              email: updatedProfile.email,
              university: updatedProfile.university,
              githubUsername: updatedProfile.githubUsername
            });
          } catch (dbErr) {
            console.error("Background Postgres sync failed:", dbErr);
          }
        }

        try {
          const docRef = doc(db, "users", firebaseUser.uid);
          await setDoc(docRef, updatedProfile, { merge: true });
        } catch (fsErr) {
          console.warn("Background Firestore cache sync failed:", fsErr);
        }
      })();

      return;
    }

    // 1. Fetch profile from PostgreSQL (Source of Truth)
    const dbProfileResult = await fetchUserProfileAndSecurity(firebaseUser.uid);
    let profileData: UserProfile;

    if (dbProfileResult.success && dbProfileResult.profile) {
      const dbProfile = dbProfileResult.profile;

      // PostgreSQL exists. Construct the unified user profile.
      profileData = {
        uid: firebaseUser.uid,
        fullName: extraData?.fullName !== undefined ? extraData.fullName : dbProfile.fullName,
        displayName: extraData?.displayName !== undefined ? extraData.displayName : (dbProfile.displayName || firebaseUser.displayName || ""),
        username: firebaseUser.email?.split("@")[0] || "user",
        email: firebaseUser.email || dbProfile.email || "",
        avatarUrl: extraData?.avatarUrl || dbProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbProfile.fullName || "US")}`,
        avatar: extraData?.avatarUrl || dbProfile.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(dbProfile.fullName || "US")}`,
        university: extraData?.university !== undefined ? extraData.university : (dbProfile.university || ""),
        roleInContriTrack: dbProfile.roleInContriTrack || "Student",
        role: dbProfile.roleInContriTrack || "Student",
        githubUsername: extraData?.githubUsername !== undefined ? extraData.githubUsername : (dbProfile.githubUsername || ""),
        linkedinUrl: dbProfile.linkedinUrl || "",
        linkedin: dbProfile.linkedinUrl || "",
        userType: dbProfile.userType || "Student",
        classification: dbProfile.userType || "Student",
        createdAt: dbProfile.createdAt instanceof Date ? dbProfile.createdAt.toISOString() : String(dbProfile.createdAt)
      };

      // If extraData is provided (manual settings save), update Postgres as well to keep it 100% in sync
      if (extraData && !extraData.skipPostgresSync) {
        await syncUserProfileWithPostgres(firebaseUser.uid, {
          fullName: profileData.fullName,
          displayName: profileData.displayName || undefined,
          email: profileData.email,
          university: profileData.university,
          githubUsername: profileData.githubUsername
        });
      }

      // Write/Merge into Firestore to align cache with Postgres
      try {
        const docRef = doc(db, "users", firebaseUser.uid);
        await setDoc(docRef, profileData, { merge: true });
      } catch (fsErr) {
        console.warn("Firestore cache merge deferred:", fsErr);
      }

    } else {
      // PostgreSQL profile does NOT exist yet (first signup or onboarding)
      const fallbackName = extraData?.fullName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
      const fallbackDisplayName = extraData?.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
      profileData = {
        uid: firebaseUser.uid,
        fullName: fallbackName,
        displayName: fallbackDisplayName,
        username: firebaseUser.email?.split("@")[0] || "user",
        email: firebaseUser.email || "",
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`,
        university: extraData?.university || "",
        roleInContriTrack: "Student",
        role: "Student",
        githubUsername: extraData?.githubUsername || "",
        linkedinUrl: "",
        linkedin: "",
        userType: "Student",
        classification: "Student",
        createdAt: new Date().toISOString()
      };

      // Save to Postgres
      try {
        const res = await syncUserProfileWithPostgres(firebaseUser.uid, {
          fullName: profileData.fullName,
          displayName: profileData.displayName || undefined,
          email: profileData.email,
          university: profileData.university,
          githubUsername: profileData.githubUsername
        });

        if (res.success && res.isArchived) {
          setIsArchived(true);
          setArchiveEmail(res.email || "");
          setArchiveUserId(firebaseUser.uid);
          setArchiveDeletedAt(res.deletedAt ? new Date(res.deletedAt).toISOString() : null);
          setArchiveRecoverableUntil(res.recoverableUntil ? new Date(res.recoverableUntil).toISOString() : null);
          setProfile(null);
          return;
        }
      } catch (dbErr) {
        console.error("Supabase Postgres profile sync deferred:", dbErr);
      }

      // Save to Firestore
      try {
        const docRef = doc(db, "users", firebaseUser.uid);
        await setDoc(docRef, profileData);
      } catch (fsErr) {
        console.warn("Firestore user document write deferred:", fsErr);
      }
    }

    setProfile(profileData);
  }, [profile]);

  // Listen to Authentication session changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          await syncProfile(firebaseUser);
        } catch (err) {
          console.error("Firestore sync deferred at start", err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [syncProfile]);

  // Register Service Worker and initialize meeting reminder worker
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("serviceWorker" in navigator && "PushManager" in window) {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registered successfully with scope:", reg.scope);
          })
          .catch((err) => {
            console.error("Service Worker registration failed:", err);
          });
      }

      // Initialize periodic meeting reminder processing gracefully
      const runCronTriggers = async () => {
        try {
          await fetch("/api/cron/process-reminders").catch(() => {});
          await fetch("/api/cron/purge-expired-accounts").catch(() => {});
        } catch (_err) {
          // Silent fallback for cron tasks
        }
      };

      runCronTriggers();
      const intervalId = setInterval(runCronTriggers, 300000); // 5 min interval
      return () => clearInterval(intervalId);
    }
  }, []);

  // Standard email login flow
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncProfile(cred.user);
    } finally {
      setLoading(false);
    }
  };

  // Standard email signup flow
  const signUp = async (data: { fullName: string; email: string; password: string; university?: string; githubUsername?: string }) => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Update Auth Display Name
      await updateProfile(cred.user, { displayName: data.fullName });

      // Sync Firestore profile
      await syncProfile(cred.user, {
        fullName: data.fullName,
        university: data.university,
        githubUsername: data.githubUsername
      });

      // Send Verification Link (strictly live)
      try {
        await sendEmailVerification(cred.user);
      } catch (emailErr) {
        console.warn("Email verification link dispatch deferred:", emailErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth triggers
  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncProfile(cred.user);
    } finally {
      setLoading(false);
    }
  };

  // GitHub OAuth triggers
  const loginWithGitHub = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, githubProvider);
      
      // Attempt to extract GitHub Username from provider details
      const githubUsername = cred.user.photoURL?.includes("githubusercontent.com")
        ? cred.user.photoURL.split("/u/")[1]?.split("?")[0] || ""
        : "";

      await syncProfile(cred.user, { githubUsername });
    } finally {
      setLoading(false);
    }
  };

  // Logout trigger
  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setIsArchived(false);
      setArchiveEmail("");
      setArchiveUserId("");
      setArchiveDeletedAt(null);
      setArchiveRecoverableUntil(null);
    } finally {
      setLoading(false);
    }
  };

  // Reset password instructions
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Resend Verification Email
  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  // Verify if active email has been confirmed
  const checkEmailVerifiedStatus = async (): Promise<boolean> => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser(auth.currentUser);
      return auth.currentUser.emailVerified;
    }
    return false;
  };

  // Action: Restore previous account
  const restoreArchivedAccount = async () => {
    if (!archiveUserId || !archiveEmail) return;
    setLoading(true);
    try {
      const res = await restoreArchivedAccountAction(archiveUserId, archiveEmail);
      if (res.success) {
        setIsArchived(false);
        setArchiveEmail("");
        setArchiveUserId("");
        setArchiveDeletedAt(null);
        setArchiveRecoverableUntil(null);
        if (auth.currentUser) {
          await syncProfile(auth.currentUser);
        }
      } else {
        alert(res.error || "Failed to restore account");
      }
    } finally {
      setLoading(false);
    }
  };

  // Action: Permanently erase and start fresh
  const startFresh = async () => {
    if (!archiveEmail) return;
    setLoading(true);
    try {
      const res = await startFreshAction(archiveEmail);
      if (res.success) {
        setIsArchived(false);
        setArchiveEmail("");
        setArchiveUserId("");
        setArchiveDeletedAt(null);
        setArchiveRecoverableUntil(null);
        if (auth.currentUser) {
          await syncProfile(auth.currentUser);
        }
      } else {
        alert(res.error || "Failed to start fresh");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isArchived,
        archiveEmail,
        archiveUserId,
        archiveDeletedAt,
        archiveRecoverableUntil,
        login,
        signUp,
        loginWithGoogle,
        loginWithGitHub,
        logout,
        resetPassword,
        resendVerification,
        checkEmailVerifiedStatus,
        restoreArchivedAccount,
        startFresh,
        syncProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be consumed inside an AuthProvider");
  }
  return context;
}
