import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getStudyCards, submitReviewSimple, updateCardNotes, speakText, speakAi, exportSessionCsv, getSetting } from '../lib/api';
import { t } from '../lib/i18n';
import type { StudyCard, SessionResult } from '../types';
import { save } from '@tauri-apps/plugin-dialog';

export default function Study() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [notes, setNotes] = useState('');
  const [playedTts, setPlayedTts] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const { data: fetched, isLoading } = useQuery({
    queryKey: ['study', id],
    queryFn: () => getStudyCards(id!, 20),
    enabled: !!id,
  });

  useEffect(() => {
    if (fetched) {
      setCards(fetched);
      setIndex(0);
      setFlipped(false);
      setDone(fetched.length === 0);
      setResults([]);
      setPlayedTts(false);
    }
  }, [fetched]);

  const current = cards[index];

  useEffect(() => {
    setNotes(current?.notes || '');
    setPlayedTts(false);
  }, [current]);

  useEffect(() => {
    if (!current || playedTts || flipped) return;
    setPlayedTts(true);
    const timer = setTimeout(() => {
      speakCurrent();
    }, 200);
    return () => clearTimeout(timer);
  }, [current, flipped, playedTts]);

  async function speakCurrent() {
    if (!current) return;
    try {
      const aiUrl = await getSetting('tts_ai_url');
      if (aiUrl) {
        const apiKey = await getSetting('tts_ai_key');
        const voice = await getSetting('tts_ai_voice');
        const model = await getSetting('tts_ai_model');
        if (apiKey && voice && model) {
          await speakAi(current.front, aiUrl, apiKey, voice, model);
          return;
        }
      }
      await speakText(current.front);
    } catch { /* ignore TTS errors */ }
  }

  const handleRating = useCallback(async (rating: number) => {
    if (!current) return;
    const mastered = false;
    await submitReviewSimple(current.id, rating, mastered);
    if (notes !== (current.notes || '')) {
      await updateCardNotes(current.id, notes);
    }
    setResults(prev => [...prev, { card_id: current.id, front: current.front, back: current.back, rating, mastered }]);
    advance();
  }, [current, notes]);

  const handleMastered = useCallback(async () => {
    if (!current) return;
    const rating = 2;
    const mastered = true;
    await submitReviewSimple(current.id, rating, mastered);
    if (notes !== (current.notes || '')) {
      await updateCardNotes(current.id, notes);
    }
    setResults(prev => [...prev, { card_id: current.id, front: current.front, back: current.back, rating, mastered }]);
    advance();
  }, [current, notes]);

  function advance() {
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
    }
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  }

  async function handleExportCsv() {
    if (!id) return;
    try {
      const filePath = await save({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        defaultPath: `vocabsprint-session-${Date.now()}.csv`,
      });
      if (!filePath) return;
      await exportSessionCsv(id, results, filePath);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (done) return;
      if (!flipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setFlipped(true);
        }
        return;
      }
      if (e.key === '1') handleRating(0);
      if (e.key === '2') handleRating(1);
      if (e.key === '3') handleRating(2);
      if (e.key === 'm' || e.key === 'M') handleMastered();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flipped, done, handleRating, handleMastered]);

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400">{t('study.no_cards')}</div>;
  }

  if (done) {
    const masteredCount = results.filter(r => r.mastered).length;
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="text-4xl">🎉</div>
        <p className="text-xl font-bold">{t('study.session_summary')}</p>
        <p className="text-gray-500 dark:text-gray-400">
          {t('study.session_stats', { n: results.length, mastered: masteredCount })}
        </p>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">
              <span className="font-medium">{r.front}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {r.mastered ? '✦ ' : ''}
                {r.rating === 0 ? t('study.forgot') : r.rating === 1 ? t('study.hazy') : t('study.remembered')}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            {t('common.export')} CSV
          </button>
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            {t('study.back_home')}
          </Link>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-lg text-gray-400">{t('study.no_cards')}</p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          {t('common.back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-300">
          &larr; {t('common.back')}
        </Link>
        <span className="tabular-nums">
          {index + 1} / {cards.length}
        </span>
      </div>

      <div
        onClick={() => !flipped && setFlipped(true)}
        className="cursor-pointer min-h-[280px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center p-8 select-none"
      >
        {!flipped ? (
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold">{current.front}</div>
            {current.phonetic && (
              <div className="text-lg text-gray-400 dark:text-gray-500">/{current.phonetic}/</div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); speakCurrent(); }}
              className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              🔊
            </button>
            <div className="text-sm text-gray-400 dark:text-gray-500 mt-4">
              {t('study.flip')} (Space/Enter)
            </div>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="text-center">
              <div className="text-xl font-bold">{current.front}</div>
              {current.phonetic && (
                <div className="text-base text-gray-400 dark:text-gray-500">/{current.phonetic}/</div>
              )}
            </div>
            <div className="text-lg text-center whitespace-pre-line leading-relaxed">{current.back}</div>
            {current.example_sentence && (
              <div className="text-sm text-gray-400 dark:text-gray-500 italic text-center">
                {current.example_sentence}
              </div>
            )}
            <textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('card.notes_placeholder')}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {flipped && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleRating(0)}
              className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {t('study.forgot')}
              <span className="block text-xs opacity-70 mt-0.5">1</span>
            </button>
            <button
              onClick={() => handleRating(1)}
              className="bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {t('study.hazy')}
              <span className="block text-xs opacity-70 mt-0.5">2</span>
            </button>
            <button
              onClick={() => handleRating(2)}
              className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {t('study.remembered')}
              <span className="block text-xs opacity-70 mt-0.5">3</span>
            </button>
          </div>
          <button
            onClick={handleMastered}
            className="w-full py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            title={t('study.mastered_hint')}
          >
            {t('study.mastered')} (M)
          </button>
        </>
      )}
    </div>
  );
}
