import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Package, Search, X, CheckCircle } from 'lucide-react';
import { productsApi } from '@/lib/api';
import { usePaginated, useMutation } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Safety Equipment', 'Railway Tools', 'Maintenance Supplies', 'Testing & Inspection', 'PPE & Workwear'];

const ProductForm = ({ initial, onSave, onCancel, saving }) => {
  const [form, setForm] = useState(initial || {
    name: '', category: 'Safety Equipment', price: '', mrp: '', gstRate: '18',
    stockQty: '0', description: '', imageUrl: '', badge: '', featured: false
  });
  const ch = (k) => (e) => setForm(p => ({ ...p, [k]: e.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-4">
      <h3 className="font-bold text-white text-lg">{initial ? 'Edit Product' : 'Add New Product'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Product Name *</label>
          <input required value={form.name} onChange={ch('name')} placeholder="e.g. Safety Helmet ISI"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Category *</label>
          <select required value={form.category} onChange={ch('category')}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Price (₹) *</label>
          <input required type="number" step="0.01" value={form.price} onChange={ch('price')} placeholder="480"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">MRP (₹)</label>
          <input type="number" step="0.01" value={form.mrp} onChange={ch('mrp')} placeholder="650"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Stock Qty</label>
          <input type="number" value={form.stockQty} onChange={ch('stockQty')} placeholder="100"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Badge</label>
          <input value={form.badge} onChange={ch('badge')} placeholder="Bestseller / Top Rated"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Image URL</label>
          <input value={form.imageUrl} onChange={ch('imageUrl')} placeholder="https://..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
          <textarea value={form.description} onChange={ch('description')} rows={3} placeholder="Product description…"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none resize-none" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="featured" checked={form.featured} onChange={ch('featured')} className="rounded" />
          <label htmlFor="featured" className="text-sm text-gray-300 font-medium">Featured Product</label>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60">
          {saving ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {saving ? 'Saving…' : initial ? 'Update Product' : 'Create Product'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
};

const AdminProducts = () => {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { items, loading, setFilter, refetch } = usePaginated(productsApi.list);
  const [create, { loading: creating }] = useMutation(productsApi.create);
  const [update, { loading: updating }] = useMutation(productsApi.update);
  const [remove] = useMutation(productsApi.delete);

  const handleSave = async (form) => {
    const data = { ...form, price: parseFloat(form.price), mrp: form.mrp ? parseFloat(form.mrp) : null, stockQty: parseInt(form.stockQty), gstRate: 18 };
    const res = editing ? await update(editing.id, data) : await create(data);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Product updated' : 'Product created' });
    setShowForm(false); setEditing(null); refetch();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await remove(id);
    if (res.error) { toast({ title: 'Failed', description: res.error, variant: 'destructive' }); return; }
    toast({ title: 'Product deleted' });
    refetch();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">Products</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); }}
          className="flex items-center gap-2 px-4 py-2.5 brand-gradient text-white font-bold rounded-xl text-sm hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input placeholder="Search products…" onChange={e => setFilter('q', e.target.value)}
            className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56" />
        </div>
        <select onChange={e => setFilter('category', e.target.value || undefined)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Form */}
      <AnimatePresence>
        {(showForm || editing) && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-5">
            <ProductForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} saving={creating || updating} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Product','Category','Price','MRP','Stock','Status','Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(6)].map((_, i) => (
              <tr key={i} className="border-b border-gray-50">
                {[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td>)}
              </tr>
            )) : items.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-9 h-9 rounded-lg object-cover bg-gray-100" onError={e => { e.target.style.display='none'; }} />}
                    <div>
                      <p className="font-semibold text-gray-900 text-xs">{p.name}</p>
                      {p.badge && <span className="text-[10px] font-bold text-blue-600">{p.badge}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{p.category}</td>
                <td className="px-4 py-3 font-bold text-gray-900 text-xs">₹{p.price?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.mrp ? `₹${p.mrp?.toLocaleString('en-IN')}` : '—'}</td>
                <td className="px-4 py-3 text-xs"><span className={`font-bold ${p.stockQty > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.stockQty}</span></td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(p); setShowForm(false); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400"><Package className="h-10 w-10 mx-auto mb-2 opacity-30" />No products found</div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
