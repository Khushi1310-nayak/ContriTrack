"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ShieldAlert, Trash2, Loader2 } from "lucide-react";
import { getAllUsersForAdmin, deleteUserAccountAdmin } from "@/app/actions/admin-actions";

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  githubUsername?: string | null;
  createdAt: Date | string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await getAllUsersForAdmin();
    if (res.success && res.users) {
      setUsers(res.users);
    } else {
      console.error(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    void getAllUsersForAdmin().then((res) => {
      if (!isMounted) return;
      if (res.success && res.users) {
        setUsers(res.users);
      }
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) {
      return;
    }

    setDeletingId(userId);
    const res = await deleteUserAccountAdmin(userId);
    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      alert("Failed to delete user: " + res.error);
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-[#0E0F17] text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-[#F8CCAA]">Admin Area</h1>
              <p className="text-sm text-[#857C91]">Manage System Users & Accounts</p>
            </div>
          </div>
          <button onClick={fetchUsers} className="text-sm text-[#CD9FA0] hover:text-white transition">
            Refresh List
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#CD9FA0]" />
          </div>
        ) : (
          <div className="bg-[#161725]/50 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs tracking-wider uppercase text-[#857C91] bg-white/5">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Joined</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[#857C91]">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition">
                      <td className="p-4">
                        <p className="font-medium text-[#F8CCAA]">{user.fullName}</p>
                        <p className="text-xs text-[#857C91]">{user.githubUsername || "No GitHub"}</p>
                      </td>
                      <td className="p-4 text-sm text-[#CD9FA0]">{user.email}</td>
                      <td className="p-4 text-sm text-[#857C91]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-all disabled:opacity-50"
                        >
                          {deletingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
