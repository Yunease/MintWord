import { NavLink } from 'react-router-dom';
import { t } from '../lib/i18n';
import { useEffect } from 'react';
import { getSetting } from '../lib/api';

export default function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      const [savedDark, savedTheme] = await Promise.all([
        getSetting('dark_mode'),
        getSetting('theme'),
      ]);

      if (savedDark === 'true') {
        document.documentElement.classList.add('dark');
        try { localStorage.setItem('mintword_dark_mode', 'true'); } catch {}
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.setItem('mintword_dark_mode', 'false'); } catch {}
      }

      const theme = savedTheme || 'mint';
      document.documentElement.className = document.documentElement.className
        .replace(/theme-\w+/g, '')
        .trim();
      document.documentElement.classList.add(`theme-${theme}`);
      try { localStorage.setItem('mintword_theme', theme); } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            {t('app.name')}
          </NavLink>
          <nav className="flex gap-1">
            {(['/', '/decks', '/library', '/stats', '/settings'] as const).map((path) => {
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
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
