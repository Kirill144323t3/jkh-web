'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Paperclip, ArrowLeft, File, Image as ImageIcon, Search, Smile, Upload } from 'lucide-react';

interface Contact {
  id: number;
  fullName: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  text: string | null;
  fileName: string | null;
  fileType: string | null;
  isRead: boolean;
  createdAt: string;
}

export function ChatWidget({ userId, userName }: { userId: number; userName: string }) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`/api/chat/contacts?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setTotalUnread(data.totalUnread || 0);
      }
    } catch (e) { /* ignore */ }
  };

  const fetchMessages = async (contactId: number) => {
    try {
      const res = await fetch(`/api/chat?userId=${userId}&contactId=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (open) fetchContacts();
    const interval = setInterval(() => {
      if (open && !selectedContact) fetchContacts();
      if (open && selectedContact) fetchMessages(selectedContact.id);
    }, 4000);
    const unreadInterval = setInterval(fetchContacts, 20000);
    return () => { clearInterval(interval); clearInterval(unreadInterval); };
  }, [open, selectedContact, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFile = (f: File | null) => {
    if (!f || f.size > 5 * 1024 * 1024) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  const clearFile = () => { setFile(null); setFilePreview(null); };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!text.trim() && !file) || !selectedContact || sending) return;
    setSending(true);

    const formData = new FormData();
    formData.append('senderId', userId.toString());
    formData.append('receiverId', selectedContact.id.toString());
    if (text.trim()) formData.append('text', text.trim());
    if (file) formData.append('file', file);

    try {
      const res = await fetch('/api/chat', { method: 'POST', body: formData });
      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setText('');
        clearFile();
      }
    } catch (e) { /* ignore */ }
    setSending(false);
  };

  const selectContact = (contact: Contact) => {
    setSelectedContact(contact);
    fetchMessages(contact.id);
  };

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-teal-500 to-emerald-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
    'from-indigo-500 to-blue-500',
  ];

  const timeFormat = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const filteredContacts = contacts.filter(c =>
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isImage = (type: string | null) => type?.startsWith('image/');

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString('ru-RU');
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <>
      {/* ═══ FLOATING BUTTON ═══ */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div className={`w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 ${open ? 'scale-90 rotate-90' : 'hover:scale-105 active:scale-95'}`}>
          {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </div>
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center notif-badge shadow-lg shadow-red-500/30 border-2 border-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
        {/* Pulse ring */}
        {!open && totalUnread > 0 && (
          <span className="absolute inset-0 rounded-2xl bg-purple-400 animate-ping opacity-20" />
        )}
      </button>

      {/* ═══ CHAT PANEL ═══ */}
      {open && (
        <div className="chat-panel fixed bottom-24 right-6 z-50 w-[380px] sm:w-[420px] h-[560px] bg-white rounded-2xl shadow-2xl shadow-gray-900/20 border border-gray-100 overflow-hidden flex flex-col">
          {!selectedContact ? (
            /* ─── CONTACTS LIST ─── */
            <>
              {/* Header with gradient */}
              <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600">
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-white">Сообщения</h3>
                  <p className="text-white/60 text-xs mt-0.5">Общение с коллегами</p>
                </div>
                {/* Decorative circles */}
                <div className="absolute top-3 right-4 w-20 h-20 bg-white/5 rounded-full" />
                <div className="absolute -bottom-3 right-16 w-12 h-12 bg-white/5 rounded-full" />
              </div>

              {/* Search */}
              <div className="px-4 py-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Найти контакт..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-purple-200 focus:bg-white transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Contact List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                      <MessageSquare className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Нет контактов</p>
                    <p className="text-xs text-gray-400 mt-1 text-center">Контакты появятся автоматически</p>
                  </div>
                ) : (
                  <div className="px-2">
                    {filteredContacts.map((contact, i) => (
                      <button
                        key={contact.id}
                        onClick={() => selectContact(contact)}
                        className="w-full flex items-center gap-3.5 px-3 py-3 hover:bg-gray-50 rounded-xl transition-all text-left group"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors[contact.id % colors.length]} flex items-center justify-center text-white text-sm font-bold shadow-md shadow-purple-500/10 flex-shrink-0 group-hover:shadow-lg transition-shadow`}>
                          {initials(contact.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900 truncate">{contact.fullName}</span>
                            {contact.lastMessageTime && (
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2 font-medium">{timeFormat(contact.lastMessageTime)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-gray-500 truncate pr-2">{contact.lastMessage || 'Нет сообщений'}</span>
                            {contact.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-gradient-to-r from-purple-500 to-violet-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                {contact.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ─── CHAT VIEW ─── */
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 relative">
                <button onClick={() => { setSelectedContact(null); fetchContacts(); }} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/15 transition-colors text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {initials(selectedContact.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{selectedContact.fullName}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <p className="text-[11px] text-white/60">Онлайн</p>
                  </div>
                </div>
                {/* Decorative */}
                <div className="absolute top-2 right-4 w-14 h-14 bg-white/5 rounded-full" />
              </div>

              {/* Messages */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex-1 overflow-y-auto custom-scrollbar px-4 py-3 relative ${dragOver ? 'bg-purple-50/50' : 'bg-gray-50/30'}`}
                style={{ backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(139, 92, 246, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
              >
                {/* Drag overlay */}
                {dragOver && (
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-50/90 to-violet-50/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 pointer-events-none">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-3 animate-float">
                      <Upload className="w-9 h-9 text-purple-500" />
                    </div>
                    <p className="text-sm font-bold text-purple-700">Отпустите файл</p>
                    <p className="text-xs text-purple-400 mt-1">Макс. 5 MB</p>
                  </div>
                )}

                {messages.length === 0 && !dragOver && (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                      <Smile className="w-7 h-7 text-gray-300" />
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Начните разговор!</p>
                  </div>
                )}

                {Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 bg-white/80 backdrop-blur-sm rounded-full text-[10px] font-semibold text-gray-400 shadow-sm border border-gray-100">{date}</span>
                    </div>
                    <div className="space-y-1.5">
                      {msgs.map((msg) => {
                        const isMine = msg.senderId === userId;
                        return (
                          <div key={msg.id} className={`chat-bubble-in flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] px-3.5 py-2.5 ${isMine ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl rounded-br-md shadow-md shadow-purple-500/15' : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'}`}>
                              {msg.text && <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                              {msg.fileName && (
                                <a
                                  href={`/api/chat/${msg.id}/file`}
                                  download={msg.fileName}
                                  className={`mt-1.5 flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${isMine ? 'bg-white/15 text-white/90 hover:bg-white/25' : 'bg-gray-50 text-purple-600 hover:bg-gray-100'} transition-colors`}
                                >
                                  {isImage(msg.fileType) ? <ImageIcon className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                                  <span className="truncate">{msg.fileName}</span>
                                </a>
                              )}
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50 text-right' : 'text-gray-300'}`}>
                                {timeFormat(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* File preview */}
              {file && (
                <div className="px-4 py-2.5 bg-purple-50/50 border-t border-purple-100">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      <img src={filePreview} alt="preview" className="w-12 h-12 rounded-xl object-cover shadow-sm border border-purple-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-sm">
                        <File className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{file.name}</p>
                      <p className="text-[10px] text-purple-500 font-medium">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={clearFile} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-purple-100 transition-colors">
                      <X className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSend} className="px-3 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex-shrink-0"
                    title="Прикрепить файл (или перетащите)"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Написать сообщение..."
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all placeholder:text-gray-400"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !file)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-purple-500/20 disabled:opacity-30 disabled:shadow-none hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
