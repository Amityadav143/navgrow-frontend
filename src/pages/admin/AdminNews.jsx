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
import { renderArticleHtml } from '@/lib/richText';
import { useConfirm } from '@/components/ConfirmDialog';
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Newspaper, Search, CheckCircle,
  Eye, EyeOff, X, AlertCircle, RefreshCw, Calendar,
  Tag, User, Globe, FileText, Image, Bold, Italic,
  List, Type, AlignLeft, Heading,
} from 'lucide-react';
import { newsApi } from '@/lib/api';
import ImageUploadInput, { MultiImageUploadButton } from '@/components/admin/ImageUploadInput';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = ['Project Update', 'Company News', 'Industry', 'Milestone', 'Announcement', 'Technical'];

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ── Simple rich text toolbar ────────────────────────────────────────────── */
const RichToolbar = ({ textareaRef, onChange }) => {
  // Apply a change and notify React (controlled component) in one place.
  const apply = (newVal, selStart, selEnd) => {
    const ta = textareaRef.current;
    if (!ta) return;
    onChange(newVal);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(selStart, selEnd ?? selStart);
    });
  };

  // Wrap the selection with inline markers (bold/italic/code).
  const wrap = (marker) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || 'text';
    const newVal = value.slice(0, s) + marker + sel + marker + value.slice(e);
    apply(newVal, s + marker.length, s + marker.length + sel.length);
  };

  // Prefix each selected line (headings, list items, quotes) — markdown blocks
  // must start a line, so this guarantees valid, unambiguous structure.
  const prefixLines = (prefix, { ordered = false } = {}) => {
    const ta = textareaRef.current;
    if (!ta) return;
    let { selectionStart: s, selectionEnd: e, value } = ta;
    // Expand selection to whole lines.
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    let lineEnd = value.indexOf('\n', e);
    if (lineEnd === -1) lineEnd = value.length;
    const block = value.slice(lineStart, lineEnd) || 'text';
    const lines = block.split('\n');
    const out = lines.map((ln, i) => {
      const clean = ln.replace(/^(\s*)(#{1,6}\s+|[-*]\s+|>\s+|\d+[.)]\s+)/, '$1');
      return (ordered ? `${i + 1}. ` : prefix) + (clean || 'text');
    }).join('\n');
    // Ensure a blank line before a heading so it always parses as a block.
    const needsGapBefore = prefix.startsWith('#') && lineStart > 0 && value[lineStart - 1] !== '\n';
    const insert = (needsGapBefore ? '\n' : '') + out;
    const newVal = value.slice(0, lineStart) + insert + value.slice(lineEnd);
    apply(newVal, lineStart + insert.length, lineStart + insert.length);
  };

  const tools = [
    { icon: Heading,   label: 'H2',    action: () => prefixLines('## ') },
    { icon: Heading,   label: 'H3',    action: () => prefixLines('### ') },
    { icon: Bold,      label: 'Bold',  action: () => wrap('**') },
    { icon: Italic,    label: 'Italic',action: () => wrap('_') },
    { icon: List,      label: 'Bullets', action: () => prefixLines('- ') },
    { icon: List,      label: 'Numbered', action: () => prefixLines('', { ordered: true }) },
    { icon: FileText,  label: 'Quote', action: () => prefixLines('> ') },
  ];
  return (
    <div className="flex gap-1 p-2 bg-gray-800 border-b border-gray-700 rounded-t-xl flex-wrap">
      {tools.map(({ icon: Icon, label, action }) => (
        <button key={label} type="button" onClick={action}
          className="px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
          <Icon className="h-3 w-3" />{label}
        </button>
      ))}
      <span className="ml-auto text-xs text-gray-500 self-center">Formatted editor — no HTML needed</span>
    </div>
  );
};

/* ── Article form ─────────────────────────────────────────────────────────── */
const ArticleForm = ({ initial, onSave, onCancel, saving }) => {
  const contentRef = useRef(null);
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '', category: 'Project Update',
    imageUrl: '', imageUrls: '', authorName: 'Navgrow Team', tags: '', status: 'DRAFT',
    ...(initial || {}),
  });
  const [preview, setPreview] = useState(false);
  const ch = useCallback(key => e => setForm(p => ({ ...p, [key]: e.target.value })), []);

  const handleTitleChange = e => {
    const t = e.target.value;
    setForm(p => ({ ...p, title: t, slug: p.slug || slugify(t) }));
  };

  return (
    <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
      className="bg-gray-800 rounded-2xl border border-gray-700 p-5 mb-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-lg flex items-center gap-2">
          {initial ? <Edit2 className="h-5 w-5 text-blue-400"/> : <Plus className="h-5 w-5 text-green-400"/>}
          {initial ? 'Edit Article' : 'New Article'}
        </h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview(p=>!p)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-600 transition-colors">
            <Eye className="h-3.5 w-3.5"/>{preview ? 'Editor' : 'Preview'}
          </button>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors">
            <X className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {preview ? (
        <div className="bg-white rounded-xl p-6">
          {form.imageUrl && <img loading="lazy" decoding="async" src={form.imageUrl} alt="" className="w-full h-48 object-cover rounded-xl mb-4"/>}
          <span className="text-xs font-bold text-blue-600 uppercase">{form.category}</span>
          <h2 className="text-2xl font-extrabold text-gray-900 mt-2 mb-3">{form.title || 'Article Title'}</h2>
          <p className="text-gray-500 mb-4 italic">{form.excerpt}</p>
          <div className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: renderArticleHtml(form.content || 'Article content here…') }}/>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Title *</label>
              <input required value={form.title} onChange={handleTitleChange}
                placeholder="Article headline" maxLength={200}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"/>
            </div>
            {/* Slug */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">URL Slug *</label>
              <input required value={form.slug} onChange={ch('slug')}
                placeholder="url-friendly-slug"
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"/>
            </div>
            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Category</label>
              <select value={form.category} onChange={ch('category')}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {/* Author */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Author</label>
              <input value={form.authorName} onChange={ch('authorName')} placeholder="Navgrow Team"
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"/>
            </div>
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
              <select value={form.status} onChange={ch('status')}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500">
                <option value="DRAFT">📝 Draft</option>
                <option value="PUBLISHED">🌐 Published</option>
                <option value="ARCHIVED">📁 Archived</option>
              </select>
            </div>
            {/* Cover Image — paste a URL or upload from device */}
            <div className="md:col-span-2">
              <ImageUploadInput label="Cover Image" value={form.imageUrl}
                onChange={(url) => setForm(p => ({ ...p, imageUrl: url }))} />
            </div>
            {/* Gallery Images */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Gallery Images <span className="text-gray-600 normal-case">(one URL per line — shown as a gallery in the article)</span></label>
              <textarea value={form.imageUrls} onChange={ch('imageUrls')} rows={3}
                placeholder={"https://…/photo-2.jpg\nhttps://…/photo-3.jpg"}
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-y placeholder-gray-600"/>
              <MultiImageUploadButton onUploaded={(url) => setForm(p => ({ ...p, imageUrls: (p.imageUrls ? p.imageUrls.replace(/\n+$/,'') + '\n' : '') + url }))} />
              {form.imageUrls && form.imageUrls.split('\n').map(u=>u.trim()).filter(Boolean).length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {form.imageUrls.split('\n').map(u=>u.trim()).filter(Boolean).slice(0,6).map((u,i)=>(
                    <img key={i} loading="lazy" decoding="async" src={u} alt="" className="h-14 w-14 object-cover rounded-lg border border-gray-700" onError={e=>{e.target.style.display='none'}}/>
                  ))}
                </div>
              )}
            </div>
            {/* Excerpt */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Excerpt (shown in listing)</label>
              <textarea value={form.excerpt} onChange={ch('excerpt')} rows={2} maxLength={300}
                placeholder="Brief summary shown in article cards…"
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 resize-none"/>
            </div>
            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Tags (comma-separated)</label>
              <input value={form.tags} onChange={ch('tags')} placeholder="Indian Railways, Safety, Innovation"
                className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"/>
            </div>
            {/* Content */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Full Content</label>
              <div className="rounded-xl overflow-hidden border border-gray-700">
                <RichToolbar textareaRef={contentRef} onChange={(v) => setForm(p => ({ ...p, content: v }))}/>
                <textarea ref={contentRef} value={form.content} onChange={ch('content')} rows={14}
                  placeholder={"Write naturally. Use the buttons above to format.\n\n## Section heading\n\nA paragraph of text.\n\n- First point\n- Second point"}
                  className="w-full px-3 py-2.5 bg-gray-900 border-0 text-sm text-white font-mono focus:outline-none resize-y"/>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Tip: put a blank line between paragraphs. Use the toolbar for headings, bold, and lists — no HTML needed. The Preview tab shows exactly how it will look.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">
              {saving ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <CheckCircle className="h-4 w-4"/>}
              {saving ? 'Saving…' : initial ? 'Update Article' : 'Publish Article'}
            </button>
            {form.status === 'DRAFT' && (
              <button type="button" onClick={() => onSave({ ...form, status: 'PUBLISHED' })} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 disabled:opacity-60">
                <Globe className="h-4 w-4"/>Publish Now
              </button>
            )}
            <button type="button" onClick={onCancel}
              className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

/* ── Main AdminNews ─────────────────────────────────────────────────────── */
const AdminNews = () => {
  const confirm = useConfirm();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [search,   setSearch]   = useState('');

  // /news/manage returns DRAFT + PUBLISHED + ARCHIVED. The public /news list
  // only serves PUBLISHED — using it here made drafts "disappear" from the
  // panel the moment they were saved.
  const { items, loading, refetch } = usePaginated(newsApi.manage, { size: 50 });
  const [create, { loading: creating }] = useMutation(newsApi.create);
  const [update, { loading: updating }] = useMutation(newsApi.update);
  const [remove]                        = useMutation(newsApi.delete);

  const handleSave = async (form) => {
    const data = {
      ...form,
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : form.tags || [],
    };
    const res = editing
      ? await update(editing.id, data)
      : await create(data);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    const published = data.status === 'PUBLISHED';
    toast({
      title: editing
        ? (published ? '✓ Article updated & live' : '✓ Draft updated')
        : (published ? '✓ Article published — now live on the News page' : '✓ Draft saved (not public yet)'),
    });
    setShowForm(false); setEditing(null); refetch();
  };

  const handleToggleStatus = async (article) => {
    const next = article.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const res = await update(article.id, {
      title: article.title, content: article.content, excerpt: article.excerpt,
      category: article.category, imageUrl: article.imageUrl, imageUrls: article.imageUrls,
      tags: article.tags || [], status: next,
    });
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: next === 'PUBLISHED' ? '✓ Published — now live on the News page' : '✓ Unpublished (draft)' });
    refetch();
  };

  const handleDelete = async (id, title) => {
    const ok = await confirm({
      title: 'Delete article?',
      message: `"${title}" will be permanently deleted. This cannot be undone.`,
      confirmText: 'Delete Article',
      variant: 'danger',
    });
    if (!ok) return;
    await remove(id);
    toast({ title: '✓ Article deleted' });
    refetch();
  };

  const filtered = items.filter(a =>
    !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.category?.toLowerCase().includes(search.toLowerCase())
  );

  const STATUS_COLORS = { PUBLISHED: 'bg-green-100 text-green-700', DRAFT: 'bg-yellow-100 text-yellow-700', ARCHIVED: 'bg-gray-100 text-gray-500' };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">News & Articles</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.length} articles · accessible by Admin & Editor roles</p>
        </div>
        <button onClick={() => { setShowForm(f=>!f); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4"/>{showForm ? 'Cancel' : 'Write Article'}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search articles…"
          className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-64 transition-colors"/>
      </div>

      <AnimatePresence>
        {(showForm || editing) && (
          <ArticleForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
            saving={creating || updating}
          />
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Article', 'Category', 'Status', 'Author', 'Views', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(4)].map((_,i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {[...Array(7)].map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-24"/></td>)}
                    </tr>
                  ))
                : filtered.map(a => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-semibold text-gray-900 text-xs leading-snug line-clamp-2">{a.title}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">/{a.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{a.category}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-500'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.authorName || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{a.viewCount || 0}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {(a.publishedAt || a.createdAt) ? new Date(a.publishedAt || a.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleToggleStatus(a)}
                            className={`p-1.5 rounded-lg transition-colors ${a.status==='PUBLISHED' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            title={a.status==='PUBLISHED' ? 'Unpublish (back to draft)' : 'Publish now'}>
                            <Globe className="h-3.5 w-3.5"/>
                          </button>
                          <button onClick={() => { setEditing(a); setShowForm(false); }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Edit">
                            <Edit2 className="h-3.5 w-3.5"/>
                          </button>
                          <a href={`/news/${a.slug}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="View">
                            <Eye className="h-3.5 w-3.5"/>
                          </a>
                          <button onClick={() => handleDelete(a.id, a.title)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                            <Trash2 className="h-3.5 w-3.5"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-400">
            <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-20"/>
            <p className="font-semibold">No articles yet</p>
            <p className="text-sm mt-1">Click "Write Article" to create your first news post</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNews;
