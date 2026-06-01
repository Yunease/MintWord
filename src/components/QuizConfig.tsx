import { useState } from 'react';
import Select from './Select';
import TooltipIcon from './TooltipIcon';
import { t } from '../lib/i18n';
import {
  type QuizConfig,
  getDifficultyOptions,
  getDefaultTemplate,
} from '../lib/quizPrompt';

interface QuizConfigPanelProps {
  config: QuizConfig;
  onChange: (config: QuizConfig) => void;
  showGenerateButton?: boolean;
  generating?: boolean;
  onGenerate?: () => void;
}

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors text-sm"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors text-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}

function QuizConfigPanel({
  config,
  onChange,
  showGenerateButton = false,
  generating = false,
  onGenerate,
}: QuizConfigPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const difficultyOptions = getDifficultyOptions();

  function update(partial: Partial<QuizConfig>) {
    onChange({ ...config, ...partial });
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('ai.quiz_settings')}
        </h3>
      </div>

      <Select
        label={
          <span>
            {t('ai.quiz_difficulty')}
            <TooltipIcon text={t('ai.quiz_difficulty_tip')} />
          </span>
        }
        value={config.difficulty}
        onChange={(val) => update({ difficulty: val })}
        options={difficultyOptions}
      />

      <div className="grid grid-cols-2 gap-4">
        <NumberStepper
          label={
            <span>
              {t('ai.quiz_question_count')}
              <TooltipIcon text={t('ai.quiz_question_count_tip')} />
            </span>
          }
          value={config.questionCount}
          min={1}
          max={10}
          onChange={(v) => update({ questionCount: v })}
        />
        <NumberStepper
          label={
            <span>
              {t('ai.quiz_option_count')}
              <TooltipIcon text={t('ai.quiz_option_count_tip')} />
            </span>
          }
          value={config.optionCount}
          min={2}
          max={6}
          onChange={(v) => update({ optionCount: v })}
        />
      </div>

      <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline flex items-center gap-1 pt-2"
        >
          {expanded ? t('ai.quiz_collapse_prompt') : t('ai.quiz_expand_prompt')}
          <span className="text-[10px]">{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center gap-2">
                <span>
                  {'{difficulty}'}
                  <TooltipIcon text={t('ai.quiz_variable_difficulty')} />
                </span>
                <span>
                  {'{questionCount}'}
                  <TooltipIcon text={t('ai.quiz_variable_question_count')} />
                </span>
                <span>
                  {'{optionCount}'}
                  <TooltipIcon text={t('ai.quiz_variable_option_count')} />
                </span>
                <span>
                  {'{optionLetters}'}
                  <TooltipIcon text={t('ai.quiz_variable_option_letters')} />
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  update({ customPrompt: '' });
                }}
                className="text-xs text-primary hover:underline"
              >
                {t('ai.prompt_reset')}
              </button>
            </div>
            <textarea
              value={config.customPrompt ? config.customPrompt : getDefaultTemplate()}
              onChange={(e) => {
                update({ customPrompt: e.target.value });
              }}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
            />
            <p className="text-xs text-gray-400">
              {t('ai.prompt_desc')}
            </p>
            {config.customPrompt ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('ai.prompt_security_hint')}
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                {t('ai.prompt_edit_hint')}
              </p>
            )}
          </div>
        )}
      </div>

      {showGenerateButton && onGenerate && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="w-full px-6 py-2.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium"
          >
            {generating ? t('library.generating') : t('library.generate')}
          </button>
        </div>
      )}
    </div>
  );
}

export default QuizConfigPanel;
