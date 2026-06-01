import { useState, useEffect } from 'react';
import { ProviderIcon } from '@lobehub/icons';
import { t } from '../../lib/i18n';
import { getSetting, setSetting } from '../../lib/api';
import { getProviderById } from '../../lib/aiProviders';
import type { ProviderCategory } from '../../lib/aiProviders';
import type { ProviderConfig } from '../../types';

type FilterTab = 'all' | ProviderCategory;

const FILTER_TABS: { id: FilterTab; labelKey: string }[] = [
  { id: 'all', labelKey: 'ai.filter_all' },
  { id: 'api', labelKey: 'ai.filter_api' },
  { id: 'mainland', labelKey: 'ai.filter_mainland' },
  { id: 'aggregator', labelKey: 'ai.filter_aggregator' },
  { id: 'coding-plan', labelKey: 'ai.filter_coding_plan' },
];

interface AiModelListProps {
  onAddModel: () => void;
  onEditModel: (index: number) => void;
}

export default function AiModelList({ onAddModel, onEditModel }: AiModelListProps) {
  const [models, setModels] = useState<ProviderConfig[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = await getSetting('ai_provider_config_list');
      if (cancelled) return;
      if (raw) {
        try {
          setModels(JSON.parse(raw));
        } catch {
          setModels([]);
        }
      } else {
        setModels([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredIndices = models
    .map((m, i) => ({ model: m, index: i }))
    .filter(({ model }) => {
      if (activeFilter === 'all') return true;
      const provider = getProviderById(model.providerId);
      if (!provider) return true;
      return provider.categories.includes(activeFilter);
    });

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    const remaining = models.filter((_, i) => !selected.has(i));
    await setSetting('ai_provider_config_list', JSON.stringify(remaining));
    setSelected(new Set());
    setModels(remaining);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">{t('ai.model_list')}</h2>
        <button
          onClick={onAddModel}
          className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          + {t('ai.add_model')}
        </button>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeFilter === tab.id
                ? 'border-primary text-primary font-medium'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="text-sm text-red-600 dark:text-red-400">
            {t('ai.selected_count', { n: selected.size })}
          </span>
          <button
            onClick={handleBatchDelete}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
          >
            {t('ai.batch_delete')}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {filteredIndices.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
          {t('ai.no_models')}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIndices.map(({ model, index }) => {
            const provider = getProviderById(model.providerId);
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => onEditModel(index)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(index)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(index);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded accent-primary shrink-0"
                />
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <ProviderIcon provider={provider?.iconKey ?? model.providerId} size={24} type="avatar" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{model.modelName}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {model.modelId} · {provider ? t(provider.displayNameKey) : model.providerId}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
