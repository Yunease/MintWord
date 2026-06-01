import { useState, useMemo, useEffect } from 'react';
import { ProviderAvatar } from '../ProviderAvatar';
import { t } from '../../lib/i18n';
import { getSetting, setSetting, testAiConfig } from '../../lib/api';
import { getProviderById, getEffectiveUrl, getFilteredModels } from '../../lib/aiProviders';
import type { ProviderConfig } from '../../types';
import Select from '../Select';

const THINKING_LEVELS: { id: string; labelKey: string }[] = [
  { id: 'off', labelKey: 'ai.thinking_off' },
  { id: 'low', labelKey: 'ai.thinking_low' },
  { id: 'medium', labelKey: 'ai.thinking_medium' },
  { id: 'high', labelKey: 'ai.thinking_high' },
  { id: 'xhigh', labelKey: 'ai.thinking_xhigh' },
  { id: 'max', labelKey: 'ai.thinking_max' },
];

interface AiModelDetailProps {
  modelIndex: number;
  onBack: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function AiModelDetail({ modelIndex, onBack, onSaved, onDeleted }: AiModelDetailProps) {
  const [config, setConfig] = useState<ProviderConfig | null>(null);
  const [providerId, setProviderId] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [thinkingEffort, setThinkingEffort] = useState('off');
  const [showKey, setShowKey] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  const [maxTokens, setMaxTokens] = useState('4096');
  const [temperature, setTemperature] = useState('0.7');
  const [topP, setTopP] = useState('1');
  const [topK, setTopK] = useState('0');
  const [frequencyPenalty, setFrequencyPenalty] = useState('0');
  const [presencePenalty, setPresencePenalty] = useState('0');
  const [repetitionPenalty, setRepetitionPenalty] = useState('1');
  const [thinkingBudget, setThinkingBudget] = useState('10000');
  const [subOptionValues, setSubOptionValues] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const raw = await getSetting('ai_provider_config_list');
      if (!raw) return;
      try {
        const list: ProviderConfig[] = JSON.parse(raw);
        const c = list[modelIndex];
        if (!c) return;
        setConfig(c);
        setProviderId(c.providerId);
        setUrl(c.url);
        setApiKey(c.apiKey);
        setModelId(c.modelId);
        setModelName(c.modelName);
        // If model is not a preset, set it as custom model ID
        const provider = getProviderById(c.providerId);
        if (provider && !provider.models.some((m) => m.id === c.modelId)) {
          setCustomModelId(c.modelId);
        }
        if (c.thinkingEffort) setThinkingEffort(c.thinkingEffort);
        if (c.maxTokens != null) setMaxTokens(String(c.maxTokens));
        if (c.temperature != null) setTemperature(String(c.temperature));
        if (c.topP != null) setTopP(String(c.topP));
        if (c.topK != null) setTopK(String(c.topK));
        if (c.frequencyPenalty != null) setFrequencyPenalty(String(c.frequencyPenalty));
        if (c.presencePenalty != null) setPresencePenalty(String(c.presencePenalty));
        if (c.repetitionPenalty != null) setRepetitionPenalty(String(c.repetitionPenalty));
        if (c.thinkingBudget != null) setThinkingBudget(String(c.thinkingBudget));
        // Restore sub-option values from saved config
        if (provider?.subOptions) {
          const restored: Record<string, string> = {};
          for (const so of provider.subOptions) {
            restored[so.id] = c.subOptionValues?.[so.id] ?? so.defaultValue;
          }
          setSubOptionValues(restored);
        }
      } catch { /* empty */ }
    })();
  }, [modelIndex]);

  const selectedProvider = providerId ? getProviderById(providerId) : undefined;

  const filteredModels = useMemo(() => {
    if (!selectedProvider) return [];
    return getFilteredModels(selectedProvider, subOptionValues);
  }, [selectedProvider, subOptionValues]);

  const isPresetModel = useMemo(() => {
    if (!selectedProvider) return false;
    return filteredModels.some((m) => m.id === modelId);
  }, [selectedProvider, filteredModels, modelId]);

  const isCustomModel = !isPresetModel;
  const effectiveModelId = isCustomModel ? customModelId || modelId : modelId;

  const selectedModel = useMemo(() => {
    if (!selectedProvider || !effectiveModelId) return undefined;
    return selectedProvider.models.find((m) => m.id === effectiveModelId);
  }, [selectedProvider, effectiveModelId]);

  const supportedParams = selectedModel?.supportedParams ?? [];

  async function handleSave() {
    const updated: ProviderConfig = {
      providerId,
      url: url || selectedProvider?.baseUrl || '',
      apiKey,
      modelId: effectiveModelId,
      modelName: modelName || effectiveModelId,
      apiMode: selectedProvider?.apiMode ?? 'chat_completions',
    };
    if (thinkingEffort !== 'off') updated.thinkingEffort = thinkingEffort;
    if (supportedParams.includes('maxTokens') && maxTokens) updated.maxTokens = parseInt(maxTokens, 10);
    if (supportedParams.includes('temperature') && temperature) updated.temperature = parseFloat(temperature);
    if (supportedParams.includes('topP') && topP) updated.topP = parseFloat(topP);
    if (supportedParams.includes('topK') && topK) updated.topK = parseInt(topK, 10);
    if (supportedParams.includes('frequencyPenalty') && frequencyPenalty) updated.frequencyPenalty = parseFloat(frequencyPenalty);
    if (supportedParams.includes('presencePenalty') && presencePenalty) updated.presencePenalty = parseFloat(presencePenalty);
    if (supportedParams.includes('repetitionPenalty') && repetitionPenalty) updated.repetitionPenalty = parseFloat(repetitionPenalty);
    if (supportedParams.includes('thinkingBudget') && thinkingBudget) updated.thinkingBudget = parseInt(thinkingBudget, 10);
    if (Object.keys(subOptionValues).length > 0) updated.subOptionValues = subOptionValues;

    const raw = await getSetting('ai_provider_config_list');
    let list: ProviderConfig[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch { /* empty */ }
    }
    list[modelIndex] = updated;
    await setSetting('ai_provider_config_list', JSON.stringify(list));
    onSaved();
  }

  async function handleDelete() {
    const raw = await getSetting('ai_provider_config_list');
    let list: ProviderConfig[] = [];
    if (raw) {
      try { list = JSON.parse(raw); } catch { /* empty */ }
    }
    list.splice(modelIndex, 1);
    await setSetting('ai_provider_config_list', JSON.stringify(list));
    onDeleted();
  }

  async function handleTest() {
    if (!apiKey) return;
    setTesting(true);
    setTestResult('');
    const testConfig: ProviderConfig = {
      providerId,
      url: url || selectedProvider?.baseUrl || '',
      apiKey,
      modelId: effectiveModelId,
      modelName: modelName || effectiveModelId,
      apiMode: selectedProvider?.apiMode ?? 'chat_completions',
    };
    try {
      const result = await testAiConfig(testConfig);
      setTestResult(result);
    } catch (e) {
      setTestResult(`${t('settings.ai_test_fail')}: ${e}`);
    }
    setTesting(false);
  }

  function handleModelSelect(value: string) {
    if (value === '__custom__') {
      setCustomModelId(modelId);
      setModelName('');
    } else if (selectedProvider) {
      const m = filteredModels.find((mod) => mod.id === value);
      if (m) {
        setModelId(value);
        setModelName(m.displayName);
        setCustomModelId('');
      }
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

  if (!config) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
          >
            &larr; {t('common.back')}
          </button>
          <h2 className="text-base font-medium">{t('ai.model_detail')}</h2>
        </div>
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
          >
            &larr; {t('common.back')}
          </button>
          <h2 className="text-base font-medium">{t('ai.model_detail')}</h2>
        </div>
        <button
          onClick={handleDelete}
          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          {t('common.delete')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-4">
        {/* Provider (read-only display) */}
        {selectedProvider && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.provider')}</label>
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800/50">
              <ProviderAvatar iconKey={selectedProvider.iconKey} size={18} />
              <span className="text-sm">{t(selectedProvider.displayNameKey)}</span>
            </div>
          </div>
        )}

        {/* URL */}
        {selectedProvider && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.url')}</label>
            {selectedProvider.urlEditable ? (
              <>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={selectedProvider.baseUrl}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-gray-400 mt-1">{t(selectedProvider.apiMode === 'anthropic_messages' ? 'ai.url_hint_anthropic' : 'ai.url_hint_openai')}</p>
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

        {/* API Key */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.key')}</label>
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

        {/* Model ID */}
        {selectedProvider && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.model_id')}</label>
            {isPresetModel ? (
              <Select
                value={modelId}
                onChange={handleModelSelect}
                options={[
                  ...filteredModels.map((m) => ({ value: m.id, label: m.displayName })),
                  { value: '__custom__', label: t('ai.model_custom') },
                ]}
              />
            ) : (
              <>
                <Select
                  value="__custom__"
                  onChange={handleModelSelect}
                  options={[
                    ...filteredModels.map((m) => ({ value: m.id, label: m.displayName })),
                    { value: '__custom__', label: t('ai.model_custom') },
                  ]}
                />
                <input
                  value={customModelId || modelId}
                  onChange={(e) => {
                    setCustomModelId(e.target.value);
                    setModelId(e.target.value);
                    if (!modelName) setModelName(e.target.value);
                  }}
                  placeholder={t('ai.model_custom_hint')}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </>
            )}
          </div>
        )}

        {/* Model Name */}
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.model_name')}</label>
          <input
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Thinking Effort */}
        {selectedModel?.thinkingSupport && selectedModel.thinkingLevels && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.thinking_effort')}</label>
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
        {supportedParams.length > 0 && (
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.max_tokens')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.temperature')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.top_p')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.top_k')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.frequency_penalty')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.presence_penalty')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.repetition_penalty')}</label>
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
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('ai.thinking_budget')}</label>
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
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
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

        {testResult && (
          <div className={`text-xs ${testResult.includes('成功') || testResult.includes('success') || testResult.includes('正常') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
