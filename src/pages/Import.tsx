import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { getDecks, importCsvFile, bulkAddCards } from '../lib/api';
import { t } from '../lib/i18n';
import Select from '../components/Select';

export default function ImportPage() {
  const queryClient = useQueryClient();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
  const [selectedDeck, setSelectedDeck] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [message, setMessage] = useState('');

  const importMut = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        multiple: false,
      });
      if (!filePath) return null;
      const count = await importCsvFile(selectedDeck, filePath as string);
      return count;
    },
    onSuccess: (count) => {
      if (count !== null) {
        setMessage(t('toast.imported', { n: count }));
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['cards', selectedDeck] });
      }
    },
    onError: () => setMessage(t('error.import_failed')),
  });

  const bulkMut = useMutation({
    mutationFn: () => bulkAddCards(selectedDeck, bulkText),
    onSuccess: (count) => {
      setMessage(t('toast.imported', { n: count }));
      setBulkText('');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDeck] });
    },
    onError: () => setMessage(t('error.import_failed')),
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">{t('nav.import')}</h1>

      <div className="space-y-3">
        <Select
          label="选择目标词库"
          value={selectedDeck}
          onChange={setSelectedDeck}
          placeholder="-- 选择词库 --"
          options={
            decks?.map((d) => ({
              value: d.id,
              label: `${d.name} (${d.card_count} 词)`,
            })) ?? []
          }
        />
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">{t('deck.import_csv')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          CSV 格式：word,phonetic,translation（或 front,back）
        </p>
        <button
          onClick={() => importMut.mutate()}
          disabled={!selectedDeck || importMut.isPending}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {t('file.select_csv')}
        </button>
      </div>

      <div className="border-t border-border pt-6 space-y-3">
        <h2 className="font-medium">{t('card.bulk_add')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('card.bulk_hint')}
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={8}
          placeholder="abandon,放弃&#10;ability,能力，才能&#10;abnormal,反常的"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
        />
        <button
          onClick={() => bulkMut.mutate()}
          disabled={!selectedDeck || !bulkText.trim() || bulkMut.isPending}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {t('common.import')}
        </button>
      </div>

      {message && (
        <div className="text-sm text-center text-blue-600 dark:text-blue-400">{message}</div>
      )}
    </div>
  );
}
