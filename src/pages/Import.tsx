import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { open } from '@tauri-apps/plugin-dialog';
import { Link, useSearchParams } from 'react-router-dom';
import { getDecks, previewImportFile, importDeckFile, bulkAddCards } from '../lib/api';
import { t } from '../lib/i18n';
import Select from '../components/Select';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import type { ImportReport, ImportPreview, FieldMappingSelection } from '../types';

type ImportPhase =
  | { kind: 'idle' }
  | { kind: 'previewing' }
  | { kind: 'preview'; filePath: string; preview: ImportPreview }
  | { kind: 'importing' }
  | { kind: 'done'; report: ImportReport }
  | { kind: 'error'; message: string };

export default function ImportPage() {
  const queryClient = useQueryClient();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
  const [searchParams] = useSearchParams();
  const [selectedDeck, setSelectedDeck] = useState(searchParams.get('deckId') ?? '');
  const [bulkText, setBulkText] = useState('');
  const [phase, setPhase] = useState<ImportPhase>({ kind: 'idle' });
  const [mapping, setMapping] = useState<FieldMappingSelection>(emptyMapping());
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const previewRef = useRef<{ filePath: string; preview: ImportPreview } | null>(null);

  function showToast(msg: string) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2000);
  }

  async function handleSelectFile() {
    const filePath = await open({
      filters: [{ name: 'Deck Files', extensions: ['csv', 'apkg'] }],
      multiple: false,
    });
    if (!filePath) return;

    setPhase({ kind: 'previewing' });
    try {
      const preview = await previewImportFile(filePath as string);
      previewRef.current = { filePath: filePath as string, preview };
      setMapping(preview.smart_mapping);
      setPhase({ kind: 'preview', filePath: filePath as string, preview });
    } catch (error) {
      setPhase({ kind: 'error', message: error instanceof Error ? error.message : t('error.import_failed') });
    }
  }

  function handleConfirm() {
    if (!previewRef.current) return;
    setPhase({ kind: 'importing' });

    importDeckFile(selectedDeck, previewRef.current.filePath, mapping)
      .then((report) => {
        setPhase({ kind: 'done', report });
        showToast(t('toast.imported', { n: report.imported_count }));
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        queryClient.invalidateQueries({ queryKey: ['cards', selectedDeck] });
      })
      .catch((error) => {
        setPhase({ kind: 'error', message: error instanceof Error ? error.message : t('error.import_failed') });
      });
  }

  const bulkMut = useMutation({
    mutationFn: () => bulkAddCards(selectedDeck, bulkText),
    onSuccess: (count) => {
      showToast(t('toast.imported', { n: count }));
      setBulkText('');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['cards', selectedDeck] });
    },
    onError: () => setPhase({ kind: 'error', message: t('error.import_failed') }),
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/decks" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeftIcon className="w-4 h-4 inline" /> {t('common.back')}
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
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('import.file_hint')}</p>

        {phase.kind === 'previewing' && (
          <StatusBox>{t('import.status_previewing')}</StatusBox>
        )}
        {phase.kind === 'importing' && (
          <StatusBox>{t('import.status_importing')}</StatusBox>
        )}
        {phase.kind === 'error' && (
          <div className="text-sm text-center text-red-600 dark:text-red-400 py-2">{phase.message}</div>
        )}

        <button
          onClick={handleSelectFile}
          disabled={!selectedDeck || phase.kind === 'previewing' || phase.kind === 'importing'}
          className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {t('file.select_deck_file')}
        </button>
      </div>

      {phase.kind === 'done' && <ImportReportCard report={phase.report} />}

      {phase.kind === 'preview' && (
        <ImportModal
          filePath={phase.filePath}
          preview={phase.preview}
          mapping={mapping}
          onChangeMapping={setMapping}
          onConfirm={handleConfirm}
          onClose={() => setPhase({ kind: 'idle' })}
        />
      )}

      <div className="border-t border-border pt-6 space-y-3">
        <h2 className="font-medium">{t('card.bulk_add')}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('card.bulk_hint')}</p>
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

      <div
        className={`fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg text-sm shadow-lg z-40 transition-all duration-300 ease-out ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}

function StatusBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300">
      <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" />
      </svg>
      {children}
    </div>
  );
}

function ImportModal({
  filePath,
  preview,
  mapping,
  onChangeMapping,
  onConfirm,
  onClose,
}: {
  filePath: string;
  preview: ImportPreview;
  mapping: FieldMappingSelection;
  onChangeMapping: (m: FieldMappingSelection) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const colOptions = preview.columns.map((c) => ({ value: c, label: c }));
  const noneOpt = { value: '', label: t('import.map_none') };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto mx-4">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {t('import.preview_title', { format: preview.source_format.toUpperCase(), n: preview.total_rows })}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{filePath}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 w-8 h-8 shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="space-y-3">
            <MappingRow
              label={t('import.field_front')}
              value={mapping.front ?? ''}
              onChange={(v) => onChangeMapping({ ...mapping, front: v || null })}
              options={colOptions}
              noneOpt={noneOpt}
              required
            />
            <MappingRow
              label={t('import.field_back')}
              value={mapping.back ?? ''}
              onChange={(v) => onChangeMapping({ ...mapping, back: v || null })}
              options={colOptions}
              noneOpt={noneOpt}
              required
            />
            <MappingRow
              label={t('import.field_phonetic')}
              value={mapping.phonetic ?? ''}
              onChange={(v) => onChangeMapping({ ...mapping, phonetic: v || null })}
              options={colOptions}
              noneOpt={noneOpt}
            />
            <MappingRow
              label={t('import.field_example')}
              value={mapping.example_sentence ?? ''}
              onChange={(v) => onChangeMapping({ ...mapping, example_sentence: v || null })}
              options={colOptions}
              noneOpt={noneOpt}
            />
          </div>

          {preview.sample_rows.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {t('import.preview_sample')}
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      {preview.columns.map((col) => (
                        <th key={col} className="border-b border-gray-200 dark:border-gray-700 px-2.5 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample_rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} className="border-b border-gray-100 dark:border-gray-800 px-2.5 py-1.5 max-w-[160px] truncate text-gray-700 dark:text-gray-300">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={!mapping.front || !mapping.back}
            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {t('common.confirm_import')}
          </button>
        </div>
      </div>
    </div>
  );
}

function MappingRow({
  label,
  value,
  onChange,
  options,
  noneOpt,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  noneOpt: { value: string; label: string };
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`w-20 shrink-0 text-xs ${required ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
        {required && <span className="text-red-500 mr-0.5">*</span>}{label}
      </span>
      <div className="flex-1">
        <Select
          value={value}
          onChange={onChange}
          placeholder={noneOpt.label}
          options={[noneOpt, ...options]}
        />
      </div>
    </div>
  );
}

function ImportReportCard({ report }: { report: ImportReport }) {
  return (
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
  );
}

function emptyMapping(): FieldMappingSelection {
  return { front: null, back: null, phonetic: null, example_sentence: null };
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
