'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Paperclip, ArrowLeft, File, Image as ImageIcon, Search } from 'lucide-react';

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

  // Fetch contacts
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

  // Fetch messages
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
    // Also poll for unread count even when closed
    const unreadInterval = setInterval(fetchContacts, 20000);
    return () => { clearInterval(interval); clearInterval(unreadInterval); };
  }, [open, selectedContact, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // File handling
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

  // Drag & drop
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

  // Send message
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
  const colors = ['from-purple-500 to-purple-600', 'from-blue-500 to-blue-600', 'from-teal-500 to-teal-600', 'from-orange-500 to-orange-600', 'from-pink-500 to-pink-600', 'from-cyan-500 to-cyan-600'];

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

  return (
    <>
      {/* ═══ FLOATING BUTTON ═══ */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-xl shadow-purple-500/30 flex items-center justify-center hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 ${open ? 'rotate-0' : ''}`}
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center notif-badge">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* ═══ CHAT PANEL ═══ */}
      {open && (
        <div className="chat-panel fixed bottom-24 right-6 z-50 w-[360px] sm:w-[400px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200/60 overflow-hidden flex flex-col">
          {!selectedContact ? (
            /* ─── CONTACTS LIST ─── */
            <>
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                <h3 className="text-base font-bold">Сообщения</h3>
                <p className="text-xs text-white/70 mt-0.5">Начните диалог с коллегой</p>
              </div>

              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по имени..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Нет контактов</p>
                  </div>
                ) : (
                  filteredContacts.map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[contact.id % colors.length]} flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}>
                        {initials(contact.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900 truncate">{contact.fullName}</span>
                          {contact.lastMessageTime && (
                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeFormat(contact.lastMessageTime)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{contact.lastMessage || 'Нет сообщений'}</span>
                          {contact.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                              {contact.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            /* ─── CHAT VIEW ─── */
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                <button onClick={() => { setSelectedContact(null); fetchContacts(); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/15 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {initials(selectedContact.fullName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{selectedContact.fullName}</p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`chat-dropzone flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2 ${dragOver ? 'dragover' : ''}`}
              >
                {/* Drag overlay */}
                {dragOver && (
                  <div className="absolute inset-0 bg-purple-50/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl pointer-events-none">
                    <Paperclip className="w-10 h-10 text-purple-400 mb-2" />
                    <p className="text-sm font-semibold text-purple-600">Отпустите для прикрепления</p>
                    <p className="text-xs text-purple-400 mt-1">Макс. 5 MB</p>
                  </div>
                )}

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-xs">Начните разговор</p>
                  </div>
                )}

                {messages.map((msg) => {
                  const isMine = msg.senderId === userId;
                  return (
                    <div key={msg.id} className={`chat-bubble-in flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3.5 py-2 ${isMine ? 'msg-sent' : 'msg-received'}`}>
                        {msg.text && <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        {msg.fileName && (
                          <a
                            href={`/api/chat/${msg.id}/file`}
                            download={msg.fileName}
                            className={`mt-1.5 flex items-center gap-1.5 text-xs ${isMine ? 'text-white/90 hover:text-white' : 'text-purple-600 hover:text-purple-700'}`}
                          >
                            {isImage(msg.fileType) ? <ImageIcon className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                            <span className="truncate underline">{msg.fileName}</span>
                          </a>
                        )}
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60 text-right' : 'text-gray-400'}`}>
                          {timeFormat(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* File preview */}
              {file && (
                <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/80">
                  <div className="flex items-center gap-2">
                    {filePreview ? (
                      <img src={filePreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <File className="w-5 h-5 text-purple-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-[10px] text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={clearFile} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSend} className="px-3 py-2.5 border-t border-gray-100 bg-white">
                <div className="flex items-end gap-2">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex-shrink-0"
                    title="Прикрепить файл (или перетащите)"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Сообщение..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100 transition-all"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  />
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !file)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-sm disabled:opacity-40 hover:shadow-md transition-all flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
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
