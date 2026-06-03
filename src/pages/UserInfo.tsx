import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { t } from '../lib/i18n';
import { setAvatarUrl } from '../lib/avatarStore';
import { getSetting, setSetting, saveAvatarFile, getAvatarBase64 } from '../lib/api';
import TagInput from '../components/TagInput';

const DEFAULT_USERNAME = 'Mint';
const DEFAULT_INTERESTS = ['英语'];

export default function UserInfo() {
  const navigate = useNavigate();

  const [avatarBase64, setAvatarBase64] = useState('');
  const [avatarFilename, setAvatarFilename] = useState('');
  const [username, setUsername] = useState(DEFAULT_USERNAME);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([...DEFAULT_INTERESTS]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2000);
  }

  useEffect(() => {
    (async () => {
      const [savedName, savedBio, savedInterests, savedAvatar] = await Promise.all([
        getSetting('user_name'),
        getSetting('user_bio'),
        getSetting('user_interests'),
        getSetting('user_avatar'),
      ]);
      if (savedName) setUsername(savedName);
      if (savedBio !== null) setBio(savedBio);
      if (savedInterests) {
        try { setInterests(JSON.parse(savedInterests)); }
        catch { /* fallback to defaults */ }
      }
      if (savedAvatar) {
        setAvatarFilename(savedAvatar);
        try {
          const dataUrl = await getAvatarBase64(savedAvatar);
          setAvatarBase64(dataUrl);
        } catch { /* fallback to default */ }
      }
    })();
  }, []);

  async function handleAvatarChange() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      });
      if (!selected) return;
      const filename = await saveAvatarFile(selected as string);
      const dataUrl = await getAvatarBase64(filename);
      setAvatarFilename(filename);
      setAvatarBase64(dataUrl);
      setAvatarUrl(dataUrl);
    } catch (err) {
      console.error('Avatar change failed:', err);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        setSetting('user_name', username),
        setSetting('user_bio', bio),
        setSetting('user_interests', JSON.stringify(interests)),
      ]);
      if (avatarFilename) {
        await setSetting('user_avatar', avatarFilename);
      }
      showToast(t('user.save_success'));
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          &larr; {t('common.back')}
        </button>
        <h1 className="text-xl font-bold">{t('user.title')}</h1>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {avatarBase64 ? (
              <img src={avatarBase64} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
          </div>
          <button
            onClick={handleAvatarChange}
            className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors text-sm"
            title={t('user.change_avatar')}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4.5 2A2.5 2.5 0 002 4.5v2.871l5.122-3.886a1 1 0 011.256 0l2.25 1.708 3.297-2.637A1 1 0 0012 2H4.5zM14 2a1 1 0 00-.925.556L9.78 5.834l2.25 1.708L14 5.556V8.5a.5.5 0 001 0V4.5A2.5 2.5 0 0012.5 2H14z" />
              <path d="M2 9.75V15.5A2.5 2.5 0 004.5 18h11a2.5 2.5 0 002.5-2.5V9.75l-5.122 3.886a1 1 0 01-1.256 0L9.5 12.04l-3.122 3.596a1 1 0 11-1.256-1.556L4 13.878V9.75l-2 .5z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">{t('user.change_avatar')}</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('user.username')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('user.bio')}</label>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('user.bio_placeholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
          />
        </div>

        <div>
          <TagInput
            value={interests}
            onChange={setInterests}
            max={10}
            label={t('user.interests')}
            placeholder={t('user.interests_placeholder')}
            hint={t('user.interests_tip')}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors"
      >
        {saving ? `${t('common.save')}...` : t('common.save')}
      </button>

      <div
        className={`fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-sm shadow-lg z-40 transition-all duration-300 ease-out ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
