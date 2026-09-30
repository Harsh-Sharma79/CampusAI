import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BookOpen, BrainCircuit, CalendarDays, Check, ChevronDown, ChevronsLeft, ChevronsRight, Command, Compass, FileText, GraduationCap, LayoutDashboard, LogOut, Moon, Search, Settings2, Sparkles, Sun, UserRound, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ThemeChoice } from '../types';
import { Avatar, Tooltip } from './ui';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Tutor', to: '/tutor', icon: Sparkles },
  { label: 'My Materials', to: '/materials', icon: FileText },
  { label: 'Knowledge Map', to: '/knowledge', icon: Compass },
  { label: 'Quiz', to: '/quiz', icon: BrainCircuit },
  { label: 'Flashcards', to: '/flashcards', icon: BookOpen },
  { label: 'Study Planner', to: '/planner', icon: CalendarDays },
  { label: 'Progress', to: '/progress', icon: Activity },
];

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard', '/tutor': 'AI Tutor', '/materials': 'My Materials', '/knowledge': 'Knowledge Map', '/quiz': 'Quiz', '/flashcards': 'Flashcards', '/planner': 'Study Planner', '/progress': 'Progress', '/settings': 'Settings', '/profile': 'Profile',
};

function Brand({ small = false }: { small?: boolean }) {
  return <NavLink to="/dashboard" className={`brand ${small ? 'brand-small' : ''}`} aria-label="CampusAI dashboard">
    <span className="brand-mark"><GraduationCap size={19} strokeWidth={2.1} /><i /></span>
    {!small && <span className="brand-word">Campus<span>AI</span><small>Your AI Academic Copilot</small></span>}
  </NavLink>;
}

function ThemePicker() {
  const { theme, setTheme } = useApp();
  const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Settings2 }];
  return <div className="theme-picker" role="group" aria-label="Appearance theme">{options.map(({ value, label, icon: Icon }) => <button key={value} type="button" className={`theme-option ${theme === value ? 'active' : ''}`} title={label} aria-label={`${label} theme`} aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={14} /><span>{label}</span></button>)}</div>;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useApp();
  const commands = useMemo(() => [
    { label: 'Search materials', detail: 'Find notes and course files', icon: Search, action: () => navigate('/materials') },
    { label: 'Ask AI', detail: 'Open your academic copilot', icon: Sparkles, action: () => navigate('/tutor') },
    { label: 'Start quiz', detail: 'Practice a weak topic', icon: BrainCircuit, action: () => navigate('/quiz') },
    { label: 'Open planner', detail: 'See what is coming up', icon: CalendarDays, action: () => navigate('/planner') },
    { label: 'Go to dashboard', detail: 'Your next best action', icon: LayoutDashboard, action: () => navigate('/dashboard') },
    { label: 'Toggle theme', detail: 'Switch light and dark', icon: theme === 'dark' ? Sun : Moon, action: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
  ], [navigate, setTheme, theme]);
  const filtered = commands.filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => { if (open) { setQuery(''); window.setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'Enter' && open && filtered[0]) { filtered[0].action(); onClose(); } }; if (open) window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [filtered, onClose, open]);
  return <AnimatePresence>{open && <motion.div className="command-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}>
      <div className="command-search"><Search size={18} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What would you like to do?" aria-label="Search commands" /><kbd>ESC</kbd><button type="button" className="icon-button" onClick={onClose} aria-label="Close command palette"><X size={15} /></button></div>
      <div className="command-list"><p className="command-label">QUICK ACTIONS</p>{filtered.length ? filtered.map((item) => <button key={item.label} type="button" className="command-item" onClick={() => { item.action(); onClose(); }}><span className="command-item-icon"><item.icon size={17} /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><ArrowRight size={15} className="command-arrow" /></button>) : <p className="command-empty">No actions match “{query}”.</p>}</div>
      <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span><span>CampusAI command menu</span></footer>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

export function Sidebar({ children, collapsed, mobileOpen, onCollapse }: PropsWithChildren<{ collapsed: boolean; mobileOpen: boolean; onCollapse: () => void }>) {
  return <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="CampusAI sidebar">
    {children}
    {!collapsed && <button className="sidebar-collapse" type="button" onClick={onCollapse} aria-label="Collapse sidebar"><ChevronsLeft size={16} /></button>}
  </aside>;
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { student } = useApp();
  const title = Object.entries(pageNames).find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`))?.[1] ?? 'Dashboard';
  useEffect(() => { const handle = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen((isOpen) => !isOpen); } }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  const nav = <>
    <div className="sidebar-brand-row"><Brand />{collapsed && <button className="icon-button collapse-trigger" onClick={() => setCollapsed(false)} aria-label="Expand sidebar"><ChevronsRight size={17} /></button>}</div>
    {!collapsed && <div className="workspace-pill"><span className="workspace-avatar">U</span><span><strong>University of Example</strong><small>Semester 6 · Computer Science</small></span><ChevronDown size={14} /></div>}
    <div className="sidebar-caption">STUDY SPACE</div>
    <nav className="sidebar-nav" aria-label="Main navigation">{navItems.map(({ label, to, icon: Icon }) => <NavLink end={to === '/dashboard' || to === '/quiz' || to === '/tutor'} key={to} to={to} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'AI Tutor' && !collapsed && <span className="nav-live-dot" />}</NavLink>)}</nav>
    {!collapsed && <div className="sidebar-focus-card"><div className="focus-orbit"><Sparkles size={16} /></div><strong>One step at a time.</strong><p>Your 7-day streak is building real momentum.</p><button type="button" onClick={() => navigate('/progress')}>View progress <ArrowRight size={13} /></button></div>}
    <div className="sidebar-bottom"><NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={collapsed ? 'Settings' : undefined}><Settings2 size={17} /><span>Settings</span></NavLink><NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} title={collapsed ? 'Profile' : undefined}><UserRound size={17} /><span>Profile</span></NavLink>{!collapsed && <ThemePicker />}</div>
    {!collapsed && <button className="profile-mini" onClick={() => navigate('/profile')}><Avatar name={student.name} /><span><strong>{student.name}</strong><small>Student account</small></span><LogOut size={15} /></button>}
  </>;
  return <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCollapse={() => setCollapsed(true)}>{nav}</Sidebar>
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <main className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu-trigger" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Command size={18} /></button><div className="breadcrumbs"><span>Workspace</span><span className="breadcrumb-sep">/</span><strong>{title}</strong></div></div><div className="topbar-right"><Tooltip content="Open the command palette"><button type="button" className="top-search" onClick={() => setPaletteOpen(true)} aria-label="Search or jump to a page"><Search size={15} /><span>Search or jump to...</span><kbd>⌘ K</kbd></button></Tooltip><div className="topbar-divider" /><ThemePicker /><button className="avatar avatar-top" onClick={() => navigate('/profile')} aria-label="Open profile">{student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</button></div></header>
      <div className="page-scroll"><AnimatePresence mode="wait"><motion.div key={location.pathname} className="page-transition" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}><Outlet /></motion.div></AnimatePresence></div>
    </main>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">{[{ label: 'Home', to: '/dashboard', icon: LayoutDashboard }, { label: 'Tutor', to: '/tutor', icon: Sparkles }, { label: 'Materials', to: '/materials', icon: FileText }, { label: 'Map', to: '/knowledge', icon: Compass }, { label: 'Plan', to: '/planner', icon: CalendarDays }].map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'mobile-nav-item active' : 'mobile-nav-item'}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
  </div>;
}

export function Navbar() {
  const navigate = useNavigate();
  const [themeMenu, setThemeMenu] = useState(false);
  const { theme, setTheme } = useApp();
  const choose = (value: ThemeChoice) => { setTheme(value); setThemeMenu(false); };
  const ThemeIcon = theme === 'dark' ? Moon : Sun;
  return <header className="public-header"><Brand /><nav className="public-nav"><a href="#features">Features</a><a href="#how-it-works">How it works</a></nav><div className="public-actions"><div className="theme-menu-wrap"><button type="button" className="public-theme-toggle" aria-label="Change theme" aria-expanded={themeMenu} onClick={() => setThemeMenu(!themeMenu)}><ThemeIcon size={17} /></button>{themeMenu && <div className="theme-menu" role="menu">{(['light', 'dark', 'system'] as ThemeChoice[]).map((option) => <button key={option} role="menuitemradio" aria-checked={theme === option} type="button" onClick={() => choose(option)}>{option === 'light' ? <Sun size={15} /> : option === 'dark' ? <Moon size={15} /> : <Settings2 size={15} />}{option[0].toUpperCase() + option.slice(1)}{theme === option && <Check size={14} />}</button>)}</div>}</div><button type="button" className="public-login" onClick={() => navigate('/login')}>Log in</button><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/signup')}>Get started <ArrowRight size={14} /></button></div></header>;
}

export const PublicHeader = Navbar;
