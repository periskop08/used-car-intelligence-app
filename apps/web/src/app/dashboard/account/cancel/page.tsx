"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function CancelAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm1, setConfirm1] = useState(false);
  const [confirm2, setConfirm2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm1 || !confirm2 || !password || loading) return;

    if (!confirm("Hesabınızı kalıcı olarak kapatmak istediğinize emin misiniz? Bu işlem geri alınamaz.")) return;

    setLoading(true);
    setError("");

    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/users/me/cancel-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Hesap kapatılamadı.");
        }
        return data;
      })
      .then(() => {
        // Clear auth and redirect
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
        router.push("/login?error=cancelled");
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const isFormInvalid = !confirm1 || !confirm2 || !password;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-red-500">Hesap İptali</h1>
        <p className="text-slate-400 text-xs">TorqueScout hesabınızı kalıcı olarak kapatın.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl">
          {error}
        </div>
      )}

      <div className="glass border border-red-500/10 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md p-6 space-y-6">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 text-xs text-red-400 space-y-2">
          <h3 className="font-black uppercase tracking-wider text-[10px]">⚠️ ÖNEMLİ UYARI</h3>
          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold">
            <li>Aktif tüm ilanlarınız anında yayından kaldırılacak ve deaktif edilecektir.</li>
            <li>Favori listeleriniz, arama filtreleriniz ve kullanıcı verileriniz temizlenecektir.</li>
            <li>Finansal/fatura geçmişi yasal saklama yükümlülüğü nedeniyle korunacak, ancak kişisel bilgileriniz KVKK kurallarına göre anonimleştirilecektir.</li>
            <li>Bu işlem kesinlikle geri alınamaz.</li>
          </ul>
        </div>

        <form onSubmit={handleCancel} className="space-y-6">
          {/* Confirmations */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={confirm1}
                onChange={(e) => setConfirm1(e.target.checked)}
                className="accent-red-500 mt-0.5"
              />
              <span>Aktif ilanlarımın yayından kaldırılacağını ve hesabımın kapatılacağını biliyorum.</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none text-xs font-bold text-slate-300">
              <input
                type="checkbox"
                checked={confirm2}
                onChange={(e) => setConfirm2(e.target.checked)}
                className="accent-red-500 mt-0.5"
              />
              <span>Bu işlemin geri alınamaz olduğunu onaylıyorum.</span>
            </label>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 border-t border-white/5 pt-6">
            <label className="text-xs font-bold text-slate-400">Şifre Doğrulama</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifreniz"
              className="w-full md:w-80 bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-red-500 focus:outline-none transition"
            />
          </div>

          {/* Submit */}
          <div className="border-t border-white/5 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isFormInvalid || loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl text-xs font-bold cursor-pointer transition shadow-lg shadow-red-500/10"
            >
              {loading ? "Hesap Kapatılıyor..." : "Hesabımı Kalıcı Olarak Kapat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
