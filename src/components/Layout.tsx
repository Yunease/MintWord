import { NavLink, useNavigate } from 'react-router-dom';
import { t, setLang, getLang, subscribeLang, type Lang } from '../lib/i18n';
import { setAvatarUrl, getAvatarUrl, subscribeAvatar } from '../lib/avatarStore';
import { useEffect, useSyncExternalStore, useState, useRef, useCallback } from 'react';
import { getSetting, getAvatarBase64 } from '../lib/api';

export default function Layout({ children }: { children: React.ReactNode }) {
  useSyncExternalStore(subscribeLang, getLang);
  const avatarUrl = useSyncExternalStore(subscribeAvatar, getAvatarUrl);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [savedDark, savedTheme, savedLang, savedAvatar] = await Promise.all([
        getSetting('dark_mode'),
        getSetting('theme'),
        getSetting('lang'),
        getSetting('user_avatar'),
      ]);

      if (savedLang === 'zh' || savedLang === 'zh-TW' || savedLang === 'en') {
        setLang(savedLang as Lang);
      }

      if (savedDark === 'true') {
        document.documentElement.classList.add('dark');
        try { localStorage.setItem('mintword_dark_mode', 'true'); } catch { /* localStorage may be unavailable */ }
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('mintword_dark_mode', 'false'); } catch { /* localStorage may be unavailable */ }
      }

      const theme = savedTheme || 'mint';
      document.documentElement.className = document.documentElement.className
        .replace(/theme-\w+/g, '')
        .trim();
      document.documentElement.classList.add(`theme-${theme}`);
      try { localStorage.setItem('mintword_theme', theme); } catch { /* localStorage may be unavailable */ }

      if (savedAvatar) {
        try {
          const dataUrl = await getAvatarBase64(savedAvatar);
          setAvatarUrl(dataUrl);
        } catch { /* fallback to default */ }
      }
    })();
  }, []);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, closeDropdown]);

  function handleNav(path: string) {
    closeDropdown();
    navigate(path);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            {t('app.name')}
          </NavLink>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1">
              {(['/', '/decks', '/library'] as const).map((path) => {
                const key = path === '/' ? 'nav.dashboard' : `nav.${path.slice(1)}`;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === '/'}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-primary-light text-primary-dark font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {t(key)}
                  </NavLink>
                );
              })}
            </nav>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-primary transition-all flex-shrink-0"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-50">
                  <button
                    onClick={() => handleNav('/user')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('user.dropdown_info')}
                  </button>
                  <button
                    onClick={() => handleNav('/stats')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('user.dropdown_stats')}
                  </button>
                  <button
                    onClick={() => handleNav('/settings')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('user.dropdown_settings')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
