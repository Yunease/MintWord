import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getDecks, getStats, getHeatmapData, getDeckDueCount } from '../lib/api';
import { t } from '../lib/i18n';
import type { HeatmapDay } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
  const { data: heatmap } = useQuery({ queryKey: ['heatmap'], queryFn: getHeatmapData });
  const { data: dueCounts } = useQuery({ queryKey: ['dueCounts'], queryFn: getDeckDueCount });

  const builtin = decks?.filter((d) => d.id.startsWith('builtin-')) ?? [];
  const custom = decks?.filter((d) => !d.id.startsWith('builtin-')) ?? [];

  async function handleQuickStart() {
    if (!dueCounts || dueCounts.length === 0) return;
    const best = dueCounts.sort((a, b) => b[1] - a[1])[0];
    navigate(`/study/${best[0]}`);
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('stats.due_today')} value={stats.due_today} />
          <StatCard label={t('stats.studied_today')} value={stats.studied_today} />
          <StatCard label={t('stats.new_today')} value={stats.new_today} />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleQuickStart}
          disabled={!dueCounts || dueCounts.length === 0}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
        >
          {t('study.start_quick')}
          <span className="block text-xs opacity-70 mt-0.5">{t('study.quick_start_hint')}</span>
        </button>
      </div>

      <HeatmapChart data={heatmap ?? []} />

      <DeckSection title={t('deck.builtin')} list={builtin} />
      <DeckSection title={t('deck.custom')} list={custom} />

      {(!decks || decks.length === 0) && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-lg">{t('deck.empty')}</p>
          <div className="mt-4 flex gap-3 justify-center">
            <Link to="/decks" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              {t('deck.create')}
            </Link>
            <Link to="/import" className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
              {t('deck.import_csv')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

function DeckSection({ title, list }: { title: string; list: ReturnType<typeof getDecks> extends Promise<infer T> ? T : never }) {
  if (!list || list.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
        {title}
      </h2>
      <div className="grid gap-2">
        {list.map((deck: any) => (
          <Link
            key={deck.id}
            to={`/study/${deck.id}`}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
          >
            <div>
              <div className="font-medium">{deck.name}</div>
              {deck.description && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{deck.description}</div>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
              {deck.card_count} 词
            </div>
          </Link>
        ))}
      </div>
    </section>
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
    if (intensity <= 0.25) return 'bg-green-200 dark:bg-green-900';
    if (intensity <= 0.5) return 'bg-green-400 dark:bg-green-700';
    if (intensity <= 0.75) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  }

  const weeks: typeof days[] = [];
  for (let w = 0; w < 52; w++) {
    weeks.push(days.slice(w * 7, (w + 1) * 7));
  }

  const months: string[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week[0]?.date;
    if (firstDay) {
      const month = firstDay.getMonth();
      if (month !== lastMonth) {
        months.push(firstDay.toLocaleDateString('en', { month: 'short' }));
        lastMonth = month;
      } else {
        months.push('');
      }
    } else {
      months.push('');
    }
  });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
        {t('stats.heatmap')}
      </h3>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5" style={{ minWidth: 728 }}>
          <div className="flex flex-col gap-0.5 mr-1 text-[8px] text-gray-400">
            {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => (
              <div key={i} className="h-[10px] leading-[10px]">{l}</div>
            ))}
          </div>
          <div className="flex gap-0.5">
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
      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 justify-end">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`w-[10px] h-[10px] rounded-sm ${getColor(Math.round((i / 4) * maxCount))}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
