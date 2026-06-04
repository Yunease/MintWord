import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStats, getStudyTimeRange, getStudyTimeDaily, getStudyStreak } from '../lib/api';
import { t } from '../lib/i18n';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { StudyTimeEntry } from '../types';
import { ClockIcon } from '@heroicons/react/24/outline';

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDate(d);
}

const today = () => toLocalDate(new Date());

export default function Stats() {
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly');
  const queryClient = useQueryClient();

  // Force refresh study time data on mount — the timer flushes on page exit
  // and may not have completed before this component queries.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['studyTime'] });
    queryClient.invalidateQueries({ queryKey: ['studyStreak'] });
  }, [queryClient]);

  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });

  const chartDays = chartMode === 'weekly' ? 6 : 29;
  const chartStart = daysAgo(chartDays);
  const chartEnd = today();

  const { data: todayMinutes } = useQuery({
    queryKey: ['studyTime', 'today'],
    queryFn: () => getStudyTimeRange(today(), today()),
  });

  const { data: weekMinutes } = useQuery({
    queryKey: ['studyTime', 'week'],
    queryFn: () => getStudyTimeRange(daysAgo(6), today()),
  });

  const { data: monthMinutes } = useQuery({
    queryKey: ['studyTime', 'month'],
    queryFn: () => getStudyTimeRange(daysAgo(29), today()),
  });

  const { data: streak } = useQuery({
    queryKey: ['studyStreak'],
    queryFn: getStudyStreak,
  });

  const { data: chartData } = useQuery({
    queryKey: ['studyTime', 'chart', chartDays],
    queryFn: () => getStudyTimeDaily(chartStart, chartEnd),
  });

  const chartEntries: StudyTimeEntry[] = chartData ?? [];

  const fullRange: { date: string; minutes: number }[] = [];
  for (let i = chartDays; i >= 0; i--) {
    const date = daysAgo(i);
    const found = chartEntries.find(e => e.date === date);
    fullRange.push({
      date,
      minutes: found ? +(found.seconds / 60).toFixed(1) : 0,
    });
  }

  if (!stats) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>;
  }

  const statItems = [
    { label: t('stats.total_cards'), value: stats.total_cards },
    { label: t('stats.due_today'), value: stats.due_today },
    { label: t('stats.studied_today'), value: stats.studied_today },
    { label: t('stats.new_today'), value: stats.new_today },
  ];

  const maxVal = Math.max(...statItems.map(i => i.value), 1);

  const timeCards = [
    { label: t('stats.study_time_today'), value: todayMinutes ?? 0 },
    { label: t('stats.study_time_week'), value: weekMinutes ?? 0 },
    { label: t('stats.study_time_month'), value: monthMinutes ?? 0 },
  ];

  const maxTime = Math.max(...timeCards.map(i => i.value), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('nav.stats')}</h1>

      {/* Streak card */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-5">
        <div className="flex items-center gap-3">
          <ClockIcon className="w-7 h-7 text-primary" />
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('stats.streak', { days: streak ?? 0 })}
            </div>
            <div className="text-3xl font-bold tabular-nums text-primary">{streak ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Study time cards */}
      <div className="grid grid-cols-3 gap-4">
        {timeCards.map((item) => (
          <div
            key={item.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-border p-5 space-y-3"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
            <div className="text-2xl font-bold tabular-nums text-primary">
              {t('stats.minutes', { minutes: (item.value / 60).toFixed(1) })}
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxTime) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('stats.study_time_month')}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setChartMode('weekly')}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                chartMode === 'weekly'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('stats.chart_weekly')}
            </button>
            <button
              onClick={() => setChartMode('monthly')}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${
                chartMode === 'monthly'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('stats.chart_monthly')}
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={fullRange}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              stroke="#9ca3af"
            />
            <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <Tooltip
              formatter={(value: number) => [`${value} min`, t('stats.study_time_month')]}
              labelFormatter={(label: string) => label}
            />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="var(--color-primary, #10b981)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Learn stat cards */}
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="bg-white dark:bg-gray-900 rounded-lg border border-border p-5 space-y-3"
          >
            <div className="text-sm text-gray-500 dark:text-gray-400">{item.label}</div>
            <div className="text-3xl font-bold tabular-nums text-primary">{item.value}</div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxVal) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
