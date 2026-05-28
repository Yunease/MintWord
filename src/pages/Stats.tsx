import { useQuery } from '@tanstack/react-query';
import { getStats, getHeatmapData } from '../lib/api';
import { t } from '../lib/i18n';
import type { HeatmapDay } from '../types';

export default function Stats() {
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
  const { data: heatmap } = useQuery({ queryKey: ['heatmap'], queryFn: getHeatmapData });

  if (!stats) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>;
  }

  const items = [
    { label: t('stats.total_cards'), value: stats.total_cards, color: 'bg-blue-500' },
    { label: t('stats.due_today'), value: stats.due_today, color: 'bg-orange-500' },
    { label: t('stats.studied_today'), value: stats.studied_today, color: 'bg-green-500' },
    { label: t('stats.new_today'), value: stats.new_today, color: 'bg-purple-500' },
  ];

  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('nav.stats')}</h1>

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-border p-5 space-y-3"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
            <div className="text-3xl font-bold tabular-nums">{item.value}</div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                style={{ width: `${(item.value / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {heatmap && <HeatmapChart data={heatmap} />}
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
    if (intensity <= 0.25) return 'bg-green-200 dark:bg-green-900';
    if (intensity <= 0.5) return 'bg-green-400 dark:bg-green-700';
    if (intensity <= 0.75) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  }

  const weeks: typeof days[] = [];
  for (let w = 0; w < 52; w++) {
    weeks.push(days.slice(w * 7, (w + 1) * 7));
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4">
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
