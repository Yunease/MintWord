import { useEffect, useState } from 'react';
import { speakText, speakAi, getPlatform, getSetting, setSetting, setAiPrompt, clearLearningProgress, clearReviewLogs, clearSettings, clearAllCache, checkNativeTtsVoice } from '../lib/api';
import { t, setLang, getLang, type Lang } from '../lib/i18n';
import Select from '../components/Select';
import ConfirmModal from '../components/ConfirmModal';
import AiModelList from '../components/ai/AiModelList';
import AiAddModel from '../components/ai/AiAddModel';
import AiModelDetail from '../components/ai/AiModelDetail';
import QuizConfigPanel from '../components/QuizConfig';
import { buildPrompt, DEFAULT_QUIZ_CONFIG, loadQuizConfig, saveQuizConfig } from '../lib/quizPrompt';
import type { QuizConfig } from '../lib/quizPrompt';

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
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [theme, setTheme] = useState<Theme>('mint');
  const [darkMode, setDarkMode] = useState(false);
  const [dictationEnabled, setDictationEnabled] = useState(true);
  const [algorithm, setAlgorithm] = useState('sm2');
  const [fsrsRetention, setFsrsRetention] = useState('0.90');
  const [fsrsMaxInterval, setFsrsMaxInterval] = useState('36500');
  const [fsrsParams, setFsrsParams] = useState('');
  const [showFsrsAdvanced, setShowFsrsAdvanced] = useState(false);
  const [platform, setPlatform] = useState('unknown');
  const [japaneseTtsAvailable, setJapaneseTtsAvailable] = useState(true);

  const [aiView, setAiView] = useState<'list' | 'add' | 'detail'>('list');
  const [aiEditIndex, setAiEditIndex] = useState<number>(-1);
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    getPlatform().then(async (p) => {
      setPlatform(p);
      if (p === 'windows') {
        const ok = await checkNativeTtsVoice('ja').catch(() => false);
        setJapaneseTtsAvailable(ok);
      }
    }).catch(() => undefined);
    (async () => {
      const url = await getSetting('tts_ai_url');
      if (url) setTtsUrl(url);
      const key = await getSetting('tts_ai_key');
      if (key) setTtsKey(key);
      const voice = await getSetting('tts_ai_voice');
      if (voice) setTtsVoice(voice);
      const model = await getSetting('tts_ai_model');
      if (model) setTtsModel(model);
      const savedQuizConfig = await loadQuizConfig();
      setQuizConfig(savedQuizConfig);
      const savedLang = await getSetting('lang');
      if (savedLang === 'en' || savedLang === 'zh' || savedLang === 'zh-TW' || savedLang === 'ja' || savedLang === 'ko') {
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

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 2000);
  }

  async function saveSettings() {
    await setSetting('tts_ai_url', ttsUrl);
    await setSetting('tts_ai_key', ttsKey);
    await setSetting('tts_ai_voice', ttsVoice);
    await setSetting('tts_ai_model', ttsModel);
    showToast(t('toast.saved'));
  }

  function handleLangChange(newLang: Lang) {
    setLangState(newLang);
    setLang(newLang);
    setSetting('lang', newLang);
  }

  async function handleThemeChange(newTheme: Theme) {
    setTheme(newTheme);
    await setSetting('theme', newTheme);
    try { localStorage.setItem('mintword_theme', newTheme); } catch { /* ignore */ }
  }

  async function handleDarkMode(val: boolean) {
    setDarkMode(val);
    await setSetting('dark_mode', val.toString());
    try { localStorage.setItem('mintword_dark_mode', val.toString()); } catch { /* ignore */ }
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
    { id: 'data', label: t('settings.data_management') },
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
                <button
                  onClick={() => handleLangChange('ja')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    lang === 'ja'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  日本語
                </button>
                <button
                  onClick={() => handleLangChange('ko')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    lang === 'ko'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  한국어
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

              {platform === 'windows' && !japaneseTtsAvailable && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-xs text-yellow-800 dark:text-yellow-200">
                  {t('tts.no_japanese_voice')}
                </div>
              )}
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
            {aiView === 'list' && (
              <>
                <section className="space-y-4">
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t('ai.added_models')}
                  </h2>
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4">
                    <AiModelList
                      onAddModel={() => setAiView('add')}
                      onEditModel={(idx) => { setAiEditIndex(idx); setAiView('detail'); }}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {t('ai.quiz_settings')}
                  </h2>
                  <QuizConfigPanel
                    config={quizConfig}
                    onChange={(newConfig) => {
                      setQuizConfig(newConfig);
                      saveQuizConfig(newConfig);
                      const prompt = buildPrompt(newConfig);
                      setAiPrompt(prompt);
                    }}
                  />
                </section>
              </>
            )}
            {aiView === 'add' && (
              <AiAddModel
                onBack={() => setAiView('list')}
                onSaved={() => setAiView('list')}
              />
            )}
            {aiView === 'detail' && aiEditIndex >= 0 && (
              <AiModelDetail
                modelIndex={aiEditIndex}
                onBack={() => setAiView('list')}
                onSaved={() => setAiView('list')}
                onDeleted={() => setAiView('list')}
              />
            )}
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
                    showToast(t('toast.saved'));
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
                            showToast(t('toast.saved'));
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
                            showToast(t('toast.saved'));
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
                            showToast(t('toast.saved'));
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

        {activeSection === 'data' && (
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('settings.data_management')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.clear_cache_desc')}</p>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('settings.clear_learning_progress')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.clear_learning_progress_desc')}</div>
                </div>
                <button
                  onClick={() => setConfirmModal({
                    title: t('settings.clear_learning_progress'),
                    message: t('confirm.clear_learning_progress'),
                    confirmLabel: t('settings.clear_learning_progress'),
                    onConfirm: async () => {
                      await clearLearningProgress();
                      showToast(t('toast.cache_cleared'));
                    },
                  })}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('settings.clear_learning_progress')}
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('settings.clear_review_logs')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.clear_review_logs_desc')}</div>
                </div>
                <button
                  onClick={() => setConfirmModal({
                    title: t('settings.clear_review_logs'),
                    message: t('confirm.clear_review_logs'),
                    confirmLabel: t('settings.clear_review_logs'),
                    onConfirm: async () => {
                      await clearReviewLogs();
                      showToast(t('toast.cache_cleared'));
                    },
                  })}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('settings.clear_review_logs')}
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('settings.clear_settings')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.clear_settings_desc')}</div>
                </div>
                <button
                  onClick={() => setConfirmModal({
                    title: t('settings.clear_settings'),
                    message: t('confirm.clear_settings'),
                    confirmLabel: t('settings.clear_settings'),
                    onConfirm: async () => {
                      await clearSettings();
                      showToast(t('toast.cache_cleared'));
                    },
                  })}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('settings.clear_settings')}
                </button>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('settings.clear_all')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('settings.clear_all_desc')}</div>
                </div>
                <button
                  onClick={() => setConfirmModal({
                    title: t('settings.clear_all'),
                    message: t('confirm.clear_all'),
                    confirmLabel: t('settings.clear_all'),
                    onConfirm: async () => {
                      await clearAllCache();
                      showToast(t('toast.cache_cleared'));
                    },
                  })}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('settings.clear_all')}
                </button>
              </div>
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

        <div
          className={`fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-sm shadow-lg z-40 transition-all duration-300 ease-out ${
            toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          {toast.message}
        </div>
      </div>

      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title ?? ''}
        message={confirmModal?.message ?? ''}
        confirmLabel={confirmModal?.confirmLabel ?? ''}
        confirmDanger
        onConfirm={() => {
          confirmModal?.onConfirm();
          setConfirmModal(null);
        }}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
