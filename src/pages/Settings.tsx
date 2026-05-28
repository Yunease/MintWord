import { useEffect, useState } from 'react';
import { speakText, speakAi, getSetting, setSetting } from '../lib/api';
import { t, setLang, getLang, type Lang } from '../lib/i18n';
import { open } from '@tauri-apps/plugin-dialog';

export default function Settings() {
  const [ttsProvider, setTtsProvider] = useState('openai');
  const [ttsUrl, setTtsUrl] = useState('https://api.openai.com/v1/audio/speech');
  const [ttsKey, setTtsKey] = useState('');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [ttsModel, setTtsModel] = useState('tts-1');
  const [lang, setLangState] = useState<Lang>(getLang());
  const [saved, setSaved] = useState(false);
  const [bgPath, setBgPath] = useState('');
  const [bgOpacity, setBgOpacity] = useState(0.3);

  useEffect(() => {
    (async () => {
      const url = await getSetting('tts_ai_url');
      if (url) setTtsUrl(url);
      const key = await getSetting('tts_ai_key');
      if (key) setTtsKey(key);
      const voice = await getSetting('tts_ai_voice');
      if (voice) setTtsVoice(voice);
      const model = await getSetting('tts_ai_model');
      if (model) setTtsModel(model);
      const savedLang = await getSetting('lang');
      if (savedLang === 'en' || savedLang === 'zh') {
        setLangState(savedLang);
        setLang(savedLang);
      }
      const bg = await getSetting('background_image');
      if (bg) setBgPath(bg);
      const opacity = await getSetting('background_opacity');
      if (opacity) setBgOpacity(parseFloat(opacity));
    })();
  }, []);

  async function saveSettings() {
    await setSetting('tts_ai_url', ttsUrl);
    await setSetting('tts_ai_key', ttsKey);
    await setSetting('tts_ai_voice', ttsVoice);
    await setSetting('tts_ai_model', ttsModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLangChange(newLang: Lang) {
    setLangState(newLang);
    setLang(newLang);
    setSetting('lang', newLang);
  }

  async function handleSelectBg() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
      });
      if (selected) {
        setBgPath(selected);
        await setSetting('background_image', selected);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch { /* ignore */ }
  }

  async function handleClearBg() {
    setBgPath('');
    await setSetting('background_image', '');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleOpacityChange(val: number) {
    setBgOpacity(val);
    await setSetting('background_opacity', val.toString());
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xl font-bold">{t('nav.settings')}</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('settings.language')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleLangChange('zh')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              lang === 'zh'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => handleLangChange('en')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              lang === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            English
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('settings.background')}
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectBg}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors"
            >
              {t('settings.background_select')}
            </button>
            {bgPath && (
              <button
                onClick={handleClearBg}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
              >
                {t('settings.background_clear')}
              </button>
            )}
          </div>
          {bgPath && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{bgPath}</div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('settings.background_opacity')}: {Math.round(bgOpacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={bgOpacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          {!bgPath && (
            <div className="text-xs text-gray-400 dark:text-gray-600">
              {t('settings.background_select')}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('settings.tts')}
        </h2>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{t('settings.tts_system')}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Windows SAPI5</div>
            </div>
            <button
              onClick={() => speakText(t('tts.test_message')).catch(() => {})}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {t('settings.tts_test')}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <div className="font-medium text-sm mb-2">{t('settings.tts_ai')}</div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_provider')}</label>
            <select
              value={ttsProvider}
              onChange={(e) => setTtsProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="openai">OpenAI</option>
              <option value="azure">Azure OpenAI</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_api_url')}</label>
            <input
              value={ttsUrl}
              onChange={(e) => setTtsUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_api_key')}</label>
            <input
              type="password"
              value={ttsKey}
              onChange={(e) => setTtsKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_voice')}</label>
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
                <option value="nova">Nova</option>
                <option value="shimmer">Shimmer</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_model')}</label>
              <select
                value={ttsModel}
                onChange={(e) => setTtsModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tts-1">tts-1</option>
                <option value="tts-1-hd">tts-1-hd</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={saveSettings}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={async () => {
                if (ttsKey) {
                  try {
                    await speakAi(t('tts.test_message'), ttsUrl, ttsKey, ttsVoice, ttsModel);
                  } catch { /* ignore */ }
                }
              }}
              disabled={!ttsKey}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {t('settings.tts_test')}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t('settings.about')}
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-600 dark:text-gray-400">
          {t('settings.about_desc')}
        </div>
      </section>

      {saved && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm shadow-lg">
          {t('toast.saved')}
        </div>
      )}
    </div>
  );
}
