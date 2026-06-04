import { useState } from 'react';
import Select from './Select';
import TooltipIcon from './TooltipIcon';
import { t } from '../lib/i18n';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import {
  type CompositionConfig,
  getCompositionDefaultTemplate,
  getCompositionDifficultyOptions,
} from '../lib/compositionPrompt';

interface CompositionReviewConfigProps {
  config: CompositionConfig;
  onChange: (config: CompositionConfig) => void;
  showReviewButton?: boolean;
  reviewing?: boolean;
  onReview?: () => void;
  showDifficulty?: boolean;
  showPrompt?: boolean;
}

export default function CompositionReviewConfig({
  config,
  onChange,
  showReviewButton = false,
  reviewing = false,
  onReview,
  showDifficulty = true,
  showPrompt = true,
}: CompositionReviewConfigProps) {
  const [expanded, setExpanded] = useState(false);
  const difficultyOptions = getCompositionDifficultyOptions();

  function update(partial: Partial<CompositionConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-4">
      {showDifficulty && (
        <Select
          label={
            <span>
              {t('composition.review_difficulty')}
              <TooltipIcon text={t('composition.review_difficulty_tip')} />
            </span>
          }
          value={config.difficulty}
          onChange={(val) => update({ difficulty: val })}
          options={difficultyOptions}
        />
      )}

      {showPrompt && (
        <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary hover:underline flex items-center gap-1 pt-2"
          >
            {expanded ? t('composition.collapse_prompt') : t('composition.expand_prompt')}
            {expanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </button>

          <div
            className="grid transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
            style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-2">
                  <span>
                    {'{difficulty}'}
                    <TooltipIcon text={t('composition.prompt_variable_difficulty')} />
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => update({ customPrompt: '' })}
                  className="text-xs text-primary hover:underline"
                >
                  {t('composition.prompt_reset')}
                </button>
              </div>
              <textarea
                value={config.customPrompt || getCompositionDefaultTemplate()}
                onChange={(e) => update({ customPrompt: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
              />
              <p className="text-xs text-gray-400">
                {t('composition.prompt_desc')}
              </p>
              {config.customPrompt ? (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t('composition.prompt_security_hint')}
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  {t('composition.prompt_edit_hint')}
                </p>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {showReviewButton && onReview && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onReview}
            disabled={reviewing}
            className="w-full px-6 py-2.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium"
          >
            {reviewing ? t('composition.reviewing') : t('composition.review_button')}
          </button>
        </div>
      )}
    </div>
  );
}
