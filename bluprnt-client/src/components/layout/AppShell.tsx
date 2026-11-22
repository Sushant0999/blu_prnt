import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Cpu,
  FileText,
  HelpCircle,
  CreditCard,
  Moon,
  Sun,
  Flame,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bluprnt_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bluprnt_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // On large interactive workspaces like Playground, default sidebar to compact mode if not explicitly saved
  useEffect(() => {
    if (location.pathname === '/playground') {
      const saved = localStorage.getItem('bluprnt_sidebar_collapsed');
      if (saved === null) {
        setIsCollapsed(true);
      }
    }
  }, [location.pathname]);

  const navItems = [
    { label: 'Learn', path: '/', icon: BookOpen, matchPrefixes: ['/lessons'] },
    { label: 'Cases', path: '/cases', icon: FileText },
    { label: 'Simulate', path: '/simulate', icon: Cpu, badge: 'Auto-Stream', matchPrefixes: ['/simulators', '/playground'] },
    { label: 'Practice', path: '/interview', icon: Sparkles, matchPrefixes: ['/flashcards', '/calculators'] },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/lessons');
    }
    if (location.pathname.startsWith(item.path)) return true;
    if (item.matchPrefixes) {
      return item.matchPrefixes.some((p) => location.pathname.startsWith(p));
    }
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 transition-colors duration-200">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-800 bg-slate-900 shrink-0 transition-all duration-300 ease-in-out relative ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header & Logo */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-800">
          <Link
            to="/"
            className={`flex items-center gap-3 overflow-hidden ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
            title="BluPrnt Home"
          >
            <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent block truncate">
                  BluPrnt
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                  System Design Studio
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Floating toggle button when collapsed */}
        {isCollapsed && (
          <div className="px-3 pt-2">
            <button
              onClick={toggleSidebar}
              className="w-full py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition border border-slate-800"
              title="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-2.5 py-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex items-center rounded-xl text-sm font-medium transition-all ${
                  isCollapsed
                    ? 'justify-center h-11 w-11 mx-auto'
                    : 'justify-between px-3.5 py-3'
                } ${
                  active
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Quick Sub-links under Simulate */}
          <div className={`pt-3 pb-1 ${isCollapsed ? 'text-center' : 'px-3'}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              {isCollapsed ? '···' : 'Lab Shortcuts'}
            </span>
          </div>

          <Link
            to="/playground"
            title="Shared Playground"
            className={`flex items-center rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition ${
              isCollapsed ? 'justify-center h-9 w-9 mx-auto' : 'space-x-2 px-3.5 py-2'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            {!isCollapsed && <span>Shared Playground</span>}
          </Link>

          <Link
            to="/flashcards"
            title="Flashcards (SRS)"
            className={`flex items-center rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition ${
              isCollapsed ? 'justify-center h-9 w-9 mx-auto' : 'space-x-2 px-3.5 py-2'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {!isCollapsed && <span>Flashcards (SRS)</span>}
          </Link>

          <Link
            to="/calculators"
            title="Capacity Calculators"
            className={`flex items-center rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition ${
              isCollapsed ? 'justify-center h-9 w-9 mx-auto' : 'space-x-2 px-3.5 py-2'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {!isCollapsed && <span>Capacity Calculators</span>}
          </Link>
        </nav>

        {/* Pro & Offline status badge in sidebar footer */}
        <div className="p-3 border-t border-slate-800">
          {isCollapsed ? (
            <Link
              to="/pro"
              className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-slate-950/70 border border-slate-800/80 text-cyan-400 hover:text-cyan-300"
              title="Offline PWA • Pro Available"
            >
              <CreditCard className="w-4 h-4" />
            </Link>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-medium text-slate-300">Offline PWA</span>
              </div>
              <Link
                to="/pro"
                className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pro
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Navbar */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <span className="md:hidden font-extrabold text-base bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              BluPrnt
            </span>
            <span className="hidden md:block text-xs font-mono text-slate-400">
              Interactive System Design & Distributed Systems Studio
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak Counter Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-800/60 text-amber-400 text-xs font-bold shadow-sm">
              <Flame className="w-4 h-4 fill-amber-500 text-amber-500 animate-bounce" />
              <span>Streak: Active</span>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </header>

        {/* Body Viewport */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar: Learn, Cases, Simulate, Practice */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 border-t border-slate-800 backdrop-blur z-40 flex items-center justify-around px-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-16 py-1 transition-colors ${
                  active ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
