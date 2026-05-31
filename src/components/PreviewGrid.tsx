import { useState, useEffect, useCallback } from 'react';
import { t } from '../lib/i18n';
import type { StudyCard } from '../types';

interface PreviewGridProps {
  cards: StudyCard[];
  onBack: () => void;
}

export default function PreviewGrid({ cards, onBack }: PreviewGridProps) {
  const cols = 4;
  const rows = 5;
  const [focusIndex, setFocusIndex] = useState(0);

  const moveFocus = useCallback((dr: number, dc: number) => {
    setFocusIndex(prev => {
      const row = Math.floor(prev / cols);
      const col = prev % cols;
      const newRow = Math.max(0, Math.min(rows - 1, row + dr));
      const newCol = Math.max(0, Math.min(cols - 1, col + dc));
      return newRow * cols + newCol;
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      switch (e.key) {
        case 'ArrowUp': moveFocus(-1, 0); break;
        case 'ArrowDown': moveFocus(1, 0); break;
        case 'ArrowLeft': moveFocus(0, -1); break;
        case 'ArrowRight': moveFocus(0, 1); break;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveFocus]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('study.quick_preview')}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.back')}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: rows * cols }).map((_, idx) => {
          const card = cards[idx];
          const isFocused = idx === focusIndex;
          const hasCard = idx < cards.length;
          return (
            <div
              key={idx}
              onClick={() => setFocusIndex(idx)}
              className={`
                border-2 rounded-lg p-3 h-[104px] flex flex-col items-center justify-center
                transition-all duration-150 cursor-pointer text-center select-none overflow-hidden
                ${isFocused
                  ? 'border-primary bg-primary-light/20 dark:bg-primary-dark/20 shadow-md'
                  : hasCard
                    ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                    : 'border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50'
                }
              `}
            >
              {hasCard ? (
                <>
                  <div className="font-semibold text-sm leading-tight break-words max-w-full">
                    {card.front}
                  </div>
                  {isFocused && (
                    <div className="mt-1.5 text-xs text-gray-600 dark:text-gray-400 leading-tight break-words max-w-full line-clamp-3">
                      {card.back}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-gray-300 dark:text-gray-700 text-xs">—</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
