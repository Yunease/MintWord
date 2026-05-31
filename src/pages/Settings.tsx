import { useEffect, useState } from 'react';
import { speakText, speakAi, getSetting, setSetting, testAiApi, getAiPrompt, setAiPrompt } from '../lib/api';
import { t, setLang, getLang, type Lang } from '../lib/i18n';

type Theme = 'mint' | 'ocean' | 'warm' | 'lavender';

const THEMES: { id: Theme; labelKey: string; color: string }[] = [
  { id: 'mint', labelKey: 'settings.theme_mint', color: '#10b981' },
  { id: 'ocean', labelKey: 'settings.theme_ocean', color: '#3b82f6' },
  { id: 'warm', labelKey: 'settings.theme_warm', color: '#f59e0b' },
  { id: 'lavender', labelKey: 'settings.theme_lavender', color: '#8b5cf6' },
];

export default function Settings() {
  const [ttsProvider, setTtsProvider] = useState('openai');
  const [ttsUrl, setTtsUrl] = useState('https://api.openai.com/v1/audio/speech');
  const [ttsKey, setTtsKey] = useState('');
  const [ttsVoice, setTtsVoice] = useState('alloy');
  const [ttsModel, setTtsModel] = useState('tts-1');
  const [lang, setLangState] = useState<Lang>(getLang());
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<Theme>('mint');
  const [darkMode, setDarkMode] = useState(false);

  const [aiUrl, setAiUrl] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiTestResult, setAiTestResult] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiPrompt, setAiPromptState] = useState('');

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
      const aiApiUrl = await getSetting('ai_api_url');
      if (aiApiUrl) setAiUrl(aiApiUrl);
      const aiApiKey = await getSetting('ai_api_key');
      if (aiApiKey) setAiKey(aiApiKey);
      const aiModelVal = await getSetting('ai_model');
      if (aiModelVal) setAiModel(aiModelVal);
      const promptVal = await getAiPrompt();
      if (promptVal) setAiPromptState(promptVal);
      const savedLang = await getSetting('lang');
      if (savedLang === 'en' || savedLang === 'zh') {
        setLangState(savedLang);
        setLang(savedLang);
      }
      const savedTheme = await getSetting('theme');
      if (savedTheme === 'ocean' || savedTheme === 'warm' || savedTheme === 'lavender') {
        setTheme(savedTheme);
      }
      const savedDark = await getSetting('dark_mode');
      if (savedDark === 'true') {
        setDarkMode(true);
      }
    })();
  }, []);

  useEffect(() => {
    document.documentElement.className = darkMode ? `theme-${theme} dark` : `theme-${theme}`;
    if (!darkMode) {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, darkMode]);

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

  async function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    await setSetting('theme', newTheme);
    try { localStorage.setItem('mintword_theme', newTheme); } catch {}
  }

  async function handleDarkMode(val: boolean) {
    setDarkMode(val);
    await setSetting('dark_mode', val.toString());
    try { localStorage.setItem('mintword_dark_mode', val.toString()); } catch {}
  }

  const sections = [
    { id: 'general', label: t('settings.language') },
    { id: 'tts', label: t('settings.tts') },
    { id: 'ai', label: t('settings.ai') },
    { id: 'shortcuts', label: t('settings.shortcuts') },
    { id: 'about', label: t('settings.about') },
  ] as const;

  type SectionId = typeof sections[number]['id'];
  const [activeSection, setActiveSection] = useState<SectionId>('general');

  return (
    <div className="flex gap-8">
      <nav className="w-36 shrink-0 space-y-1 sticky top-20 self-start">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              activeSection === s.id
                ? 'bg-primary-light text-primary-dark font-medium'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0 space-y-8">
        {activeSection === 'general' && (
          <>
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('settings.language')}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleLangChange('zh')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    lang === 'zh'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  中文
                </button>
                <button
                  onClick={() => handleLangChange('en')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    lang === 'en'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  English
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {t('settings.theme')}
              </h2>
              <div className="flex gap-2">
                {THEMES.map(({ id, labelKey, color }) => (
                  <button
                    key={id}
                    onClick={() => handleThemeChange(id)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      theme === id ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title={t(labelKey)}
                  />
                ))}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={(e) => handleDarkMode(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm">{t('settings.dark_mode')}</span>
              </label>
            </section>
          </>
        )}

        {activeSection === 'tts' && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.tts')}
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
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

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
              <div className="font-medium text-sm mb-2">{t('settings.tts_ai')}</div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_provider')}</label>
                <select
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_api_key')}</label>
                <input
                  type="password"
                  value={ttsKey}
                  onChange={(e) => setTtsKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.tts_voice')}</label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="tts-1">tts-1</option>
                    <option value="tts-1-hd">tts-1-hd</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveSettings}
                  className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
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
        )}

        {activeSection === 'ai' && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
              {t('settings.ai')}
              <div className="relative group">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 text-[10px] text-white cursor-help">?</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-72 p-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg shadow-lg z-10">
                  <div className="font-medium mb-1">{t('settings.ai_tts_tip_title')}</div>
                  <div className="leading-relaxed">{t('settings.ai_tts_tip')}</div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                </div>
              </div>
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.ai_api_url')}</label>
                <input
                  value={aiUrl}
                  onChange={(e) => setAiUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.ai_api_key')}</label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('settings.ai_model')}</label>
                <input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await setSetting('ai_api_url', aiUrl);
                    await setSetting('ai_api_key', aiKey);
                    await setSetting('ai_model', aiModel);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={async () => {
                    if (!aiKey) return;
                    setAiTesting(true);
                    setAiTestResult('');
                    try {
                      const result = await testAiApi(aiUrl || 'https://api.openai.com/v1', aiKey, aiModel || 'gpt-4o-mini');
                      setAiTestResult(result);
                    } catch (e) {
                      setAiTestResult(`${t('settings.ai_test_fail')}: ${e}`);
                    }
                    setAiTesting(false);
                  }}
                  disabled={!aiKey || aiTesting}
                  className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {aiTesting ? '...' : t('settings.ai_test')}
                </button>
              </div>

              {aiTestResult && (
                <div className={`text-xs ${aiTestResult.includes('成功') || aiTestResult.includes('success') || aiTestResult.includes('正常') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {aiTestResult}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-500 dark:text-gray-400">{t('settings.ai_prompt')}</label>
                <button
                  onClick={async () => {
                    setAiPromptState('');
                    await setAiPrompt('');
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {t('settings.ai_prompt_reset')}
                </button>
              </div>
              <p className="text-xs text-gray-400">{t('settings.ai_prompt_desc')}</p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPromptState(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
              />
              <button
                onClick={async () => {
                  if (aiPrompt.trim()) {
                    await setAiPrompt(aiPrompt);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }
                }}
                disabled={!aiPrompt.trim()}
                className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </section>
        )}

        {activeSection === 'shortcuts' && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.shortcuts')}
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {[
                { key: t('shortcuts.space_enter'), desc: t('shortcuts.flip_card') },
                { key: '1', desc: t('shortcuts.forgot') },
                { key: '2', desc: t('shortcuts.hazy') },
                { key: '3', desc: t('shortcuts.remembered') },
                { key: 'M', desc: t('shortcuts.mastered') },
                { key: t('shortcuts.preview_keys'), desc: t('shortcuts.preview_navigate') },
              ].map(({ key, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-gray-600 dark:text-gray-400">{desc}</span>
                  <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeSection === 'about' && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.about')}
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 text-sm text-gray-600 dark:text-gray-400">
              {t('settings.about_desc')}
            </div>
          </section>
        )}

        {saved && (
          <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-sm shadow-lg">
            {t('toast.saved')}
          </div>
        )}
      </div>
    </div>
  );
}
