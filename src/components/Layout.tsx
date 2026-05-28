import { NavLink } from 'react-router-dom';
import { t } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { getSetting } from '../lib/api';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    (async () => {
      const bgPath = await getSetting('background_image');
      const bgOpacity = await getSetting('background_opacity');
      if (bgPath) {
        const opacity = bgOpacity ? parseFloat(bgOpacity) : 0.3;
        setBgStyle({
          backgroundImage: `url('file:///${bgPath.replace(/\\/g, '/')}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          position: 'relative',
        });
        const style = document.createElement('style');
        style.textContent = `
          .bg-overlay::before {
            content: '';
            position: fixed;
            inset: 0;
            background: inherit;
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
            opacity: ${opacity};
            pointer-events: none;
            z-index: -1;
          }
        `;
        document.head.appendChild(style);
        document.body.classList.add('bg-overlay');
        return () => {
          document.head.removeChild(style);
          document.body.classList.remove('bg-overlay');
        };
      } else {
        setBgStyle({});
        document.body.classList.remove('bg-overlay');
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col" style={bgStyle}>
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="text-lg font-bold tracking-tight">
            {t('app.name')}
          </NavLink>
          <nav className="flex gap-1">
            {(['/', '/decks', '/stats', '/settings'] as const).map((path) => {
              const key = path === '/' ? 'nav.dashboard' : `nav.${path.slice(1)}`;
              return (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
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
