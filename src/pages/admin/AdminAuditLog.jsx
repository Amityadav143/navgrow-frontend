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
import React, { useState } from 'react';
import { Shield, Search, RefreshCw, Download, Filter } from 'lucide-react';
import { auditApi } from '@/lib/api';
import { usePaginated } from '@/hooks/useApi';

const METHOD_COLORS = {
  GET:    'bg-gray-100 text-gray-600',
  POST:   'bg-blue-100 text-blue-700',
  PUT:    'bg-amber-100 text-amber-700',
  PATCH:  'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700',
};
const STATUS_COLORS = {
  '2': 'bg-green-100 text-green-700',
  '4': 'bg-amber-100 text-amber-700',
  '5': 'bg-red-100 text-red-700',
};

const AdminAuditLog = () => {
  const [search, setSearch]       = useState('');
  const [methodFilter, setMethod] = useState('');

  const { items, loading, refetch, setFilter } = usePaginated(auditApi.list, { size: 100 });

  const filtered = items.filter(log =>
    (!methodFilter || log.method === methodFilter) &&
    (!search || log.endpoint?.toLowerCase().includes(search.toLowerCase()) || log.userEmail?.toLowerCase().includes(search.toLowerCase()))
  );

  const exportCSV = () => {
    const headers = ['Timestamp','Method','Endpoint','Status','User','IP','Duration(ms)'];
    const rows = filtered.map(l => [
      l.timestamp, l.method, l.endpoint, l.statusCode, l.userEmail||'guest', l.ipAddress, l.durationMs
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-400"/> Audit Log
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">All API calls with status, user, and timing</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-600">
            <Download className="h-3.5 w-3.5"/> Export CSV
          </button>
          <button aria-label="Refresh" onClick={refetch} className="p-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
            <RefreshCw className="h-4 w-4"/>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search endpoint or user…"
            className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-full"/>
        </div>
        <select value={methodFilter} onChange={e=>setMethod(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white focus:outline-none">
          <option value="">All Methods</option>
          {['GET','POST','PUT','PATCH','DELETE'].map(m=><option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label:'Total Calls',   value: items.length,                                    col:'text-blue-400' },
          { label:'GET',           value: items.filter(l=>l.method==='GET').length,        col:'text-gray-400' },
          { label:'POST/PUT/PATCH',value: items.filter(l=>['POST','PUT','PATCH'].includes(l.method)).length, col:'text-amber-400' },
          { label:'DELETE',        value: items.filter(l=>l.method==='DELETE').length,     col:'text-red-400' },
          { label:'Errors (4xx/5xx)',value:items.filter(l=>l.statusCode>=400).length,      col:'text-red-400' },
        ].map(s=>(
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
            <p className={`text-xl font-extrabold ${s.col}`}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Timestamp','Method','Endpoint','Status','User','IP Address','Duration'].map(h=>(
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(8)].map((_,i)=><tr key={i} className="border-b">{[...Array(7)].map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded w-20"/></td>)}</tr>)
                : filtered.map((log,i)=>(
                  <tr key={log.id||i} className="border-b border-gray-50 hover:bg-gray-50 text-xs">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap font-mono">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] font-mono ${METHOD_COLORS[log.method]||'bg-gray-100 text-gray-600'}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 max-w-[200px] truncate" title={log.endpoint}>{log.endpoint}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${STATUS_COLORS[String(log.statusCode)?.[0]]||'bg-gray-100 text-gray-500'}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{log.userEmail||<span className="text-gray-400">guest</span>}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400">{log.ipAddress||'—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{log.durationMs!=null ? `${log.durationMs}ms` : '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {filtered.length===0&&!loading&&(
          <div className="text-center py-16 text-gray-400">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-20"/>
            <p className="font-semibold">No audit log entries found</p>
            <p className="text-sm mt-1">API calls will appear here once the audit service is active</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
