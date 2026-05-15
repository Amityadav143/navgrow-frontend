import React, { useState } from 'react';
import { MessageSquare, Mail, CheckCircle, Clock, Send } from 'lucide-react';
import { contactApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminContacts = () => {
  const { toast } = useToast();
  const [selected, setSelected] = useState(null);
  const [showUnread, setShowUnread] = useState(false);
  const { items, loading, setFilter, refetch } = usePaginated(contactApi.list);
  const [markRead, { loading: marking }] = useMutation(contactApi.markRead);

  const handleMarkRead = async (id) => {
    const res = await markRead(id);
    if (!res.error) { toast({ title: 'Marked as read' }); refetch(); setSelected(null); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Contact Messages</h1>
        <button onClick={() => { setShowUnread(!showUnread); setFilter('unread', !showUnread || undefined); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${showUnread ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
          <Clock className="h-4 w-4" /> {showUnread ? 'Showing Unread' : 'Filter Unread'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* List */}
        <div className="space-y-3">
          {loading ? [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-800 animate-pulse rounded-2xl" />) :
          items.map((msg) => (
            <button key={msg.id} onClick={() => setSelected(msg)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selected?.id === msg.id ? 'border-blue-500 bg-blue-950' : !msg.read ? 'border-amber-500/30 bg-gray-800' : 'border-gray-800 bg-gray-800/50'} hover:border-blue-400`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!msg.read && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                    <p className="font-semibold text-white text-sm truncate">{msg.name}</p>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{msg.subject}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{msg.email}</p>
                </div>
                <p className="text-gray-600 text-[10px] shrink-0">{new Date(msg.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
            </button>
          ))}
          {items.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500"><MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />No messages</div>
          )}
        </div>

        {/* Detail */}
        <AnimatePresence>
          {selected && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
              className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{selected.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${selected.email}`} className="text-blue-400 hover:underline">{selected.email}</a>
                    {selected.phone && <span>· {selected.phone}</span>}
                  </div>
                  {selected.company && <p className="text-xs text-gray-500 mt-0.5">{selected.company}</p>}
                </div>
                {!selected.read && (
                  <button onClick={() => handleMarkRead(selected.id)} disabled={marking}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-500">
                    <CheckCircle className="h-3.5 w-3.5" /> Mark Read
                  </button>
                )}
              </div>

              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Subject</p>
                <p className="text-white font-semibold text-sm">{selected.subject}</p>
              </div>

              <div className="bg-gray-900 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Message</p>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selected.message}</p>
              </div>

              <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                className="flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
                <Send className="h-4 w-4" /> Reply via Email
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminContacts;
