import Select from './Select';
import TooltipIcon from './TooltipIcon';
import { t } from '../lib/i18n';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import {
  type QuizConfig,
  getDifficultyOptions,
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
          <MinusIcon className="w-4 h-4" />
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
          <PlusIcon className="w-4 h-4" />
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
