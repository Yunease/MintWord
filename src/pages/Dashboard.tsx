import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getStats, getHeatmapData, getSetting, getDecks } from '../lib/api';
import { t } from '../lib/i18n';
import type { HeatmapDay } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
  const { data: heatmap } = useQuery({ queryKey: ['heatmap'], queryFn: getHeatmapData });
  const { data: currentDeckId } = useQuery({
    queryKey: ['setting', 'current_deck_id'],
    queryFn: () => getSetting('current_deck_id'),
  });
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });

  const currentDeck = decks?.find(d => d.id === currentDeckId);

  function handleQuickStart() {
    if (!currentDeckId) {
      navigate('/decks');
    } else {
      navigate(`/study/${currentDeckId}`);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {stats && (
        <div className="grid grid-cols-3 gap-3 shrink-0">
          <StatCard label={t('stats.due_today')} value={stats.due_today} />
          <StatCard label={t('stats.studied_today')} value={stats.studied_today} />
          <StatCard label={t('stats.new_today')} value={stats.new_today} />
        </div>
      )}

      <div className="shrink-0 space-y-2">
        <button
          onClick={handleQuickStart}
          className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          {currentDeckId ? t('study.start_quick') : t('deck.select_hint')}
        </button>
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          {currentDeck
            ? currentDeck.name
            : t('deck.no_current_study')}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {heatmap && <HeatmapChart data={heatmap} />}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 text-center">
      <div className="text-2xl font-bold tabular-nums text-primary">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function HeatmapChart({ data }: { data: HeatmapDay[] }) {
  const dayMap = new Map<string, number>();
  data.forEach(d => dayMap.set(d.date, d.count));

  const today = new Date();
  const days: { date: Date; count: number }[] = [];
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, count: dayMap.get(key) || 0 });
  }

  const maxCount = Math.max(...days.map(d => d.count), 1);

  function getColor(count: number): string {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity <= 0.25) return 'bg-primary-light';
    if (intensity <= 0.5) return 'bg-primary/40';
    if (intensity <= 0.75) return 'bg-primary/70';
    return 'bg-primary';
  }

  const weeks: typeof days[] = [];
  for (let w = 0; w < 52; w++) {
    weeks.push(days.slice(w * 7, (w + 1) * 7));
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-lg border border-border p-4 flex flex-col">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide shrink-0">
        {t('stats.heatmap')}
      </h3>
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="flex gap-0.5">
          <div className="flex flex-col gap-0.5 mr-1 text-[8px] text-gray-400 shrink-0">
            {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => (
              <div key={i} className="h-[10px] leading-[10px]">{l}</div>
            ))}
          </div>
          <div className="flex gap-0.5 flex-wrap">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`w-[10px] h-[10px] rounded-sm ${getColor(day.count)}`}
                    title={`${day.date.toISOString().slice(0, 10)}: ${day.count}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
