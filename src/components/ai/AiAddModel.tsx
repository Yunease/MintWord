import { useEffect, useMemo, useRef, useState } from 'react';
import { ProviderAvatar } from '../ProviderAvatar';
import TooltipIcon from '../TooltipIcon';
import { t } from '../../lib/i18n';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import {
  completeDeviceCodeLogin,
  getChatgptLoginUrl,
  getSetting,
  requestDeviceCode,
  setSetting,
  testAiConfig,
} from '../../lib/api';
import { PROVIDERS, getProviderById, getEffectiveUrl, getFilteredModels, type AiProvider } from '../../lib/aiProviders';
import type { ProviderConfig } from '../../types';
import Select from '../Select';

type FilterTab = 'all' | 'api' | 'mainland' | 'aggregator' | 'coding-plan' | 'custom';

const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
  { id: 'all', labelKey: 'ai.filter_all' },
  { id: 'api', labelKey: 'ai.filter_api' },
  { id: 'mainland', labelKey: 'ai.filter_mainland' },
  { id: 'aggregator', labelKey: 'ai.filter_aggregator' },
  { id: 'coding-plan', labelKey: 'ai.filter_coding_plan' },
  { id: 'custom', labelKey: 'ai.filter_custom' },
];

const THINKING_LEVELS: { id: string; labelKey: string }[] = [
  { id: 'off', labelKey: 'ai.thinking_off' },
  { id: 'low', labelKey: 'ai.thinking_low' },
  { id: 'medium', labelKey: 'ai.thinking_medium' },
  { id: 'high', labelKey: 'ai.thinking_high' },
  { id: 'xhigh', labelKey: 'ai.thinking_xhigh' },
  { id: 'max', labelKey: 'ai.thinking_max' },
];

interface AiAddModelProps {
  onBack: () => void;
  onSaved: () => void;
}

export default function AiAddModel({ onBack, onSaved }: AiAddModelProps) {
  const [providerId, setProviderId] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [thinkingEffort, setThinkingEffort] = useState('off');
  const [showKey, setShowKey] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false);
  const [providerSearch, setProviderSearch] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [subOptionValues, setSubOptionValues] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Device code login state
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceAuthId, setDeviceAuthId] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [isDeviceCodeLoading, setIsDeviceCodeLoading] = useState(false);
  const [deviceCodeError, setDeviceCodeError] = useState('');
  const [chatgptLoginUrl, setChatgptLoginUrl] = useState('');
  const [isChatgptLoginUrlLoading, setIsChatgptLoginUrlLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  const [maxTokens, setMaxTokens] = useState('4096');
  const [temperature, setTemperature] = useState('0.7');
  const [topP, setTopP] = useState('1');
  const [topK, setTopK] = useState('0');
  const [frequencyPenalty, setFrequencyPenalty] = useState('0');
  const [presencePenalty, setPresencePenalty] = useState('0');
  const [repetitionPenalty, setRepetitionPenalty] = useState('1');
  const [thinkingBudget, setThinkingBudget] = useState('10000');

  const selectedProvider = providerId ? getProviderById(providerId) : undefined;
  const isCustomModel = modelId === '__custom__';
  const effectiveModelId = isCustomModel ? customModelId : modelId;

  const selectedModel = useMemo(() => {
    if (!selectedProvider || !effectiveModelId) return undefined;
    return selectedProvider.models.find((m) => m.id === effectiveModelId);
  }, [selectedProvider, effectiveModelId]);

  const supportedParams = selectedModel?.supportedParams ?? [];

  const filteredModels = useMemo(() => {
    if (!selectedProvider) return [];
    return getFilteredModels(selectedProvider, subOptionValues);
  }, [selectedProvider, subOptionValues]);

  const filteredProviders = useMemo(() => {
    return PROVIDERS.filter((p) => {
      if (activeFilter === 'all') return true;
      return p.categories.includes(activeFilter);
    }).filter((p) => {
      if (!providerSearch) return true;
      return t(p.displayNameKey).toLowerCase().includes(providerSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(providerSearch.toLowerCase());
    });
  }, [activeFilter, providerSearch]);

  function handleProviderSelect(provider: AiProvider) {
    setProviderId(provider.id);
    // Initialize sub-option values with defaults
    const initialSubOpts: Record<string, string> = {};
    if (provider.subOptions) {
      for (const so of provider.subOptions) {
        initialSubOpts[so.id] = so.defaultValue;
      }
    }
    setSubOptionValues(initialSubOpts);
    // Set URL based on sub-options or base URL
    const effectiveUrl = getEffectiveUrl(provider, initialSubOpts);
    setUrl(effectiveUrl);
    setModelId('');
    setCustomModelId('');
    setModelName('');
    setProviderDropdownOpen(false);
    setProviderSearch('');
  }

  function handleModelSelect(value: string) {
    setModelId(value);
    if (value === '__custom__') {
      setModelName('');
    } else if (selectedProvider) {
      const m = filteredModels.find((mod) => mod.id === value);
      if (m) setModelName(m.displayName);
    }
  }

  function handleSubOptionChange(optionId: string, value: string) {
    const newValues = { ...subOptionValues, [optionId]: value };
    setSubOptionValues(newValues);
    // Update URL if this sub-option affects it
    if (selectedProvider) {
      const effectiveUrl = getEffectiveUrl(selectedProvider, newValues);
      setUrl(effectiveUrl);
    }
    // Reset model if sub-option affects models
    const subOpt = selectedProvider?.subOptions?.find((so) => so.id === optionId);
    if (subOpt?.affectsModels) {
      setModelId('');
      setCustomModelId('');
      setModelName('');
    }
  }

  // Get current login method from sub-options
  const currentLoginMethod = subOptionValues['loginMethod'] || 'url';

  useEffect(() => {
    if (!copySuccess) return undefined;
    const timer = setTimeout(() => setCopySuccess(''), 1200);
    return () => clearTimeout(timer);
  }, [copySuccess]);

  async function ensureChatgptLoginUrl(): Promise<string> {
    if (chatgptLoginUrl) return chatgptLoginUrl;
    setIsChatgptLoginUrlLoading(true);
    try {
      const authUrl = await getChatgptLoginUrl();
      setChatgptLoginUrl(authUrl);
      return authUrl;
    } finally {
      setIsChatgptLoginUrlLoading(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopySuccess(t('common.copied'));
  }
  
  // Handle URL login - open external link
  async function handleUrlLogin() {
    if (selectedProvider?.id === 'chatgpt-plus') {
      try {
        const authUrl = await ensureChatgptLoginUrl();
        await openExternal(authUrl);
      } catch (error) {
        setDeviceCodeError(`Failed to open login URL: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Handle device code login
  async function handleDeviceCodeLogin() {
    if (!selectedProvider || selectedProvider.id !== 'chatgpt-plus') return;
    
    setIsDeviceCodeLoading(true);
    setDeviceCodeError('');
    setDeviceCode('');
    setDeviceAuthId('');
    setVerificationUrl('');
    
    try {
      // Call Rust backend to get device code
      const result = await requestDeviceCode();
      if (result) {
        setDeviceCode(result.user_code);
        setDeviceAuthId(result.device_auth_id);
        setVerificationUrl(result.verification_url);
      }
    } catch (error) {
      setDeviceCodeError(`Failed to get device code: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeviceCodeLoading(false);
    }
  }

  // Handle device code completion
  async function handleDeviceCodeComplete() {
    if (!deviceCode) return;
    
    try {
      const accessToken = await completeDeviceCodeLogin({
        user_code: deviceCode,
        verification_url: verificationUrl,
        device_auth_id: deviceAuthId,
        interval: 5
      });
      setApiKey(accessToken);
      setTestResult(t('ai.device_code_success'));
    } catch (error) {
      setDeviceCodeError(`Device code login failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function handleSave() {
    // Determine apiMode based on provider and sub-options
    let apiMode = selectedProvider?.apiMode ?? 'chat_completions';
    if (selectedProvider?.id === 'fully-custom' && subOptionValues['apiMode'] === 'anthropic') {
      apiMode = 'anthropic_messages';
    }

    const config: ProviderConfig = {
      providerId,
      url: url || selectedProvider?.baseUrl || '',
      apiKey,
      modelId: effectiveModelId,
      modelName: modelName || effectiveModelId,
      apiMode,
    };
    if (thinkingEffort !== 'off') config.thinkingEffort = thinkingEffort;
    if (supportedParams.includes('maxTokens') && maxTokens) config.maxTokens = parseInt(maxTokens, 10);
    if (supportedParams.includes('temperature') && temperature) config.temperature = parseFloat(temperature);
    if (supportedParams.includes('topP') && topP) config.topP = parseFloat(topP);
    if (supportedParams.includes('topK') && topK) config.topK = parseInt(topK, 10);
    if (supportedParams.includes('frequencyPenalty') && frequencyPenalty) config.frequencyPenalty = parseFloat(frequencyPenalty);
    if (supportedParams.includes('presencePenalty') && presencePenalty) config.presencePenalty = parseFloat(presencePenalty);
    if (supportedParams.includes('repetitionPenalty') && repetitionPenalty) config.repetitionPenalty = parseFloat(repetitionPenalty);
    if (supportedParams.includes('thinkingBudget') && thinkingBudget) config.thinkingBudget = parseInt(thinkingBudget, 10);
    if (Object.keys(subOptionValues).length > 0) config.subOptionValues = subOptionValues;

    const raw = await getSetting('ai_provider_config_list');
    let list: ProviderConfig[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch { /* empty */ }
    }
    list.push(config);
    await setSetting('ai_provider_config_list', JSON.stringify(list));
    onSaved();
  }

  async function handleTest() {
    if (!apiKey) return;
    setTesting(true);
    setTestResult('');

    // Determine apiMode based on provider and sub-options
    let apiMode = selectedProvider?.apiMode ?? 'chat_completions';
    if (selectedProvider?.id === 'fully-custom' && subOptionValues['apiMode'] === 'anthropic') {
      apiMode = 'anthropic_messages';
    }

    const config: ProviderConfig = {
      providerId,
      url: url || selectedProvider?.baseUrl || '',
      apiKey,
      modelId: effectiveModelId,
      modelName: modelName || effectiveModelId,
      apiMode,
    };
    try {
      const result = await testAiConfig(config);
      setTestResult(result);
    } catch (e) {
      setTestResult(`${t('settings.ai_test_fail')}: ${e}`);
    }
    setTesting(false);
  }

  const canSave = providerId && apiKey && effectiveModelId;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          &larr; {t('common.back')}
        </button>
        <h2 className="text-base font-medium">{t('ai.add_model')}</h2>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-4">
        {/* Provider Selector */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.provider')}</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
              className="w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow flex items-center gap-2"
            >
              {selectedProvider ? (
                <>
                  <ProviderAvatar iconKey={selectedProvider.iconKey} size={18} />
                  <span>{t(selectedProvider.displayNameKey)}</span>
                </>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">{t('ai.provider_select')}</span>
              )}
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {providerDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex gap-1 px-2 pt-2 border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                        activeFilter === tab.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t(tab.labelKey)}
                    </button>
                  ))}
                </div>
                <div className="px-2 py-1.5">
                  <input
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder={t('common.search') + '...'}
                    className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <ul className="max-h-60 overflow-auto py-1">
                  {filteredProviders.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => handleProviderSelect(p)}
                      className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm transition-colors ${
                        p.id === providerId
                          ? 'bg-primary-light text-primary-dark font-medium'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      <ProviderAvatar iconKey={p.iconKey} size={18} />
                      <span>{t(p.displayNameKey)}</span>
                    </li>
                  ))}
                  {filteredProviders.length === 0 && (
                    <li className="px-3 py-4 text-center text-sm text-gray-400">—</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* URL */}
        {selectedProvider && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.url')}<TooltipIcon text={t('ai.url_tip')} /></label>
            {selectedProvider.urlEditable ? (
              <>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={selectedProvider.baseUrl}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {selectedProvider.id === 'fully-custom'
                    ? t('ai.url_hint_fully_custom')
                    : t(selectedProvider.apiMode === 'anthropic_messages' ? 'ai.url_hint_anthropic' : 'ai.url_hint_openai')}
                </p>
              </>
            ) : (
              <div className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
                {url}
              </div>
            )}
          </div>
        )}

        {/* Sub-Options */}
        {selectedProvider?.subOptions && selectedProvider.subOptions.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {selectedProvider.subOptions.map((so) => (
              <Select
                key={so.id}
                label={t(so.labelKey)}
                value={subOptionValues[so.id] ?? so.defaultValue}
                onChange={(val) => handleSubOptionChange(so.id, val)}
                options={so.options.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }))}
              />
            ))}
          </div>
        )}

        {/* API Key / Login Methods */}
        {selectedProvider && (
          <div>
            {/* URL Login */}
            {selectedProvider.id === 'chatgpt-plus' && currentLoginMethod === 'url' && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.login_method_url')}</label>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm font-medium mb-2">{t('ai.login_url_title')}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={chatgptLoginUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex-1 truncate"
                        onClick={async (e) => {
                          if (!chatgptLoginUrl) {
                            e.preventDefault();
                            await handleUrlLogin();
                          }
                        }}
                      >
                        {chatgptLoginUrl || (isChatgptLoginUrlLoading ? '...' : t('ai.login_url_button'))}
                      </a>
                      <button
                        onClick={async () => {
                          try {
                            const authUrl = await ensureChatgptLoginUrl();
                            await copyText(authUrl);
                          } catch (error) {
                            setDeviceCodeError(`Failed to copy login URL: ${error instanceof Error ? error.message : String(error)}`);
                          }
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        {t('common.copy')}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleUrlLogin}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
                  >
                    {t('ai.login_url_button')}
                  </button>
                  <p className="text-xs text-gray-400">{t('ai.login_url_hint')}</p>
                  {copySuccess && (
                    <p className="text-xs text-green-600 mt-1">{copySuccess}</p>
                  )}
                </div>
              </div>
            )}

            {/* Device Code Login */}
            {selectedProvider.id === 'chatgpt-plus' && currentLoginMethod === 'device' && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.login_method_device')}</label>
                {!deviceCode ? (
                  <button
                    onClick={handleDeviceCodeLogin}
                    disabled={isDeviceCodeLoading}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    {isDeviceCodeLoading ? '...' : t('ai.login_device_button')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium mb-2">{t('ai.device_code_title')}</p>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-2 bg-white dark:bg-gray-700 rounded border text-lg font-mono font-bold tracking-wider">
                          {deviceCode}
                        </code>
                        <button
                          onClick={() => copyText(deviceCode)}
                          className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          {t('common.copy')}
                        </button>
                      </div>
                    </div>
                    {verificationUrl && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.device_code_url')}</p>
                        <a
                          href={verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {verificationUrl}
                        </a>
                      </div>
                    )}
                    <button
                      onClick={handleDeviceCodeComplete}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                    >
                      {t('ai.device_code_complete')}
                    </button>
                  </div>
                )}
                {deviceCodeError && (
                  <p className="text-xs text-red-500 mt-1">{deviceCodeError}</p>
                )}
                {copySuccess && (
                  <p className="text-xs text-green-600 mt-1">{copySuccess}</p>
                )}
              </div>
            )}

            {/* API Key Input */}
            {(selectedProvider.id !== 'chatgpt-plus' || currentLoginMethod === 'api') && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.key')}<TooltipIcon text={t('ai.key_tip')} /></label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {showKey ? t('ai.key_hide') : t('ai.key_show')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Model ID */}
        {selectedProvider && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.model_id')}<TooltipIcon text={t('ai.model_id_tip')} /></label>
            <Select
              value={modelId}
              onChange={handleModelSelect}
              options={[
                ...filteredModels.map((m) => ({ value: m.id, label: m.displayName })),
                { value: '__custom__', label: t('ai.model_custom') },
              ]}
              placeholder={t('ai.model_id')}
            />
            {isCustomModel && (
              <input
                value={customModelId}
                onChange={(e) => {
                  setCustomModelId(e.target.value);
                  if (!modelName) setModelName(e.target.value);
                }}
                placeholder={t('ai.model_custom_hint')}
                className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
        )}

        {/* Model Name */}
        {selectedProvider && modelId && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.model_name')}</label>
            <input
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {/* Thinking Effort */}
        {selectedModel?.thinkingSupport && selectedModel.thinkingLevels && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.thinking_effort')}<TooltipIcon text={t('ai.thinking_effort_tip')} /></label>
            <div className="flex gap-2 flex-wrap">
              {THINKING_LEVELS.filter((l) => l.id === 'off' || selectedModel.thinkingLevels?.includes(l.id)).map((level) => (
                <button
                  key={level.id}
                  onClick={() => setThinkingEffort(level.id)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    thinkingEffort === level.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {t(level.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        {selectedModel && supportedParams.length > 0 && (
          <div>
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${advancedOpen ? 'rotate-90' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
              {t('ai.advanced_settings')}
            </button>
            {advancedOpen && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {supportedParams.includes('maxTokens') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.max_tokens')}<TooltipIcon text={t('ai.max_tokens_tip')} /></label>
                    <input
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('temperature') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.temperature')}<TooltipIcon text={t('ai.temperature_tip')} /></label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('topP') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.top_p')}<TooltipIcon text={t('ai.top_p_tip')} /></label>
                    <input
                      type="number"
                      step="0.1"
                      value={topP}
                      onChange={(e) => setTopP(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('topK') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.top_k')}<TooltipIcon text={t('ai.top_k_tip')} /></label>
                    <input
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('frequencyPenalty') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.frequency_penalty')}<TooltipIcon text={t('ai.frequency_penalty_tip')} /></label>
                    <input
                      type="number"
                      step="0.1"
                      value={frequencyPenalty}
                      onChange={(e) => setFrequencyPenalty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('presencePenalty') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.presence_penalty')}<TooltipIcon text={t('ai.presence_penalty_tip')} /></label>
                    <input
                      type="number"
                      step="0.1"
                      value={presencePenalty}
                      onChange={(e) => setPresencePenalty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('repetitionPenalty') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.repetition_penalty')}<TooltipIcon text={t('ai.repetition_penalty_tip')} /></label>
                    <input
                      type="number"
                      step="0.1"
                      value={repetitionPenalty}
                      onChange={(e) => setRepetitionPenalty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
                {supportedParams.includes('thinkingBudget') && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.thinking_budget')}<TooltipIcon text={t('ai.thinking_budget_tip')} /></label>
                    <input
                      type="number"
                      value={thinkingBudget}
                      onChange={(e) => setThinkingBudget(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {selectedProvider && (
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {t('ai.save_config')}
            </button>
            <button
              onClick={handleTest}
              disabled={!apiKey || testing}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {testing ? '...' : t('ai.test_connection')}
            </button>
          </div>
        )}

        {testResult && (
          <div className={`text-xs ${testResult.includes('成功') || testResult.includes('success') || testResult.includes('正常') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
