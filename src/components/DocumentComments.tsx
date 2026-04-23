'use client';

import { useState, useRef, useCallback } from 'react';
import { MessageCircle, Send, Paperclip, X, File, ChevronDown, ChevronUp } from 'lucide-react';

interface Comment {
  id: number;
  text: string;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
  user: { id: number; fullName: string };
}

export function DocumentComments({ documentId, initialComments, currentUserId }: { documentId: number; initialComments: Comment[]; currentUserId: number }) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);

    const formData = new FormData();
    formData.append('documentId', documentId.toString());
    formData.append('text', text);
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/comments', { method: 'POST', body: formData });
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setText('');
        setFile(null);
      }
    } catch (e) { /* ignore */ }
    setSending(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.size <= 5 * 1024 * 1024) {
      setFile(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['from-purple-500 to-purple-600', 'from-blue-500 to-blue-600', 'from-teal-500 to-teal-600', 'from-orange-500 to-orange-600', 'from-pink-500 to-pink-600'];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'только что';
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        <span>Комментарии ({comments.length})</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 animate-fade-in-up">
          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {comments.map((c, i) => (
                <div key={c.id} className="comment-enter flex items-start gap-2.5" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colors[c.user.id % colors.length]} flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm`}>
                    {initials(c.user.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-900">{c.user.fullName}</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                    {c.fileName && (
                      <a
                        href={`/api/comments/${c.id}/file`}
                        download={c.fileName}
                        className="inline-flex items-center gap-1 mt-1 text-[11px] text-purple-600 hover:text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md"
                      >
                        <File className="w-3 h-3" /> {c.fileName}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Input form with drag & drop */}
          <form onSubmit={handleSubmit}>
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`comment-dropzone ${dragOver ? 'dragover' : ''}`}
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={dragOver ? '📎 Перетащите файл сюда...' : 'Написать комментарий...'}
                    rows={1}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  />
                  {file && (
                    <div className="flex items-center gap-1.5 mt-1 px-2 py-1 bg-purple-50 rounded-lg text-[11px] text-purple-700">
                      <File className="w-3 h-3" />
                      <span className="truncate">{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} className="ml-auto hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pb-0.5">
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                    title="Прикрепить файл"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !file)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm disabled:opacity-40 hover:shadow-md transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
