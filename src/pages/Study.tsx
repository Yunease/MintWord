import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getStudyCards, submitReviewSimple, updateCardNotes, speakText, speakAi, stopTts, exportSessionCsv, getSetting, generateAiExample } from '../lib/api';
import { t } from '../lib/i18n';
import { useStudyTimer } from '../hooks/useStudyTimer';

import type { StudyCard, SessionResult, AiExample } from '../types';
import { save } from '@tauri-apps/plugin-dialog';
import PreviewGrid from '../components/PreviewGrid';

export default function Study() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<StudyCard[]>([]);
  const [originalCards, setOriginalCards] = useState<StudyCard[]>([]);
  const [cardModes, setCardModes] = useState<Record<string, 'recall' | 'dictation'>>({});
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [notes, setNotes] = useState('');
  const [playedTts, setPlayedTts] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [aiExampleEnabled, setAiExampleEnabled] = useState(false);
  const [aiExample, setAiExample] = useState<AiExample | null>(null);
  const [aiExampleLoading, setAiExampleLoading] = useState(false);
  const [aiExampleError, setAiExampleError] = useState<string | null>(null);
  const aiExampleCache = useRef<Map<string, AiExample>>(new Map());
  const setTimerActive = useStudyTimer();
  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: fetched, isLoading } = useQuery({
    queryKey: ['study', id],
    queryFn: () => getStudyCards(id!, 20),
    enabled: !!id,
  });

  useEffect(() => {
    if (fetched) {
      (async () => {
        const dictation = await getSetting('dictation_enabled');
        const allow = dictation !== 'false';
        const aiExample = await getSetting('ai_example_enabled');
        setAiExampleEnabled(aiExample === 'true');
        const total = fetched.length;

        let modeArray: ('recall' | 'dictation')[];
        if (!allow) {
          modeArray = Array(total).fill('recall' as const);
        } else {
          const half = Math.ceil(total / 2);
          modeArray = [
            ...Array(half).fill('recall' as const),
            ...Array(total - half).fill('dictation' as const),
          ];
          for (let i = modeArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [modeArray[i], modeArray[j]] = [modeArray[j], modeArray[i]];
          }
        }
        const modesMap: Record<string, 'recall' | 'dictation'> = {};
        fetched.forEach((card, i) => { modesMap[card.id] = modeArray[i]; });

        setQueue([...fetched]);
        setOriginalCards(fetched);
        setCardModes(modesMap);
        setFlipped(false);
        setDone(total === 0);
        setResults([]);
        setPlayedTts(false);
        setUserInput('');
      })();
    }
  }, [fetched]);

  const current = queue[0];

  useEffect(() => {
    // Reset local card state when current card changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(current?.notes || '');
    setPlayedTts(false);
    setUserInput('');
    setAiExample(null);
    setAiExampleError(null);
    setAiExampleLoading(false);
    stopTts().catch(() => {});
  }, [current]);

  useEffect(() => {
    if (!current || !aiExampleEnabled) return;
    const cached = aiExampleCache.current.get(current.id);
    if (cached) {
      setAiExample(cached);
      return;
    }
    setAiExampleLoading(true);
    generateAiExample(current.front, current.language_to)
      .then((result) => {
        aiExampleCache.current.set(current.id, result);
        setAiExample(result);
      })
      .catch((err) => {
        console.error('AI example generation failed:', err);
        setAiExampleError(String(err));
        setAiExample(null);
      })
      .finally(() => {
        setAiExampleLoading(false);
      });
  }, [current, aiExampleEnabled]);

  // Anti-AFK: pause study timer after 20s of inactivity on same card
  useEffect(() => {
    if (!current) return;
    setTimerActive(true);
    if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    afkTimerRef.current = setTimeout(() => {
      setTimerActive(false);
    }, 20000);
    return () => {
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    };
  }, [current, setTimerActive]);

  // When user flips, clear AFK timer and resume study timer
  useEffect(() => {
    if (flipped) {
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
      setTimerActive(true);
    }
  }, [flipped, setTimerActive]);

  useEffect(() => {
    if (!current || playedTts || flipped) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayedTts(true);
    const timer = setTimeout(() => {
      speakCurrent();
    }, 200);
    return () => clearTimeout(timer);
    // speakCurrent is intentionally excluded: it is recreated each render and
    // including it would re-arm the TTS timer on every parent update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, flipped]);

  useEffect(() => {
    if (current && cardModes[current.id] === 'dictation' && !flipped) {
      inputRef.current?.focus();
    }
  }, [current, cardModes, flipped]);

  useEffect(() => {
    if (queue.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
    }
  }, [queue]);

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
      await speakText(current.front, current.language_from);
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
    advance(rating < 2);
    // advance is intentionally excluded: it only calls state setters and
    // depends on `queue`; including it would force needless callback churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    advance(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, notes]);

  function advance(requeue: boolean) {
    setQueue(prev => {
      const next = prev.slice(1);
      if (requeue && prev[0]) {
        next.push(prev[0]);
      }
      return next;
    });
    setFlipped(false);
    setUserInput('');
    setPlayedTts(false);
    queryClient.invalidateQueries({ queryKey: ['stats'] });
  }

  function handleDictationSubmit() {
    if (!current || flipped) return;
    setFlipped(true);
    setPlayedTts(true);
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

      if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        speakCurrent();
        return;
      }

      if (!flipped && current) {
        if (cardModes[current.id] === 'recall') {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setFlipped(true);
          }
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
    // speakCurrent is intentionally excluded: it is recreated each render and
    // does not need to retrigger listener re-registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, handleRating, handleMastered, cardModes, current]);

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400">{t('study.no_cards')}</div>;
  }

  if (done && previewMode) {
    return <PreviewGrid cards={originalCards} onBack={() => setPreviewMode(false)} />;
  }

  if (done) {
    const masteredCount = results.filter(r => r.mastered || r.rating >= 2).length;
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="text-4xl">🎉</div>
        <p className="text-xl font-bold">{t('study.session_summary')}</p>
        <p className="text-gray-500 dark:text-gray-400">
          {t('study.session_stats', { n: originalCards.length, mastered: masteredCount })}
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
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => setPreviewMode(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors font-medium"
          >
            {t('study.quick_preview')}
          </button>
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

  const isCorrect = current && userInput.trim().toLowerCase() === current.front.toLowerCase();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-300">
          &larr; {t('common.back')}
        </Link>
        <span className="text-xs text-primary font-medium">
          {current && cardModes[current.id] === 'dictation' ? t('study.dictation') : t('study.mode_recall')}
        </span>
        <span className="tabular-nums">
          {originalCards.length - queue.length + 1} / {originalCards.length}
        </span>
      </div>

      <div
        onClick={() => {
          if (current && cardModes[current.id] === 'recall' && !flipped) setFlipped(true);
        }}
        className="cursor-pointer min-h-[280px] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-center p-8 select-none"
      >
        {current && cardModes[current.id] === 'dictation' && !flipped ? (
          <div className="w-full space-y-5">
            <div className="text-center space-y-3">
              <div className="text-xs text-primary font-medium">{t('study.dictation')}</div>
              {current.phonetic && (
                <div className="text-base text-gray-400 dark:text-gray-500">/{current.phonetic}/</div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); speakCurrent(); }}
                className="text-sm text-primary hover:text-primary-hover transition-colors"
              >
                🔊 {t('study.replay')}
              </button>
            </div>
            <input
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleDictationSubmit();
                }
              }}
              placeholder={t('study.dictation_placeholder')}
              className="w-full px-4 py-3 border-2 border-primary/50 focus:border-primary rounded-xl bg-gray-50 dark:bg-gray-800 text-xl text-center font-medium focus:outline-none transition-colors"
            />
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {t('study.dictation_hint')}
            </div>
          </div>
        ) : current && cardModes[current.id] === 'dictation' && flipped ? (
          <div className="w-full space-y-4">
            <div className="text-center">
              <div className="text-xs text-primary font-medium mb-2">{t('study.dictation')}</div>
              <div className="text-3xl font-bold">{current.front}</div>
              {current.phonetic && (
                <div className="text-base text-gray-400 dark:text-gray-500">/{current.phonetic}/</div>
              )}
            </div>
            <div className="text-center">
              <span className={`inline-block px-4 py-2 rounded-lg text-sm font-medium ${
                isCorrect
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {isCorrect ? '✓ ' + t('study.dictation_correct') : '✗ ' + t('study.dictation_wrong', { word: current.front })}
              </span>
            </div>
            {!isCorrect && userInput && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                {t('study.your_input')}: <span className="line-through">{userInput}</span>
              </div>
            )}
            <div className="text-lg text-center whitespace-pre-line leading-relaxed">{current.back}</div>
            {current.example_sentence && (
              <div className="text-sm text-gray-400 dark:text-gray-500 italic text-center whitespace-pre-line">
                {current.example_sentence}
              </div>
            )}
            {aiExampleLoading && (
              <div className="text-center text-xs text-gray-400 py-1">{t('study.ai_example_loading')}</div>
            )}
            {aiExampleError && !aiExampleLoading && (
              <div className="text-center text-xs text-red-400 py-1">{aiExampleError}</div>
            )}
            {aiExample && (
              <div className="text-center">
                <div className="text-sm text-gray-700 dark:text-gray-300 italic">{aiExample.sentence}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{aiExample.translation}</div>
              </div>
            )}
          </div>
        ) : !flipped ? (
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
              {t('study.flip')}
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
              <div className="text-sm text-gray-400 dark:text-gray-500 italic text-center whitespace-pre-line">
                {current.example_sentence}
              </div>
            )}
            {aiExampleLoading && (
              <div className="text-center text-xs text-gray-400 py-1">{t('study.ai_example_loading')}</div>
            )}
            {aiExampleError && !aiExampleLoading && (
              <div className="text-center text-xs text-red-400 py-1">{aiExampleError}</div>
            )}
            {aiExample && (
              <div className="text-center">
                <div className="text-sm text-gray-700 dark:text-gray-300 italic">{aiExample.sentence}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{aiExample.translation}</div>
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
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {t('study.forgot')}
            </button>
            <button
              onClick={() => handleRating(1)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {t('study.hazy')}
            </button>
            <button
              onClick={() => handleRating(2)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {t('study.remembered')}
            </button>
          </div>
          <button
            onClick={handleMastered}
            className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-medium transition-colors"
          >
            {t('study.mastered')}
          </button>
        </>
      )}
    </div>
  );
}
