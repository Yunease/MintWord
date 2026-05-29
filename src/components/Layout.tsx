import { NavLink } from 'react-router-dom';
import { t } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { getSetting } from '../lib/api';
import { readFile } from '@tauri-apps/plugin-fs';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [bgStyle, setBgStyle] = useState<React.CSSProperties>({});
  const [showBg, setShowBg] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0.3);

  useEffect(() => {
    let objectUrl: string | null = null;
    (async () => {
      const bgPath = await getSetting('background_image');
      const bgOpacitySetting = await getSetting('background_opacity');
      if (bgPath) {
        const opacity = bgOpacitySetting ? parseFloat(bgOpacitySetting) : 0.3;
        setBgOpacity(opacity);
        setShowBg(true);
        try {
          const bytes = await readFile(bgPath);
          const ext = bgPath.split('.').pop()?.toLowerCase() || 'png';
          const mime: Record<string, string> = {
            jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
            gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp',
          };
          const blob = new Blob([bytes], { type: mime[ext] || 'image/png' });
          objectUrl = URL.createObjectURL(blob);
          setBgStyle({
            backgroundImage: `url('${objectUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          });
        } catch (e) {
          console.error('Failed to load background image:', e);
          setShowBg(false);
        }
      } else {
        setShowBg(false);
        setBgStyle({});
      }
    })();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col relative" style={bgStyle}>
      {showBg && (
        <div className="absolute inset-0 bg-white dark:bg-gray-950 pointer-events-none" style={{ opacity: bgOpacity }} />
      )}
      <header className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm sticky top-0">
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
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
