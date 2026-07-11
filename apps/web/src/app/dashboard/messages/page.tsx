"use client";

import React, { useEffect, useState, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface UserProfile {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  displayNamePreference: string;
}

interface Conversation {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  listing: {
    id: string;
    title: string;
    priceAmount: number;
    city: string;
  };
  buyer: UserProfile;
  seller: UserProfile;
  messages: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    readAt: string | null;
  }[];
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = (selectId?: string) => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    fetch(`${API_URL}/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Sohbetler yüklenemedi.");
        return res.json();
      })
      .then((data) => {
        setConversations(data);
        setLoading(false);
        if (selectId) {
          const updated = data.find((c: Conversation) => c.id === selectId);
          if (updated) setSelectedConversation(updated);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      // Decode user ID if we have it or fetch profile
      const token = localStorage.getItem("accessToken");
      fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setCurrentUser(data))
        .catch(() => setCurrentUser(JSON.parse(userStr)));
    }
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      const token = localStorage.getItem("accessToken");
      fetch(`${API_URL}/conversations/${selectedConversation.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setMessages(data.messages);
          // Mark as read locally in sidebar conversations list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === selectedConversation.id
                ? { ...c, messages: c.messages.map((m) => ({ ...m, readAt: new Date().toISOString() })) }
                : c
            )
          );
        });
    } else {
      setMessages([]);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedConversation || sending) return;

    setSending(true);
    const token = localStorage.getItem("accessToken");
    fetch(`${API_URL}/conversations/${selectedConversation.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ body: newMessageText.trim() }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Mesaj gönderilemedi.");
        return res.json();
      })
      .then((newMsg) => {
        setMessages((prev) => [...prev, newMsg]);
        setNewMessageText("");
        setSending(false);
        // Refresh conversations list to update previews
        fetchConversations(selectedConversation.id);
      })
      .catch((err) => {
        alert(err.message);
        setSending(false);
      });
  };

  const getOtherUser = (conv: Conversation) => {
    if (!currentUser) return null;
    return conv.buyerId === currentUser.id ? conv.seller : conv.buyer;
  };

  const formatUserName = (u: UserProfile | null) => {
    if (!u) return "Kullanıcı";
    if (u.displayNamePreference === "USERNAME" && u.username) return `@${u.username}`;
    if (u.displayNamePreference === "SHORT_NAME" && u.firstName) {
      return `${u.firstName} ${u.lastName ? u.lastName[0] + "." : ""}`.trim();
    }
    if (u.firstName || u.lastName) {
      return `${u.firstName || ""} ${u.lastName || ""}`.trim();
    }
    return u.email.split("@")[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Mesajlarım</h1>
        <p className="text-slate-400 text-xs">Alıcı ve satıcılarla olan mesajlaşmalarınızı yönetin.</p>
      </div>

      <div className="glass border border-white/5 rounded-3xl bg-[#090d1a]/45 backdrop-blur-md overflow-hidden flex h-[600px]">
        {/* Conversations Sidebar */}
        <div className="w-full md:w-80 shrink-0 border-r border-white/5 flex flex-col h-full bg-slate-950/20">
          <div className="p-4 border-b border-white/5">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Konuşmalar</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">Aktif mesajlaşma bulunmuyor.</div>
            ) : (
              conversations.map((conv) => {
                const other = getOtherUser(conv);
                const isSelected = selectedConversation?.id === conv.id;
                const lastMsg = conv.messages[0];
                const hasUnread = lastMsg && lastMsg.senderId !== currentUser?.id && !lastMsg.readAt;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3.5 rounded-2xl flex flex-col gap-1 transition ${
                      isSelected
                        ? "bg-orange-500/10 border border-orange-500/20 text-orange-400"
                        : "border border-transparent text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">
                        {other ? formatUserName(other) : "Kullanıcı"}
                      </span>
                      {hasUnread && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold truncate">
                      İlan: {conv.listing.title}
                    </span>
                    {lastMsg && (
                      <span className="text-[11px] text-slate-500 truncate mt-1">
                        {lastMsg.body}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full bg-[#020617]/25">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/10">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200">
                    {formatUserName(getOtherUser(selectedConversation))}
                  </span>
                  <a
                    href={`/listings/${selectedConversation.listing.id}`}
                    className="text-[10px] font-bold text-orange-400 hover:text-orange-300 truncate"
                  >
                    İlan: {selectedConversation.listing.title}
                  </a>
                </div>
              </div>

              {/* Messages scrollarea */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs font-medium ${
                          isMe
                            ? "bg-orange-600 text-white rounded-br-none"
                            : "bg-slate-900 border border-white/5 text-slate-200 rounded-bl-none"
                        }`}
                      >
                        <p className="break-words whitespace-pre-wrap">{msg.body}</p>
                        <span className="text-[8px] opacity-60 block text-right mt-1 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-950/20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Mesajınızı yazın..."
                    className="flex-1 bg-[#05070f] border border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:border-orange-500 focus:outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessageText.trim()}
                    className="px-6 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-2xl cursor-pointer transition"
                  >
                    {sending ? "Gönderiliyor" : "Gönder"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center gap-2">
              <span className="text-3xl">💬</span>
              <span className="text-xs font-bold">Mesajlaşmayı başlatmak için soldan bir sohbet seçin.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
