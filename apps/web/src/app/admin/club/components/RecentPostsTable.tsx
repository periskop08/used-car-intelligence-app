'use client';

import React from 'react';
import Link from 'next/link';

interface PostItem {
  id: string;
  title?: string;
  content: string;
  status: string;
  createdAt: string;
  authorFormatted: string;
  _count?: { comments: number };
}

interface RecentPostsTableProps {
  posts: PostItem[];
  onPostClick?: (post: any) => void;
}

export default function RecentPostsTable({ posts, onPostClick }: RecentPostsTableProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/60 text-center">
        <p className="text-xs text-slate-400">Henüz yayınlanmış gönderi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden font-mono text-xs">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="text-sm font-black text-white">Son Gönderiler</h3>
        </div>
        <Link
          href="/admin/club/posts"
          className="text-xs font-bold text-orange-400 hover:text-orange-300 transition"
        >
          Tümünü Gör ➡️
        </Link>
      </div>

      <div className="divide-y divide-white/5">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => onPostClick && onPostClick(post)}
            className="p-4 hover:bg-white/[0.04] transition flex items-center justify-between gap-4 cursor-pointer"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-slate-200 truncate font-sans">
                  {post.title || post.content.substring(0, 40) + '...'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    post.status === 'PUBLISHED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700/40 text-slate-400 border border-white/10'
                  }`}
                >
                  {post.status === 'PUBLISHED' ? 'YAYINDA' : post.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{post.authorFormatted}</p>
            </div>

            <div className="text-right whitespace-nowrap">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1 justify-end">
                <span>💬</span> {post._count?.comments || 0} Yorum
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {new Date(post.createdAt).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
