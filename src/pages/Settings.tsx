import { useEffect, useState } from 'react';
import { speakText, speakAi, getPlatform, getSetting, setSetting, testAiApi, getAiPrompt, setAiPrompt } from '../lib/api';
import { t, setLang, getLang, type Lang } from '../lib/i18n';
import Select from '../components/Select';

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
  const [dictationEnabled, setDictationEnabled] = useState(true);
  const [algorithm, setAlgorithm] = useState('sm2');
  const [fsrsRetention, setFsrsRetention] = useState('0.90');
  const [fsrsMaxInterval, setFsrsMaxInterval] = useState('36500');
  const [fsrsParams, setFsrsParams] = useState('');
  const [showFsrsAdvanced, setShowFsrsAdvanced] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  const [aiUrl, setAiUrl] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiTestResult, setAiTestResult] = useState('');
  const [aiTesting, setAiTesting] = useState(false);
  const [aiPrompt, setAiPromptState] = useState('');

  useEffect(() => {
    getPlatform().then(setPlatform).catch(() => undefined);
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
      if (savedLang === 'en' || savedLang === 'zh' || savedLang === 'zh-TW') {
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
      const savedDictation = await getSetting('dictation_enabled');
      if (savedDictation === 'false') {
        setDictationEnabled(false);
      }
      const savedAlgorithm = await getSetting('learning_mode');
      if (savedAlgorithm === 'fsrs') {
        setAlgorithm(savedAlgorithm);
      }
      const savedRetention = await getSetting('fsrs_retention');
      if (savedRetention) setFsrsRetention(savedRetention);
      const savedMaxInterval = await getSetting('fsrs_max_interval');
      if (savedMaxInterval) setFsrsMaxInterval(savedMaxInterval);
      const savedParams = await getSetting('fsrs_parameters');
      if (savedParams) setFsrsParams(savedParams);
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
    try { localStorage.setItem('mintword_theme', newTheme); } catch { /* localStorage may be unavailable */ }
  }

  async function handleDarkMode(val: boolean) {
    setDarkMode(val);
    await setSetting('dark_mode', val.toString());
    try { localStorage.setItem('mintword_dark_mode', val.toString()); } catch { /* localStorage may be unavailable */ }
  }

  const systemTtsSupported = platform === 'windows' || platform === 'macos';
  const systemTtsLabel = platform === 'macos'
    ? t('settings.tts_system_macos')
    : platform === 'windows'
      ? t('settings.tts_system_windows')
      : t('settings.tts_system');
  const systemTtsDetail = platform === 'macos'
    ? 'macOS say'
    : platform === 'windows'
      ? 'Windows.Media.SpeechSynthesis'
      : t('settings.tts_system_unsupported');

  const sections = [
    { id: 'general', label: t('settings.language') },
    { id: 'learning', label: t('settings.learning_mode') },
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
                  onClick={() => handleLangChange('zh-TW')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    lang === 'zh-TW'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  繁體中文
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
                <button
                  type="button"
                  role="switch"
                  aria-checked={darkMode}
                  onClick={() => handleDarkMode(!darkMode)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                    darkMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    darkMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
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
                  <div className="font-medium text-sm">{systemTtsLabel}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{systemTtsDetail}</div>
                </div>
                <button
                  onClick={() => speakText(t('tts.test_message')).catch(() => {})}
                  disabled={!systemTtsSupported}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {t('settings.tts_test')}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
              <div className="font-medium text-sm mb-2">{t('settings.tts_ai')}</div>

              <div>
                <Select
                  label={t('settings.tts_provider')}
                  value={ttsProvider}
                  onChange={setTtsProvider}
                  options={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'azure', label: 'Azure OpenAI' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                />
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
                  <Select
                    label={t('settings.tts_voice')}
                    value={ttsVoice}
                    onChange={setTtsVoice}
                    options={[
                      { value: 'alloy', label: 'Alloy' },
                      { value: 'echo', label: 'Echo' },
                      { value: 'fable', label: 'Fable' },
                      { value: 'onyx', label: 'Onyx' },
                      { value: 'nova', label: 'Nova' },
                      { value: 'shimmer', label: 'Shimmer' },
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <Select
                    label={t('settings.tts_model')}
                    value={ttsModel}
                    onChange={setTtsModel}
                    options={[
                      { value: 'tts-1', label: 'tts-1' },
                      { value: 'tts-1-hd', label: 'tts-1-hd' },
                    ]}
                  />
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

        {activeSection === 'learning' && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.learning_mode')}
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-medium">{t('settings.dictation_enabled')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.dictation_enabled_desc')}</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dictationEnabled}
                  onClick={async () => {
                    const val = !dictationEnabled;
                    setDictationEnabled(val);
                    await setSetting('dictation_enabled', val.toString());
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${
                    dictationEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    dictationEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </label>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
              <div>
                <Select
                  label={t('settings.algorithm')}
                  value={algorithm}
                  onChange={async (val) => {
                    setAlgorithm(val);
                    await setSetting('learning_mode', val);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  options={[
                    { value: 'sm2', label: t('settings.algorithm_sm2') },
                    { value: 'fsrs', label: t('settings.algorithm_fsrs') },
                  ]}
                />
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">{t('settings.algorithm_hint')}</p>

              {algorithm === 'fsrs' && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setShowFsrsAdvanced(!showFsrsAdvanced)}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {t('settings.fsrs_advanced')}
                    <span className="text-[10px]">{showFsrsAdvanced ? '▲' : '▼'}</span>
                  </button>

                  {showFsrsAdvanced && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t('settings.fsrs_retention')}
                        </label>
                        <input
                          type="range"
                          min="0.70"
                          max="0.95"
                          step="0.01"
                          value={fsrsRetention}
                          onChange={(e) => setFsrsRetention(e.target.value)}
                          onMouseUp={async () => {
                            await setSetting('fsrs_retention', fsrsRetention);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                          }}
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>0.70</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{fsrsRetention}</span>
                          <span>0.95</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{t('settings.fsrs_retention_desc')}</p>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t('settings.fsrs_max_interval')}
                        </label>
                        <input
                          type="number"
                          value={fsrsMaxInterval}
                          onChange={(e) => setFsrsMaxInterval(e.target.value)}
                          onBlur={async () => {
                            await setSetting('fsrs_max_interval', fsrsMaxInterval);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {t('settings.fsrs_parameters')}
                        </label>
                        <textarea
                          value={fsrsParams}
                          onChange={(e) => setFsrsParams(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                          placeholder='[0.4, 0.6, 2.4, ...]'
                        />
                        <button
                          onClick={async () => {
                            await setSetting('fsrs_parameters', fsrsParams);
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                          }}
                          className="mt-2 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary-hover transition-colors"
                        >
                          {t('common.save')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                { key: t('shortcuts.replay_key'), desc: t('shortcuts.replay') },
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
