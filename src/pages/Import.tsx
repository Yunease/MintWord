import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { Link, useSearchParams } from 'react-router-dom';
import { getDecks, importDeckFile, bulkAddCards } from '../lib/api';
import { t } from '../lib/i18n';
import Select from '../components/Select';
import type { ImportReport } from '../types';

export default function ImportPage() {
  const queryClient = useQueryClient();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
  const [searchParams] = useSearchParams();
  const [selectedDeck, setSelectedDeck] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [message, setMessage] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);

  useEffect(() => {
    const deckId = searchParams.get('deckId');
    if (!deckId || !decks?.some((deck) => deck.id === deckId)) {
      return;
    }
    setSelectedDeck(deckId);
  }, [decks, searchParams]);

  const importMut = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        filters: [{ name: 'Deck Files', extensions: ['csv', 'apkg'] }],
        multiple: false,
      });
      if (!filePath) return null;
      return importDeckFile(selectedDeck, filePath as string);
    },
    onSuccess: (result) => {
      if (result !== null) {
        setReport(result);
        setMessage(t('toast.imported', { n: result.imported_count }));
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['cards', selectedDeck] });
      }
    },
    onError: (error) => {
      setReport(null);
      setMessage(error instanceof Error ? error.message : t('error.import_failed'));
    },
  });

  const bulkMut = useMutation({
    mutationFn: () => bulkAddCards(selectedDeck, bulkText),
    onSuccess: (count) => {
      setReport(null);
      setMessage(t('toast.imported', { n: count }));
      setBulkText('');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDeck] });
    },
    onError: () => setMessage(t('error.import_failed')),
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/decks" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          &larr; {t('common.back')}
        </Link>
        <h1 className="text-xl font-bold">{t('nav.import')}</h1>
      </div>

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
          {t('import.file_hint')}
        </p>
        <button
          onClick={() => importMut.mutate()}
          disabled={!selectedDeck || importMut.isPending}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {t('file.select_deck_file')}
        </button>
      </div>

      {report && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-100">
          <div className="font-medium">{t('import.report_title')}</div>
          <div className="text-emerald-700 dark:text-emerald-300">
            {t('import.report_total', { n: report.total_notes, imported: report.imported_count })}
          </div>
          {report.skipped_count > 0 && (
            <div className="text-amber-700 dark:text-amber-300">
              {t('import.report_skipped', { n: report.skipped_count })}
            </div>
          )}
          <hr className="border-emerald-200 dark:border-emerald-700" />
          <div>{t('import.report_format', { format: report.source_format.toUpperCase() })}</div>
          <div>{t('import.report_front', { fields: formatFieldList(report.matched_fields.front) })}</div>
          <div>{t('import.report_back', { fields: formatFieldList(report.matched_fields.back) })}</div>
          <div>{t('import.report_phonetic', { fields: formatFieldList(report.matched_fields.phonetic) })}</div>
          <div>{t('import.report_example', { fields: formatFieldList(report.matched_fields.example_sentence) })}</div>
          {report.missing_fields.length > 0 && (
            <div className="text-amber-700 dark:text-amber-300">
              {t('import.report_missing', { fields: report.missing_fields.map(fieldLabel).join(' / ') })}
            </div>
          )}
          {report.used_fallback_mapping && (
            <div className="text-amber-700 dark:text-amber-300">{t('import.report_fallback')}</div>
          )}
          <hr className="border-emerald-200 dark:border-emerald-700" />
          <div className="text-amber-700 dark:text-amber-300 font-medium">{t('import.not_imported')}</div>
          <ul className="list-disc list-inside text-amber-700 dark:text-amber-300 space-y-0.5">
            <li>{t('import.not_imported_media')}</li>
            <li>{t('import.not_imported_style')}</li>
            <li>{t('import.not_imported_image')}</li>
          </ul>
        </div>
      )}

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

function formatFieldList(fields: string[]): string {
  return fields.length > 0 ? fields.join(', ') : t('common.none');
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    front: t('import.field_front'),
    back: t('import.field_back'),
    phonetic: t('import.field_phonetic'),
    example_sentence: t('import.field_example'),
  };
  return labels[field] ?? field;
}
