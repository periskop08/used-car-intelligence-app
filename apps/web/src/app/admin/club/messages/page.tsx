'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/utils/apiConfig';
import { AdminUserDrawer } from '../../components/AdminUserDrawer';
import { MessageSquare, Send, User, CheckCircle2, Search } from 'lucide-react';

export default function AdminClubMessagesPage() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('selected');

  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState<string | null>(null);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkContent, setBulkContent] = useState('');
  const [sendingBulk, setSendingBulk] = useState(false);

  // Single Direct Message State
  const [activeConversationUser, setActiveConversationUser] = useState<any | null>(null);
  const [directMessageText, setDirectMessageText] = useState('');
  const [sendingDirect, setSendingDirect] = useState(false);

  const fetchData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setLoading(true);
    try {
      const [convRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/club/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${API_BASE_URL}/admin/club/users?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : { users: [] })),
      ]);

      setConversations(Array.isArray(convRes) ? convRes : []);
      setUsers(usersRes.users || []);

      if (preselected) {
        const ids = preselected.split(',').filter(Boolean);
        setSelectedUserIds(new Set(ids));
        setShowBulkModal(true);
      }
    } catch (e) {
      console.error('Fetch messaging data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendDirectMessage = async () => {
    if (!activeConversationUser || !directMessageText.trim()) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setSendingDirect(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/users/${activeConversationUser.id}/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: directMessageText.trim(),
          sendNotification: true,
        }),
      });

      if (res.ok) {
        setDirectMessageText('');
        fetchData();
      } else {
        alert('Mesaj gönderilemedi.');
      }
    } catch (e) {
      alert('Hata oluştu.');
    } finally {
      setSendingDirect(false);
    }
  };

  const handleSendBulkMessage = async () => {
    if (selectedUserIds.size === 0 || !bulkContent.trim()) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    setSendingBulk(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/club/messages/bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: Array.from(selectedUserIds),
          content: bulkContent.trim(),
          sendNotification: true,
        }),
      });

      if (res.ok) {
        setShowBulkModal(false);
        setBulkContent('');
        setSelectedUserIds(new Set());
        fetchData();
      } else {
        alert('Toplu mesaj gönderilemedi.');
      }
    } catch (e) {
      alert('Hata oluştu.');
    } finally {
      setSendingBulk(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            Tork Scout Club — Mesajlaşma Operasyon Merkezi
          </h1>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Club üyeleri ile 1-to-1 direkt bildirim ve mesajlaşma iletişimi.
          </p>
        </div>

        {selectedUserIds.size > 0 && (
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" /> Toplu Mesaj Gönder ({selectedUserIds.size} Seçili)
          </button>
        )}
      </div>

      {/* Main Messaging Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/60 rounded-2xl border border-white/10 overflow-hidden min-h-[500px]">
        {/* Left / Conversation List */}
        <div className="lg:col-span-4 border-r border-white/10 flex flex-col bg-slate-950/40">
          <div className="p-3 border-b border-white/10 font-bold text-slate-300 text-xs font-sans flex items-center justify-between">
            <span>Yönetici Konuşmaları & Üyeler</span>
            <span className="text-[10px] text-slate-500 font-mono">{users.length} Üye</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="p-6 text-center text-slate-400">Yükleniyor...</div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">Kullanıcı bulunamadı.</div>
            ) : (
              users.map((u) => {
                const isSelected = activeConversationUser?.id === u.id;

                return (
                  <div
                    key={u.id}
                    onClick={() => setActiveConversationUser(u)}
                    className={`p-3 transition cursor-pointer flex items-center justify-between ${
                      isSelected ? 'bg-orange-500/10 border-l-2 border-orange-500' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-white font-sans text-xs block">{u.displayName}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{u.email || u.customerNo}</span>
                    </div>
                    {u.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        {u.badge.label}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right / Direct Message Thread */}
        <div className="lg:col-span-8 flex flex-col p-6 space-y-4">
          {activeConversationUser ? (
            <>
              <div className="p-4 bg-slate-950 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white font-sans text-sm">
                    {activeConversationUser.displayName} ile İletişim
                  </h3>
                  <p className="text-slate-400 text-xs">{activeConversationUser.email || activeConversationUser.customerNo}</p>
                </div>

                <button
                  onClick={() => setSelectedUserForDrawer(activeConversationUser.id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-orange-400 border border-white/10 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" /> Kullanıcıyı Gör
                </button>
              </div>

              <div className="flex-1 bg-slate-950/80 rounded-xl border border-white/10 p-4 space-y-3 font-sans text-xs overflow-y-auto">
                <div className="text-center text-slate-500 text-[11px]">
                  Bu kullanıcıya gönderilecek mesajlar kullanıcının bildirim ve iletişim merkezine iletilir.
                </div>
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <textarea
                  value={directMessageText}
                  onChange={(e) => setDirectMessageText(e.target.value)}
                  placeholder="Mesajınızı buraya yazın..."
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 font-sans h-20"
                />
                <button
                  onClick={handleSendDirectMessage}
                  disabled={sendingDirect || !directMessageText.trim()}
                  className="px-5 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Gönder
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <p className="text-xs font-sans">İletişim kurmak istediğiniz Club üyesini soldaki listeden seçin.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Message Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/10 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm font-sans">
              Toplu Mesaj Gönder ({selectedUserIds.size} Kullanıcı)
            </h3>
            <textarea
              value={bulkContent}
              onChange={(e) => setBulkContent(e.target.value)}
              placeholder="Seçili tüm üyelere gönderilecek duyuru veya bilgi mesajı..."
              className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 h-32 font-sans"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs"
              >
                İptal
              </button>
              <button
                onClick={handleSendBulkMessage}
                disabled={sendingBulk || !bulkContent.trim()}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-slate-950 font-black rounded-xl text-xs disabled:opacity-50"
              >
                Gönder & Bildirim Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Drawer */}
      {selectedUserForDrawer && (
        <AdminUserDrawer
          userId={selectedUserForDrawer}
          isOpen={!!selectedUserForDrawer}
          onClose={() => setSelectedUserForDrawer(null)}
        />
      )}
    </div>
  );
}
