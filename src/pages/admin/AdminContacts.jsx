/**
 * © 2024–2025 Navgrow Engineering Service Pvt. Ltd. All rights reserved.
 * CIN: U74999WB2022PTC256012 | navgrow.org | info@navgrow.org
 *
 * PROPRIETARY & CONFIDENTIAL
 * This file is part of the Navgrow Engineering Platform.
 * Unauthorised copying, modification, distribution, or use is prohibited
 * without prior written consent of Navgrow Engineering Service Pvt. Ltd.
 *
 * Licensed for: navgrow.org (Production Deployment Only)
 */
import React, { useState, useCallback } from 'react';
import { MessageSquare, Mail, CheckCircle, Clock, Send, Reply, X, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { contactApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminContacts = () => {
  const { toast } = useToast();
  const [selected,    setSelected]    = useState(null);
  const [showUnread,  setShowUnread]  = useState(false);
  const [replyText,   setReplyText]   = useState('');
  const [replySending,setReplySending]= useState(false);
  const [replyDone,   setReplyDone]   = useState(false);

  const { items, loading, setFilter, refetch } = usePaginated(contactApi.list);
  const [markRead, { loading: marking }] = useMutation(contactApi.markRead);

  const handleMarkRead = async (id) => {
    const res = await markRead(id);
    if (!res.error) { toast({ title: '✓ Marked as read' }); refetch(); }
  };

  const handleSelect = (msg) => {
    setSelected(msg);
    setReplyText('');
    setReplyDone(false);
    // Auto mark as read when opened
    if (!msg.read) {
      contactApi.markRead(msg.id).then(() => refetch()).catch(() => {});
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setReplySending(true);
    try {
      // Try in-app reply API first, fall back to building a mailto link
      try {
        await contactApi.reply(selected.id, { message: replyText });
        setReplyDone(true);
        setReplyText('');
        toast({ title: '✓ Reply sent successfully!' });
      } catch {
        // API not available — open mailto as fallback
        const subject = encodeURIComponent(`Re: ${selected.subject || 'Your enquiry to Navgrow Engineering'}`);
        const body = encodeURIComponent(
          `Dear ${selected.name},\n\n${replyText}\n\n---\nBest regards,\nNavgrow Engineering Team\ninfo@navgrow.org | +91 89270 70972`
        );
        window.open(`mailto:${selected.email}?subject=${subject}&body=${body}`, '_blank');
        setReplyDone(true);
        setReplyText('');
        toast({ title: '✓ Reply opened in email client' });
      }
      refetch();
    } finally {
      setReplySending(false);
    }
  };

  const unreadCount = items.filter(m => !m.read).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Contact Messages</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {items.length} total · <span className="text-amber-400 font-semibold">{unreadCount} unread</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowUnread(!showUnread); setFilter('unread', !showUnread || undefined); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              showUnread ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}>
            <Clock className="h-4 w-4"/> {showUnread ? 'Showing Unread' : 'Filter Unread'}
          </button>
          <button aria-label="Refresh" onClick={refetch} className="p-2 bg-gray-800 text-gray-400 rounded-xl hover:bg-gray-700 transition-colors">
            <RefreshCw className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Total Messages', value: items.length,                        col: 'text-blue-400' },
          { label: 'Unread',         value: unreadCount,                          col: 'text-amber-400' },
          { label: 'Read',           value: items.length - unreadCount,           col: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
            <p className={`text-xl font-extrabold ${s.col}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Message List */}
        <div className="space-y-2">
          {loading
            ? [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-800 animate-pulse rounded-2xl"/>)
            : items.map(msg => (
              <button key={msg.id} onClick={() => handleSelect(msg)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selected?.id === msg.id
                    ? 'border-blue-500 bg-blue-950/50'
                    : !msg.read
                    ? 'border-amber-500/40 bg-gray-800 hover:border-amber-400'
                    : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {!msg.read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse"/>}
                      <p className="font-semibold text-white text-sm truncate">{msg.name}</p>
                    </div>
                    <p className="text-gray-400 text-xs truncate mb-0.5">{msg.subject}</p>
                    <p className="text-gray-500 text-[11px]">{msg.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gray-600 text-[10px]">
                      {new Date(msg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                    {msg.read
                      ? <span className="text-[9px] text-green-500 font-bold">READ</span>
                      : <span className="text-[9px] text-amber-400 font-bold">NEW</span>
                    }
                  </div>
                </div>
              </button>
            ))
          }
          {items.length === 0 && !loading && (
            <div className="text-center py-16 bg-gray-800 rounded-2xl border border-gray-700 text-gray-500">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30"/>
              <p>No messages yet</p>
            </div>
          )}
        </div>

        {/* Message Detail + Reply */}
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="bg-gray-800 rounded-2xl border border-gray-700 p-6 flex flex-col gap-4">

              {/* Contact info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-lg">{selected.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-1 text-blue-400 hover:underline">
                      <Mail className="h-3.5 w-3.5"/>{selected.email}
                    </a>
                    {selected.phone && <span>📞 {selected.phone}</span>}
                    {selected.company && <span>🏢 {selected.company}</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(selected.createdAt).toLocaleString('en-IN', { day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' })}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400">
                  <X className="h-4 w-4"/>
                </button>
              </div>

              {/* Subject */}
              <div className="bg-gray-900/70 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1.5">Subject</p>
                <p className="text-white font-semibold text-sm">{selected.subject}</p>
              </div>

              {/* Message */}
              <div className="bg-gray-900/70 rounded-xl p-4 flex-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1.5">Message</p>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              {/* In-app reply */}
              {replyDone ? (
                <div className="flex items-center gap-2 p-3 bg-green-900/40 border border-green-700/50 rounded-xl">
                  <CheckCircle className="h-4 w-4 text-green-400 shrink-0"/>
                  <p className="text-green-400 text-sm font-semibold">Reply sent successfully!</p>
                  <button onClick={() => setReplyDone(false)} className="ml-auto text-gray-500 hover:text-gray-300 text-xs underline">
                    Reply again
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
                    Reply to {selected.name}
                  </label>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={4}
                    placeholder={`Dear ${selected.name},\n\nThank you for reaching out to Navgrow Engineering…`}
                    className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white
                               focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-y"
                  />
                  <div className="flex gap-2">
                    <button aria-label="Send"
                      onClick={handleReply}
                      disabled={!replyText.trim() || replySending}
                      className="flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm
                                 hover:opacity-90 disabled:opacity-50 transition-opacity flex-1">
                      {replySending
                        ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                        : <Send className="h-4 w-4"/>
                      }
                      {replySending ? 'Sending…' : 'Send Reply'}
                    </button>
                    <a href={`mailto:${selected.email}?subject=${encodeURIComponent('Re: ' + (selected.subject||''))}&body=${encodeURIComponent(replyText || '')}`}
                      className="px-4 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                      title="Open in email client">
                      <Mail className="h-4 w-4"/> Email
                    </a>
                  </div>
                  <p className="text-xs text-gray-500">
                    Reply will be sent via our email system. A signature will be added automatically.
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-gray-800/40 rounded-2xl border border-gray-700/50 flex items-center justify-center">
              <div className="text-center text-gray-500 py-16">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20"/>
                <p className="font-semibold">Select a message to read and reply</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminContacts;
