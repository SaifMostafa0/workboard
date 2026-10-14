import { useTheme } from '@/app/providers';
import { CommandPalette } from '@/components/command-palette/CommandPalette';
import { KeyboardShortcutsDialog } from '@/components/command-palette/KeyboardShortcutsDialog';
import { useSettings, useUpdateSettings } from '@/hooks/useData';
import { useGlobalHotkeys } from '@/hooks/useGlobalHotkeys';
import { cn } from '@/lib/cn';
import { isApplePlatform } from '@/lib/hotkeys';
import {
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Menu,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

const navigation = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/trash', label: 'Trash', icon: Trash2 },
  { path: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Layout({ children }: { children?: React.ReactNode }) {
  const { theme: themeRaw, resolvedTheme, setTheme } = useTheme();
  const theme = themeRaw as 'light' | 'dark' | 'system';
  const location = useLocation();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings({ silent: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Hydrate synchronously from localStorage so the sidebar doesn't flash
  // open/closed before the persisted settings query resolves.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('workboard:sidebar-collapsed');
    return saved !== null ? (JSON.parse(saved) as boolean) : false;
  });

  // Reflect compact mode on the document root so spacing tokens tighten globally.
  useEffect(() => {
    document.documentElement.classList.toggle('compact', Boolean(settings?.compactMode));
  }, [settings?.compactMode]);

  // Keep the sidebar in sync with the persisted preference (e.g. when changed
  // from the Settings page) and mirror it to localStorage for instant loads.
  // On the very first settings emission we keep the localStorage-hydrated value
  // so a reload can't be clobbered by a write that hasn't committed yet.
  const appliedSettingsRef = useRef(false);
  useEffect(() => {
    if (!settings) return;
    if (!appliedSettingsRef.current) {
      appliedSettingsRef.current = true;
      return;
    }
    setSidebarCollapsed(settings.sidebarCollapsed);
    localStorage.setItem('workboard:sidebar-collapsed', JSON.stringify(settings.sidebarCollapsed));
  }, [settings]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const openPalette = () => setPaletteOpen(true);
  const openShortcuts = () => setShortcutsOpen(true);
  useGlobalHotkeys({ onOpenPalette: openPalette, onOpenShortcuts: openShortcuts });

  const toggleCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('workboard:sidebar-collapsed', JSON.stringify(next));
    updateSettings.mutate({ sidebarCollapsed: next });
  };

  const handleThemeCycle = () => {
    const themes = ['light', 'dark', 'system'] as const;
    const currentTheme = theme;
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex] as 'light' | 'dark' | 'system';
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="w-5 h-5" aria-hidden="true" />;
    if (resolvedTheme === 'dark') return <Moon className="w-5 h-5" aria-hidden="true" />;
    return <Sun className="w-5 h-5" aria-hidden="true" />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return 'System';
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  return (
    <div className={cn(styles.layout, sidebarCollapsed && styles.layoutCollapsed)}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && <div className={styles.backdrop} onClick={closeSidebar} aria-hidden="true" />}

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={cn(
          styles.sidebar,
          sidebarOpen && styles.sidebarOpen,
          sidebarCollapsed && styles.sidebarCollapsed
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className={styles.sidebarHeader}>
          {!sidebarCollapsed && <span className={styles.logo}>Workboard</span>}
          <button
            className={styles.collapseBtn}
            onClick={toggleCollapse}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
          >
            <Menu
              className={cn(styles.collapseIcon, sidebarCollapsed && styles.rotated)}
              aria-hidden="true"
            />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navigation.map(({ path, label, icon: Icon }) => (
              <li key={path} className={styles.navItem}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    cn(
                      styles.navLink,
                      isActive && styles.navLinkActive,
                      sidebarCollapsed && styles.navLinkCollapsed
                    )
                  }
                  onClick={closeSidebar}
                  aria-current={location.pathname === path ? 'page' : undefined}
                >
                  <Icon className={styles.navIcon} aria-hidden="true" />
                  {!sidebarCollapsed && <span className={styles.navLabel}>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.header} role="banner">
          <button
            className={styles.menuBtn}
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>

          <div className={styles.headerSpacer} />

          <button
            className={styles.searchBtn}
            onClick={openPalette}
            aria-label="Open command palette"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span className={styles.searchLabel}>Search</span>
            <kbd className={styles.searchKbd}>{isApplePlatform() ? '⌘' : 'Ctrl'} K</kbd>
          </button>

          <button
            className={styles.themeToggle}
            onClick={handleThemeCycle}
            aria-label={`Current theme: ${getThemeLabel()}. Click to cycle.`}
            title={`Theme: ${getThemeLabel()}`}
          >
            {getThemeIcon()}
            <span className={styles.themeLabel}>{getThemeLabel()}</span>
          </button>
        </header>

        {/* Page content */}
        <main className={styles.content} id="main-content" role="main" tabIndex={-1}>
          {children ?? <Outlet />}
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
