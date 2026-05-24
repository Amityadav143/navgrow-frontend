import React from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import { Newspaper, Settings, Image, Briefcase, LayoutDashboard, ChevronRight, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const EDITOR_ITEMS = [
  { path: '/editor',          label: 'Overview',    icon: LayoutDashboard, exact: true },
  { path: '/admin/news',      label: 'News & Posts', icon: Newspaper },
  { path: '/admin/projects',  label: 'Projects',     icon: Image },
  { path: '/admin/gallery',   label: 'Gallery',      icon: Image },
  { path: '/admin/jobs',      label: 'Careers/Jobs', icon: Briefcase },
  { path: '/admin/settings',  label: 'Site Settings',icon: Settings },
];

export default function EditorLayout() {
  const { isEditor, isAdmin, user } = useAuth();
  if (!isEditor && !isAdmin) return <Navigate to="/" replace />;

  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-950">
      <aside className="w-56 bg-gray-900 text-gray-300 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-800">
          <Link to="/"><img src="/ng_white_logo.png" alt="Navgrow" className="h-9 w-auto object-contain"/></Link>
          <p className="text-xs text-amber-400 font-bold mt-2">✏ Editor Panel</p>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto">
          {EDITOR_ITEMS.map(({ path, label, icon: Icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link key={path} to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                  active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <Icon className="h-4 w-4 shrink-0"/>{label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <a href="/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
            <Globe className="h-3.5 w-3.5"/>View Site
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {/* Editor overview (shown at /editor index) */}
        {location.pathname === '/editor' && (
          <div className="p-8 max-w-3xl">
            <h1 className="text-2xl font-extrabold text-white mb-2">Editor Dashboard</h1>
            <p className="text-gray-400 mb-8">You have access to manage website content. Use the sidebar to navigate.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {EDITOR_ITEMS.filter(i => !i.exact).map(({ path, label, icon: Icon }) => (
                <Link key={path} to={path}
                  className="flex items-center gap-4 p-5 bg-gray-800 rounded-2xl border border-gray-700 hover:border-blue-600 hover:bg-gray-700/80 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-blue-900/50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-blue-400"/>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{label}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-blue-400 transition-colors"/>
                </Link>
              ))}
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
