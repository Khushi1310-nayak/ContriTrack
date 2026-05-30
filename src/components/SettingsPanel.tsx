"use client";

import React, { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Shield, 
  Database, 
  Save, 
  RefreshCw, 
  Trash2, 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  Upload, 
  X,
  Sliders,
  Laptop
} from "lucide-react";
import { 
  fetchUserProfileAndSecurity,
  updateUserProfile,
  updateUserSecurity,
  fetchUserActivityLogs,
  triggerUserDataBackup,
  restoreUserDataBackup,
  fetchUserBackupSnapshots,
  revokeActiveSession,
  markAccountForDeletion,
  finalizeSecuritySettings,
  generateEmailOTP,
  verifyEmailOTP
} from "@/app/actions/settings-actions";
import { updateNotificationPreferences, fetchNotificationPreferences } from "@/app/actions/notification-actions";
import { useRouter } from "next/navigation";
import { deleteUser, updateProfile, updatePassword, RecaptchaVerifier, linkWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import SearchableDropdown from "@/components/SearchableDropdown";
import AvatarCropModal from "@/components/AvatarCropModal";

interface SettingsPanelProps {
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
    emailVerified?: boolean;
    providerData?: Array<{ providerId: string }>;
  } | null;
  onProfileUpdate?: () => void;
}

interface ActivityLog {
  id: string;
  userId: string;
  activityType: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  location: string | null;
  createdAt: Date | string;
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  current?: boolean;
}

interface BackupSnapshot {
  id: string;
  userId: string;
  backupDataUrl: string;
  backupType: string;
  createdAt: Date | string;
  expiresAt: Date | string;
}

export default function SettingsPanel({ user, onProfileUpdate }: SettingsPanelProps) {
  const { syncProfile } = useAuth();
  const router = useRouter();
  const userId = user?.uid || "";
  const authProvider = user?.providerData?.[0]?.providerId || "password";

  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "security" | "sessions" | "notifications" | "backups">("profile");

  // State values
  const [loading, setLoading] = useState(true);
  const [autosaveState, setAutosaveState] = useState<"saved" | "saving" | "error">("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Profile forms
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userType, setUserType] = useState("Student");
  const [roleInContriTrack, setRoleInContriTrack] = useState("Student");
  const [githubUsername, setGithubUsername] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Security variables
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  
  // Password change form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passStrength, setPassStrength] = useState({ score: 0, label: "Weak" });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMethod, setOtpMethod] = useState<"sms" | "email" | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [otpTimer, setOtpTimer] = useState(0);

  // Sessions list
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  // Backups and recovery list
  const [backupsList, setBackupsList] = useState<BackupSnapshot[]>([]);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Notification Preferences
  const [prefBrowser, setPrefBrowser] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefMeeting, setPrefMeeting] = useState(true);
  const [prefTask, setPrefTask] = useState(true);
  const [prefMentions, setPrefMentions] = useState(true);

  // Modals trigger
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState<string | null>(null);

  // File drag state
  const [isDragOver, setIsDragOver] = useState(false);

  // Avatar crop modal state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch live user credentials from Supabase via server actions
  const fetchAllSettings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetchUserProfileAndSecurity(userId);
      if (res.success && res.profile) {
        setFullName(res.profile.fullName || "");
        setDisplayName(res.profile.displayName || "");
        setBio(res.profile.bio || "");
        setUniversity(res.profile.university || "");
        setDegree(res.profile.degree || "");
        setPhoneNumber(res.profile.phoneNumber || "");
        setUserType(res.profile.userType || "Student");
        setRoleInContriTrack(res.profile.roleInContriTrack || "Student");
        setGithubUsername(res.profile.githubUsername || "");
        setLinkedinUrl(res.profile.linkedinUrl || "");
        setAvatarUrl(res.profile.avatarUrl || user?.photoURL || "");
        
        if (res.security) {
          setTwoFactorEnabled(res.security.twoFactorEnabled);
          setRecoveryEmail(res.security.recoveryEmail || "");
          setVerifiedPhone(res.security.verifiedPhone || "");
          setPasswordChangedAt(res.security.passwordChangedAt ? new Date(res.security.passwordChangedAt).toLocaleDateString() : "Never");
          
          if (res.security.activeSessions) {
            setActiveSessions(JSON.parse(res.security.activeSessions));
          }
        }
      }

      // Fetch auditing logs
      const logsRes = await fetchUserActivityLogs(userId);
      if (logsRes.success && logsRes.logs) {
        setActivityLogs(logsRes.logs as ActivityLog[]);
      }

      // Fetch backup history
      const backupsRes = await fetchUserBackupSnapshots(userId);
      if (backupsRes.success && backupsRes.backups) {
        setBackupsList(backupsRes.backups as BackupSnapshot[]);
      }

      // Fetch notification settings
      const prefRes = await fetchNotificationPreferences(userId);
      if (prefRes.success && prefRes.preferences) {
        setPrefBrowser(prefRes.preferences.browserEnabled);
        setPrefEmail(prefRes.preferences.emailEnabled);
        setPrefMeeting(prefRes.preferences.meetingAlerts);
        setPrefTask(prefRes.preferences.taskAlerts);
        setPrefMentions(prefRes.preferences.teammateMentions);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to gather server parameters.");
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    if (userId) {
      startTransition(() => {
        void fetchAllSettings();
      });
    }
  }, [userId, fetchAllSettings]);

  // Cooldown timers for OTP
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Strength checker logic
  const checkPasswordStrength = (pass: string) => {
    setNewPassword(pass);
    if (!pass) {
      setPassStrength({ score: 0, label: "Empty" });
      return;
    }
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    let label = "Weak";
    if (score >= 4) label = "Strong";
    else if (score >= 3) label = "Moderate";

    setPassStrength({ score, label });
  };

  // 2. Profile update handlers (with autosave indicators)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      setErrorMessage("Full Name is required.");
      return;
    }
    setAutosaveState("saving");
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateUserProfile(userId, {
      fullName,
      displayName,
      bio,
      university,
      degree,
      phoneNumber,
      userType,
      roleInContriTrack,
      githubUsername,
      linkedinUrl,
      avatarUrl
    });

    if (res.success) {
      // Sync with Firebase Auth & Firestore
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await updateProfile(currentUser, { displayName: displayName || fullName });
          await syncProfile(currentUser, {
            fullName,
            displayName,
            university,
            githubUsername
          });
        } catch (syncErr) {
          console.error("Failed to sync Firebase details:", syncErr);
        }
      }

      setAutosaveState("saved");
      setSuccessMessage("Workspace Profile synchronized successfully!");
      if (onProfileUpdate) {
        onProfileUpdate();
      }
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setAutosaveState("error");
      setErrorMessage(res.error || "Save error occurred.");
    }
  };

  // Supported avatar formats and max size
  const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const AVATAR_FORMATS = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

  const validateAndOpenCrop = (file: File) => {
    if (!AVATAR_FORMATS.includes(file.type)) {
      setErrorMessage("Unsupported format. Use PNG, JPG, or WebP.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    if (file.size > AVATAR_MAX_SIZE) {
      setErrorMessage("Image too large. Maximum size is 2MB.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCropImageSrc(event.target?.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop file uploads
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndOpenCrop(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndOpenCrop(file);
    // Reset input so re-selecting the same file triggers change
    if (e.target) e.target.value = "";
  };

  // Callback from crop modal
  const handleCropSave = async (croppedBase64: string) => {
    setShowCropModal(false);
    setCropImageSrc(null);
    setAvatarUrl(croppedBase64);
    setIsAvatarUploading(true);

    // Auto-save the avatar immediately after cropping
    try {
      const res = await updateUserProfile(userId, {
        fullName, displayName, bio, university, degree,
        phoneNumber, userType, roleInContriTrack,
        githubUsername, linkedinUrl,
        avatarUrl: croppedBase64
      });

      if (res.success) {
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            await syncProfile(currentUser, { fullName, displayName, university, githubUsername });
          } catch (syncErr) {
            console.error("Avatar sync error:", syncErr);
          }
        }
        setSuccessMessage("Identity avatar synchronized successfully.");
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error("Avatar save error:", err);
      setErrorMessage("Failed to save avatar. Please try again.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  // 3. Security Settings Handler
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (twoFactorEnabled && !verifiedPhone) {
      setErrorMessage("You must have a verified phone number to enable Two-Factor Authentication.");
      setTwoFactorEnabled(false);
      return;
    }

    setAutosaveState("saving");
    setErrorMessage(null);

    const res = await updateUserSecurity(userId, {
      twoFactorEnabled,
      recoveryEmail,
      verifiedPhone
    });

    if (res.success) {
      setAutosaveState("saved");
      setSuccessMessage("Security updates applied successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setAutosaveState("error");
      setErrorMessage(res.error || "Failed to update security registry.");
    }
  };

  // Setup Recaptcha
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible'
      });
    }
  };

  // Trigger SMS OTP using Firebase Phone Auth
  const handleSendPhoneOTP = async () => {
    const phoneToVerify = verifiedPhone || phoneNumber;
    if (!phoneToVerify) {
      setErrorMessage("Please supply a valid mobile registry number first.");
      return;
    }
    
    setAutosaveState("saving");
    
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      
      let formattedPhone = phoneToVerify.trim();
      if (!formattedPhone.startsWith("+")) {
         formattedPhone = "+" + formattedPhone; 
      }
      
      const confirmation = await linkWithPhoneNumber(auth.currentUser!, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      
      setOtpMethod("sms");
      setOtpSent(true);
      setOtpTimer(60);
      setSuccessMessage("OTP Token sent to verified handset via Firebase.");
      setAutosaveState("saved");
    } catch (error: any) {
      console.error("Firebase Phone Auth error:", error);
      setErrorMessage(error.message || "Failed to send OTP via SMS.");
      setAutosaveState("error");
    }
  };

  const handleSendEmailOTP = async () => {
    const userEmail = user?.email || "";
    if (!userEmail) {
      setErrorMessage("No verified email address found.");
      return;
    }
    
    setAutosaveState("saving");
    const res = await generateEmailOTP(userEmail);
    
    if (res.success) {
      setOtpMethod("email");
      setOtpSent(true);
      setOtpTimer(60);
      setSuccessMessage("OTP Token sent to your verified email address.");
      setAutosaveState("saved");
    } else {
      setErrorMessage(res.error || "Failed to send OTP via email.");
      setAutosaveState("error");
    }
  };

  const handleVerifyOTPAndChangePassword = async () => {
    if (!otpCode) {
      setErrorMessage("Please enter the OTP code.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (passStrength.score < 3) {
      setErrorMessage("Please formulate a stronger security token.");
      return;
    }

    if (!otpMethod) {
      setErrorMessage("No active OTP session.");
      return;
    }
    
    if (otpMethod === "sms" && !confirmationResult) {
      setErrorMessage("No active SMS OTP session. Please resend the code.");
      return;
    }

    setAutosaveState("saving");

    try {
      // 1. Confirm OTP
      if (otpMethod === "sms") {
        await confirmationResult!.confirm(otpCode);
      } else {
        const userEmail = user?.email || "";
        const verifyRes = await verifyEmailOTP(userEmail, otpCode);
        if (!verifyRes.success) {
          throw new Error(verifyRes.error || "Invalid Email OTP code.");
        }
      }
      
      // 2. Change password in Firebase
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updatePassword(currentUser, newPassword);
      } else {
        throw new Error("No authenticated session found in Firebase.");
      }
      
      // 3. Finalize security settings in Postgres
      const phoneToVerify = verifiedPhone || phoneNumber;
      const res = await finalizeSecuritySettings(userId, phoneToVerify);
      
      if (res.success) {
        setSuccessMessage("Password updated and handset verified successfully.");
        setAutosaveState("saved");
        setNewPassword("");
        setConfirmPassword("");
        setOtpCode("");
        setOtpSent(false);
        setOtpMethod(null);
        setConfirmationResult(null);
      } else {
        throw new Error(res.error || "Failed to update Postgres database.");
      }
      
    } catch (err: any) {
      console.error("Firebase Verification error:", err);
      if (err.code === "auth/requires-recent-login") {
        setErrorMessage("Please sign out and sign in again before changing password.");
      } else {
        setErrorMessage(err.message || "Invalid OTP or failed to verify.");
      }
      setAutosaveState("error");
    }
  };

  // 4. Session Revokes
  const handleRevokeSession = async (sessId: string) => {
    setErrorMessage(null);
    const res = await revokeActiveSession(userId, sessId);
    if (res.success) {
      setActiveSessions((prev) => prev.filter((s) => s.id !== sessId));
      setSuccessMessage("Selected remote session terminated.");
    } else {
      setErrorMessage("Revocation denied.");
    }
  };

  // 5. Backups & Snapshots
  const handleCreateBackup = async () => {
    setBackingUp(true);
    setErrorMessage(null);
    const res = await triggerUserDataBackup(userId);
    setBackingUp(false);
    if (res.success && res.backup) {
      setBackupsList((prev) => [res.backup, ...prev]);
      setSuccessMessage("Encrypted repository telemetry backup compiled!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || "Backup failed.");
    }
  };

  const handleRestoreBackup = async () => {
    if (!showRestoreModal) return;
    setRestoring(true);
    const res = await restoreUserDataBackup(userId, showRestoreModal);
    setRestoring(false);
    setShowRestoreModal(null);
    if (res.success) {
      setSuccessMessage("Prisma telemetry workspace rebuilt successfully!");
      fetchAllSettings();
    } else {
      setErrorMessage(res.error || "Restoration denied.");
    }
  };
  // 6. Notification Settings Autosave
  const handleTogglePreference = async (type: string, currentVal: boolean) => {
    const nextVal = !currentVal;

    // If enabling browser push notifications, check browser permissions first
    if (type === "browser" && nextVal) {
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setErrorMessage("Browser notification permission denied. Please allow notifications in your browser settings to enable push alerts.");
            setTimeout(() => setErrorMessage(null), 6000);
            return;
          }
        } catch (err) {
          console.error("Failed to request permission:", err);
          setErrorMessage("Failed to request notification permission: " + String(err));
          setTimeout(() => setErrorMessage(null), 6000);
          return;
        }
      } else {
        setErrorMessage("Browser push notifications are not supported on this browser/device.");
        setTimeout(() => setErrorMessage(null), 6000);
        return;
      }
    }
    
    // Optimistic Update
    if (type === "browser") setPrefBrowser(nextVal);
    if (type === "email") setPrefEmail(nextVal);
    if (type === "meeting") setPrefMeeting(nextVal);
    if (type === "task") setPrefTask(nextVal);
    if (type === "mentions") setPrefMentions(nextVal);

    setAutosaveState("saving");
    const res = await updateNotificationPreferences(userId, {
      browserEnabled: type === "browser" ? nextVal : prefBrowser,
      emailEnabled: type === "email" ? nextVal : prefEmail,
      meetingAlerts: type === "meeting" ? nextVal : prefMeeting,
      taskAlerts: type === "task" ? nextVal : prefTask,
      teammateMentions: type === "mentions" ? nextVal : prefMentions
    });

    if (res.success) {
      setAutosaveState("saved");
      setSuccessMessage("Notification preferences synchronized successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setAutosaveState("error");
      setErrorMessage(res.error || "Failed to synchronize preferences.");
      setTimeout(() => setSuccessMessage(null), 5000);
      // Revert state
      if (type === "browser") setPrefBrowser(currentVal);
      if (type === "email") setPrefEmail(currentVal);
      if (type === "meeting") setPrefMeeting(currentVal);
      if (type === "task") setPrefTask(currentVal);
      if (type === "mentions") setPrefMentions(currentVal);
    }
  };
  // 7. Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      alert("Please type 'DELETE' to confirm deletion.");
      return;
    }
    setIsDeletingAccount(true);
    try {
      const res = await markAccountForDeletion(userId, user?.email || "", fullName || "User");
      if (!res.success) {
        throw new Error(res.error || "Supabase cascade deactivation failed.");
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await deleteUser(currentUser);
        } catch (authErr: unknown) {
          console.warn("Direct Firebase deleteUser failed or requires re-authentication, fallback to signout:", authErr);
          await auth.signOut();
        }
      }

      setShowDeleteModal(false);
      alert("Your account and all associated telemetry have been wiped successfully.");
      router.push("/");
    } catch (e: unknown) {
      const err = e as Error;
      setErrorMessage(err.message || "Failed to fully delete your account.");
      setIsDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 items-center justify-center min-h-[300px]">
        <RefreshCw size={24} className="animate-spin text-[#F2C1A3]" />
        <span className="text-[#857C91] text-xs font-mono uppercase tracking-wider">Synchronizing secure assets...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 text-left max-w-5xl">
      {/* Top Title Bar */}
      <div id="recaptcha-container"></div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-[#F2C1A3] font-mono">AAA System Security</span>
          <h2 className="text-2xl md:text-3xl font-normal text-white font-serif tracking-tight">Identity & Vault Center</h2>
        </div>

        {/* Global Autosave indicator status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/5 self-start">
          <div className={`w-1.5 h-1.5 rounded-full ${
            autosaveState === "saved" ? "bg-emerald-400" : autosaveState === "saving" ? "bg-[#F2C1A3] animate-pulse" : "bg-red-400"
          }`} />
          <span className="text-[10px] text-[#857C91] uppercase font-mono">
            {autosaveState === "saved" && "Synchronized"}
            {autosaveState === "saving" && "Saving Changes..."}
            {autosaveState === "error" && "Sync Failed"}
          </span>
        </div>
      </div>
      {/* Primary Alerts */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 text-red-200 text-xs flex items-center gap-2"
          >
            <AlertTriangle size={14} className="text-red-400" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0 }}
            className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-200 text-xs flex items-center gap-2"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 border-b md:border-b-0 border-white/5">
          <button 
            onClick={() => setActiveSubTab("profile")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider transition ${
              activeSubTab === "profile" 
                ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]" 
                : "bg-transparent border border-transparent text-[#857C91] hover:text-white"
            }`}
          >
            <User size={14} />
            <span>Profile settings</span>
          </button>
          
          <button 
            onClick={() => setActiveSubTab("security")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider transition ${
              activeSubTab === "security" 
                ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]" 
                : "bg-transparent border border-transparent text-[#857C91] hover:text-white"
            }`}
          >
            <Shield size={14} />
            <span>Security keys</span>
          </button>

          <button 
            onClick={() => setActiveSubTab("sessions")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider transition ${
              activeSubTab === "sessions" 
                ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]" 
                : "bg-transparent border border-transparent text-[#857C91] hover:text-white"
            }`}
          >
            <Laptop size={14} />
            <span>Device Sessions</span>
          </button>

          <button 
            onClick={() => setActiveSubTab("notifications")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider transition ${
              activeSubTab === "notifications" 
                ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]" 
                : "bg-transparent border border-transparent text-[#857C91] hover:text-white"
            }`}
          >
            <Sliders size={14} />
            <span>Alert Controls</span>
          </button>

          <button 
            onClick={() => setActiveSubTab("backups")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider transition ${
              activeSubTab === "backups" 
                ? "bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3]" 
                : "bg-transparent border border-transparent text-[#857C91] hover:text-white"
            }`}
          >
            <Database size={14} />
            <span>Vault backups</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            
            {/* SUB-TAB 1: PROFILE MANAGEMENT */}
            {activeSubTab === "profile" && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-6"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h4 className="text-white text-base font-serif font-light">Workspace Member Identity</h4>
                  <span className="text-[9px] uppercase font-mono text-[#857C91]">Linked via {authProvider}</span>
                </div>

                {/* Avatar Crop Modal */}
                {showCropModal && cropImageSrc && (
                  <AvatarCropModal
                    imageSrc={cropImageSrc}
                    onSave={handleCropSave}
                    onClose={() => { setShowCropModal(false); setCropImageSrc(null); }}
                  />
                )}

                {/* Hidden file input for clickable avatar */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 w-full">
                  {/* Avatar Upload Drop Zone */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div 
                      onClick={() => avatarInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleFileDrop}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 transition cursor-pointer group/avatar ${
                        isDragOver ? "border-[#F2C1A3] bg-[#F2C1A3]/10 shadow-[0_0_20px_rgba(242,193,163,0.15)]" : "border-white/10 bg-black/45 hover:border-[#F2C1A3]/40 hover:shadow-[0_0_16px_rgba(242,193,163,0.1)]"
                      }`}
                    >
                      {avatarUrl && !avatarUrl.includes("dicebear") ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={avatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a1b2e] to-[#0e0f17] flex items-center justify-center">
                          <span className="text-lg font-serif font-semibold text-[#F2C1A3]">
                            {fullName ? fullName.substring(0, 2).toUpperCase() : "US"}
                          </span>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-0.5">
                        <Upload size={14} className="text-[#F2C1A3]" />
                        <span className="text-[7px] font-mono text-white/70 uppercase tracking-wider">Upload</span>
                      </div>

                      {/* Uploading spinner overlay */}
                      {isAvatarUploading && (
                        <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-[#F2C1A3]/30 border-t-[#F2C1A3] rounded-full animate-spin" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-[10px] uppercase font-mono text-[#857C91]">Synchronize Avatar Assets</span>
                      <p className="text-[11px] text-[#CD9FA0] font-light">Click avatar or drag & drop. PNG, JPG, WebP. Max: 2MB.</p>
                      
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="px-4 py-2 mt-1 rounded-full bg-white/5 border border-white/10 text-white text-[10px] font-mono hover:bg-white/10 hover:border-[#F2C1A3]/30 transition cursor-pointer"
                      >
                        Browse Assets
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-name" className="text-[#857C91] text-[10px] uppercase font-mono">Full Name</label>
                      <input 
                        id="p-name"
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-display" className="text-[#857C91] text-[10px] uppercase font-mono">Display Name</label>
                      <input 
                        id="p-display"
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Visible identity across platform"
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-univ" className="text-[#857C91] text-[10px] uppercase font-mono">University Registry</label>
                      <input 
                        id="p-univ"
                        type="text" 
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="Enter university name"
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-degree" className="text-[#857C91] text-[10px] uppercase font-mono">Academic Degree</label>
                      <input 
                        id="p-degree"
                        type="text" 
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                        placeholder="e.g. BS in Computer Science"
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-phone" className="text-[#857C91] text-[10px] uppercase font-mono">Mobile Handset</label>
                      <input 
                        id="p-phone"
                        type="tel" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. +1234567890"
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-github" className="text-[#857C91] text-[10px] uppercase font-mono">GitHub Username</label>
                      <input 
                        id="p-github"
                        type="text" 
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="e.g. khushi-dev"
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SearchableDropdown
                      id="p-type"
                      label="Member Classification"
                      value={userType}
                      onChange={setUserType}
                      placeholder="Search classifications..."
                      options={[
                        "Student Contributor",
                        "Engineering Lead",
                        "Research Associate",
                        "Academic Professor",
                        "Open Source Maintainer",
                        "Technical Mentor",
                        "Startup Founder",
                        "Industry Collaborator"
                      ]}
                    />

                    <SearchableDropdown
                      id="p-role"
                      label="ContriTrack Role"
                      value={roleInContriTrack}
                      onChange={setRoleInContriTrack}
                      placeholder="Search roles..."
                      options={[
                        "Frontend Engineer",
                        "Backend Engineer",
                        "Full Stack Engineer",
                        "DevOps Engineer",
                        "Cloud Engineer",
                        "AI/ML Engineer",
                        "Data Engineer",
                        "Security Engineer",
                        "Mobile App Engineer",
                        "QA Automation Engineer",
                        "Research Lead",
                        "Technical Coordinator",
                        "Product Manager",
                        "Engineering Manager",
                        "Developer Advocate",
                        "Community Lead",
                        "Open Source Contributor",
                        "UI/UX Designer",
                        "Systems Architect",
                        "Technical Writer"
                      ]}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="p-bio" className="text-[#857C91] text-[10px] uppercase font-mono">Biography Signature</label>
                    <textarea 
                      id="p-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Write briefly about yourself..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition resize-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                      <label htmlFor="p-link" className="text-[#857C91] text-[10px] uppercase font-mono">LinkedIn Endpoint</label>
                      <input 
                        id="p-link"
                        type="url" 
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                        className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                      />
                    </div>

                  <button 
                    type="submit" 
                    disabled={autosaveState === "saving"}
                    className="self-start mt-2 px-6 py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition shadow-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {autosaveState === "saving" ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Synchronizing Profile...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Synchronize Identity Profile</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* SUB-TAB 2: SECURITY KEYS & OTP CHANGERS */}
            {activeSubTab === "security" && (
              <motion.div 
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6"
              >
                {/* 2FA & Multi-factor setup */}
                <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-6 text-left">
                  <h4 className="text-white text-base font-serif font-light border-b border-white/5 pb-3">AAA Security Vault Settings</h4>
                  
                  <form onSubmit={handleSaveSecurity} className="flex flex-col gap-5 w-full">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-white">Two-Factor Authentication</span>
                        <p className="text-[10px] text-[#857C91]">Verify your handset identity before accessing secure workspace reports.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={twoFactorEnabled}
                          onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                          className="sr-only peer"
                          title="Toggle Two-Factor Authentication"
                        />
                        <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#12131e] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F2C1A3]" />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="s-rec" className="text-[#857C91] text-[10px] uppercase font-mono">Recovery Email Address</label>
                        <input 
                          id="s-rec"
                          type="email" 
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="backup@gmail.com"
                          className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="s-phone" className="text-[#857C91] text-[10px] uppercase font-mono">Handset for OTP alerts</label>
                        <input 
                          id="s-phone"
                          type="tel" 
                          value={verifiedPhone}
                          onChange={(e) => setVerifiedPhone(e.target.value)}
                          placeholder="+1 (555) 019-2834"
                          className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="self-start px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Apply Security Configurations
                    </button>
                  </form>
                </div>

                {/* Password reset and SMS OTP system */}
                <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-6 text-left">
                  <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                    <h4 className="text-white text-base font-serif font-light">Interactive Password Resetter</h4>
                    <p className="text-[10px] text-[#857C91]">Last modified: {passwordChangedAt}</p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <span className="text-[10px] uppercase font-mono text-[#857C91]">Step 1: Security Handset Verification</span>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button 
                          onClick={handleSendPhoneOTP}
                          disabled={otpTimer > 0}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-40"
                        >
                          {otpSent && otpMethod === "sms" ? `Resend SMS OTP (${otpTimer}s)` : "Send SMS verification OTP"}
                        </button>
                        <span className="text-[10px] text-[#857C91] font-mono">OR</span>
                        <button 
                          onClick={handleSendEmailOTP}
                          disabled={otpTimer > 0}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-40"
                        >
                          {otpSent && otpMethod === "email" ? `Resend Email OTP (${otpTimer}s)` : "Send Email OTP"}
                        </button>
                      </div>

                      {otpSent && (
                        <div className="flex flex-col gap-1.5 mt-2 animate-fadeIn">
                          <label htmlFor="otp-c" className="text-[#857C91] text-[9px] uppercase font-mono">
                            {otpMethod === "sms" ? "SMS Verification Code" : "Email Verification Code"}
                          </label>
                          <input 
                            id="otp-c"
                            type="text" 
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="Enter 6 digit OTP"
                            maxLength={6}
                            className="w-48 px-4 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono text-center text-white outline-none focus:border-[#F2C1A3] transition"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <span className="text-[10px] uppercase font-mono text-[#857C91]">Step 2: Security Credentials</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="s-n-pass" className="text-[#CD9FA0] text-[10px] uppercase font-mono">New Password</label>
                          <input 
                            id="s-n-pass"
                            type="password" 
                            value={newPassword}
                            onChange={(e) => checkPasswordStrength(e.target.value)}
                            placeholder="Min 8 chars, 1 Cap, 1 Symbol"
                            className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                          />
                          {/* strength meter */}
                          {newPassword && (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex justify-between text-[9px] font-mono uppercase">
                                <span className="text-[#857C91]">Strength:</span>
                                <span className={
                                  passStrength.score >= 4 ? "text-emerald-400" : passStrength.score >= 3 ? "text-[#F2C1A3]" : "text-red-400"
                                }>{passStrength.label}</span>
                              </div>
                              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={`h-full flex-1 transition ${
                                      i < passStrength.score 
                                        ? passStrength.score >= 4 
                                          ? "bg-emerald-400" 
                                          : passStrength.score >= 3 
                                            ? "bg-[#F2C1A3]" 
                                            : "bg-red-400"
                                        : "bg-transparent"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="s-c-pass" className="text-[#857C91] text-[10px] uppercase font-mono">Confirm Credentials</label>
                          <input 
                            id="s-c-pass"
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                            className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs font-light text-white outline-none focus:border-[#F2C1A3] transition"
                          />
                        </div>
                      </div>

                      <button 
                        type="button" 
                        onClick={handleVerifyOTPAndChangePassword}
                        className="self-start px-6 py-3 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition flex items-center gap-2 cursor-pointer mt-2"
                      >
                        <Key size={12} />
                        <span>Update Password Credentials</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Activities log */}
                <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-4 text-left">
                  <h4 className="text-white text-base font-serif font-light border-b border-white/5 pb-2">Active Security Audit Trails</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] font-mono text-[#857C91]">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="py-2 text-left text-white/50 uppercase font-mono text-[9px]">Event Type</th>
                          <th className="py-2 text-left text-white/50 uppercase font-mono text-[9px]">Device</th>
                          <th className="py-2 text-left text-white/50 uppercase font-mono text-[9px]">IP address</th>
                          <th className="py-2 text-left text-white/50 uppercase font-mono text-[9px]">Location</th>
                          <th className="py-2 text-left text-white/50 uppercase font-mono text-[9px]">Event Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.map((log) => (
                          <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                            <td className="py-2 text-[#CD9FA0]">{log.activityType}</td>
                            <td className="py-2">{log.device} ({log.browser})</td>
                            <td className="py-2">{log.ipAddress}</td>
                            <td className="py-2">{log.location}</td>
                            <td className="py-2">{new Date(log.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 3: DEVICE & SESSION MANAGEMENT */}
            {activeSubTab === "sessions" && (
              <motion.div 
                key="sessions"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-6 text-left"
              >
                <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                  <h4 className="text-white text-base font-serif font-light">Authorizing Active Sessions</h4>
                  <p className="text-[10px] text-[#857C91]">Manage and terminate active sessions on other browser targets.</p>
                </div>

                <div className="flex flex-col gap-4">
                  {activeSessions.map((sess) => (
                    <div 
                      key={sess.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <Laptop size={16} className="text-[#F2C1A3]" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white font-medium">{sess.device} (Chrome Browser)</span>
                            {sess.current && (
                              <span className="px-2 py-0.5 rounded-full bg-[#F2C1A3]/10 border border-[#F2C1A3]/20 text-[#F2C1A3] text-[8px] font-mono uppercase">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#857C91]">{sess.ip} • Last seen {new Date(sess.lastActive).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {!sess.current && (
                        <button 
                          onClick={() => handleRevokeSession(sess.id)}
                          className="p-2 rounded-xl bg-red-950/20 hover:bg-red-900/30 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-wider transition cursor-pointer"
                          title="Revoke session"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 4: NOTIFICATION SETTINGS */}
            {activeSubTab === "notifications" && (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-6 text-left"
              >
                <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                  <h4 className="text-white text-base font-serif font-light">Interactive Notification Controls</h4>
                  <p className="text-[10px] text-[#857C91]">Control which collaboration metrics trigger push and database inbox alerts.</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-white">Browser Push Notifications</span>
                      <p className="text-[10px] text-[#857C91]">Receive real-time push alerts on active browser windows.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefBrowser}
                        onChange={() => handleTogglePreference("browser", prefBrowser)}
                        className="sr-only peer"
                        title="Toggle Browser Push Notifications"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#12131e] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F2C1A3]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-white">SMTP Email Reminders</span>
                      <p className="text-[10px] text-[#857C91]">Authorize email warnings for suspicious active logins.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefEmail}
                        onChange={() => handleTogglePreference("email", prefEmail)}
                        className="sr-only peer"
                        title="Toggle SMTP Email Reminders"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#12131e] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F2C1A3]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-white">Sprint & Task Board Alerts</span>
                      <p className="text-[10px] text-[#857C91]">Trigger alarms on the task panel when cards are assigned or marked review.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefTask}
                        onChange={() => handleTogglePreference("task", prefTask)}
                        className="sr-only peer"
                        title="Toggle Task Alerts"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#12131e] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F2C1A3]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-white">Interactive Meeting Reminders</span>
                      <p className="text-[10px] text-[#857C91]">Remind me 15 minutes before verified schedule dates.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefMeeting}
                        onChange={() => handleTogglePreference("meeting", prefMeeting)}
                        className="sr-only peer"
                        title="Toggle Meeting Reminders"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#12131e] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F2C1A3]" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-white">Teammate Inbox Mentions</span>
                      <p className="text-[10px] text-[#857C91]">Always receive visual notifications when mentioned in chat groups.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={prefMentions}
                        onChange={() => handleTogglePreference("mentions", prefMentions)}
                        className="sr-only peer"
                        title="Toggle Teammate Inbox Mentions"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#12131e] after:border-white/20 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#F2C1A3]" />
                    </label>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 5: VAULT BACKUP SYSTEM */}
            {activeSubTab === "backups" && (
              <motion.div 
                key="backups"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-6 text-left"
              >
                {/* Backups list */}
                <div className="p-6 rounded-3xl border border-white/5 bg-[#141523]/45 flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                    <div className="flex flex-col gap-1">
                      <h4 className="text-white text-base font-serif font-light">Encrypted Vault Snapshots</h4>
                      <p className="text-[10px] text-[#857C91]">Trigger snapshots containing full profiles, assignments, commits, and meetings.</p>
                    </div>
                    
                    <button 
                      onClick={handleCreateBackup}
                      disabled={backingUp}
                      className="px-5 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {backingUp ? <RefreshCw size={12} className="animate-spin" /> : <Database size={12} />}
                      <span>Backup My Data</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {backupsList.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white/[0.01] border border-white/5 text-center text-xs text-[#857C91]">
                        No archive snapshots available. Click the trigger above to compile a fresh data bundle.
                      </div>
                    ) : (
                      backupsList.map((snap) => (
                        <div 
                          key={snap.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                              <Database size={12} className="text-[#CD9FA0]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs text-white">Full Database Telemetry Backup</span>
                              <span className="text-[9px] font-mono text-[#857C91]">{new Date(snap.createdAt).toLocaleString()} • Expires {new Date(snap.expiresAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => setShowRestoreModal(snap.id)}
                            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-mono uppercase transition cursor-pointer"
                          >
                            Restore snapshot
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Account Deletion & Recovery Window */}
                <div className="p-6 rounded-3xl border border-red-500/20 bg-red-950/5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1 border-b border-red-500/10 pb-3">
                    <h4 className="text-red-400 text-base font-serif font-light flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Danger Zone
                    </h4>
                    <p className="text-[10px] text-[#CD9FA0]">These operations cannot be easily rolled back after the 30-day grace window expires.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-red-200">Initiate Account Deletion</span>
                      <p className="text-[10px] text-[#857C91]">Remove your identity and de-register from active Supabase workspaces.</p>
                    </div>

                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={12} />
                      <span>Delete Account</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ========================================================= */}
      {/* DIALOGS, MODALS, AND HELPER OVERLAYS                      */}
      {/* ========================================================= */}

      {/* 1. Recovery confirmation dialog */}
      <AnimatePresence>
        {showRestoreModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#141525] border border-white/10 shadow-2xl relative text-left flex flex-col gap-4"
            >
              <button 
                onClick={() => setShowRestoreModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close modal"
              >
                <X size={12} />
              </button>

              <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-[#F2C1A3]">
                <RefreshCw size={18} />
                <h4 className="text-white text-base font-serif font-light">Confirm Vault Restoration</h4>
              </div>

              <p className="text-xs text-[#857C91] font-light leading-relaxed">
                You are about to restore a full database backup snapshot. This will reconstruct your active workspace profile registry settings back to the exact saved state.
              </p>

              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setShowRestoreModal(null)}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRestoreBackup}
                  disabled={restoring}
                  className="px-5 py-2.5 rounded-full bg-[#F2C1A3] hover:bg-[#F8CCAA] text-[#12131e] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  {restoring && <RefreshCw size={10} className="animate-spin" />}
                  <span>Restore Telemetry</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Deletion Confirmation dialog */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md p-6 rounded-3xl bg-[#141525] border border-red-500/20 shadow-2xl relative text-left flex flex-col gap-4"
            >
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/5 text-[#857C91] hover:text-white transition cursor-pointer"
                title="Close modal"
              >
                <X size={12} />
              </button>

              <div className="flex items-center gap-3 border-b border-red-500/10 pb-2 text-red-400">
                <AlertTriangle size={18} />
                <h4 className="text-white text-base font-serif font-light">Deactivate and Archive Account?</h4>
              </div>

              <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 text-[11px] text-red-200 leading-relaxed flex flex-col gap-2">
                <p><strong>This action triggers the secure account deactivation sequence:</strong></p>
                <ul className="list-disc pl-4 flex flex-col gap-1">
                  <li>Your active profile records inside Supabase are archived.</li>
                  <li>Your credentials will be placed in a private 30-day grace recovery chamber.</li>
                  <li>If you do not recover this archive within 30 days, your telemetry and records will be permanently purged.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <label className="text-[9px] text-[#CD9FA0] font-mono uppercase tracking-wider font-semibold">
                  Verify authority by typing <span className="text-red-400 font-bold">DELETE</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE to authorize cascade wipe"
                  className="w-full px-4 py-2.5 rounded-xl border border-red-500/25 focus:border-red-500 bg-red-500/5 text-white text-xs font-mono placeholder-red-300/30 focus:outline-none transition"
                  disabled={isDeletingAccount}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2 border-t border-white/5 pt-4">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  Keep Active
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || isDeletingAccount}
                  className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeletingAccount ? (
                    <RefreshCw size={12} className="animate-spin text-white" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                  <span>{isDeletingAccount ? "Purging..." : "Confirm Purge"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
