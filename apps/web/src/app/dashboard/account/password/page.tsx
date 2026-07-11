"use client";

import React, { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Yeni şifreler eşleşmiyor." });
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Şifre güncellenemedi.");
        }
        return data;
      })
      .then(() => {
        setMessage({ type: "success", text: "Şifreniz başarıyla değiştirildi!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSaving(false);
      })
      .catch((err) => {
        setMessage({ type: "error", text: err.message });
        setSaving(false);
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Şifre Değiştir</h1>
        <p className="text-slate-400 text-xs">Hesabınızın şifresini güncelleyin.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold ${
          message.type === "success" 
            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Mevcut Şifre</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
            />
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-orange-500/10"
          >
            {saving ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>
        </div>
      </form>
    </div>
  );
}
