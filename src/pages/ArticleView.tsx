import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getArticle, generateQuestions, generateQuestionsWithConfig, saveQuestions, getArticleQuestions, getSetting, getAiPrompt } from '../lib/api';
import { t } from '../lib/i18n';
import QuizConfigPanel from '../components/QuizConfig';
import { buildPrompt, DEFAULT_QUIZ_CONFIG, loadQuizConfig, saveQuizConfig } from '../lib/quizPrompt';
import type { Question, ProviderConfig } from '../types';
import type { QuizConfig } from '../lib/quizPrompt';

export default function ArticleView() {
  const { id } = useParams<{ id: string }>();
  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticle(id!),
    enabled: !!id,
  });

  const { data: savedQuestions } = useQuery({
    queryKey: ['articleQuestions', id],
    queryFn: () => getArticleQuestions(id!).catch(() => [] as Question[]),
    enabled: !!id,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [quizConfig, setQuizConfig] = useState<QuizConfig>(DEFAULT_QUIZ_CONFIG);

  const [readingMode, setReadingMode] = useState(false);
  const [dividerPos, setDividerPos] = useState(55);
  const dividerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    loadQuizConfig().then(setQuizConfig);
  }, []);

  useEffect(() => {
    if (savedQuestions && savedQuestions.length > 0) {
      setQuestions(savedQuestions); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [savedQuestions]);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      setDividerPos(Math.max(30, Math.min(80, (e.clientX / window.innerWidth) * 100)));
    }
    function onUp() { setDragging(false); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const genMut = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      setError('');
      saveQuizConfig(quizConfig);
      const customTemplate = await getAiPrompt().catch(() => '');
      const prompt = buildPrompt(quizConfig, customTemplate);
      const configListStr = await getSetting('ai_provider_config_list');
      if (configListStr) {
        try {
          const configList: ProviderConfig[] = JSON.parse(configListStr);
          if (configList.length > 0) {
            const config = configList[0];
            const qs = await generateQuestionsWithConfig(id!, config, prompt);
            await saveQuestions(id!, qs);
            return qs;
          }
        } catch { /* fall through */ }
      }
      const apiUrl = await getSetting('ai_api_url');
      const apiKey = await getSetting('ai_api_key');
      const model = await getSetting('ai_model');
      if (!apiKey) throw new Error(t('library.config_first'));
      const qs = await generateQuestions(id!, apiUrl || 'https://api.openai.com/v1', apiKey, model || 'gpt-4o-mini', prompt);
      await saveQuestions(id!, qs);
      return qs;
    },
    onSuccess: (qs) => {
      setQuestions(qs);
      setSelections({});
      setSubmitted(false);
      setGenerating(false);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : String(e));
      setGenerating(false);
    },
  });

  function handleSelect(qId: string, optIndex: number) {
    if (submitted) return;
    setSelections(prev => ({ ...prev, [qId]: optIndex }));
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  function handleRegenerate() {
    saveQuizConfig(quizConfig);
    genMut.mutate();
  }

  function renderQuestions() {
    return (
      <div className="space-y-8">
        {questions.map((q, qi) => (
          <div key={q.id} className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
            <div className="font-semibold text-base mb-4 leading-relaxed">{qi + 1}. {q.question}</div>
            <div className="space-y-3">
              {q.options.map((opt, oi) => {
                let className = 'flex items-center gap-3 px-4 py-3 rounded-lg text-base border cursor-pointer transition-colors ';
                if (!submitted) {
                  className += selections[q.id] === oi
                    ? 'border-primary bg-primary-light/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
                } else {
                  if (oi === q.answer) {
                    className += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                  } else if (oi === selections[q.id] && oi !== q.answer) {
                    className += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                  } else {
                    className += 'border-gray-200 dark:border-gray-700 opacity-60';
                  }
                }
                return (
                  <div key={oi} className={className} onClick={() => handleSelect(q.id, oi)}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={selections[q.id] === oi}
                      onChange={() => handleSelect(q.id, oi)}
                      disabled={submitted}
                      className="accent-primary"
                    />
                    <span className="font-medium text-gray-500 dark:text-gray-400 shrink-0">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </div>
                );
              })}
            </div>
            {submitted && (
              <div className="mt-2 text-sm">
                {selections[q.id] === q.answer ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">{t('library.correct')}</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    {t('library.wrong')} {String.fromCharCode(65 + q.answer)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
        {submitted && (
          <div className="text-center text-lg font-bold">
            {t('library.score', { correct: correctCount, total: questions.length })}
          </div>
        )}
        <div className="flex gap-4 justify-center pt-2">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered}
              className="px-8 py-3 bg-primary text-white rounded-lg text-base hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium"
            >
              {t('library.submit')}
            </button>
          ) : null}
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="px-8 py-3 bg-gray-200 dark:bg-gray-800 rounded-lg text-base hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {generating ? t('library.generating') : t('library.regenerate')}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>;
  }

  if (!article) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-400">Article not found</p>
        <Link to="/library" className="text-primary hover:underline text-sm">{t('library.back')}</Link>
      </div>
    );
  }

  const allAnswered = questions.every(q => selections[q.id] !== undefined);
  const correctCount = submitted
    ? questions.filter(q => selections[q.id] === q.answer).length
    : 0;

  if (readingMode) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-white dark:bg-gray-950 shrink-0">
          <h1 className="text-lg font-bold truncate">{article.title}</h1>
          <button
            onClick={() => setReadingMode(false)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            {t('reading.exit')}
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div
            className="overflow-y-auto p-8"
            style={{ width: `${dividerPos}%` }}
          >
            <div className="text-xl leading-10 whitespace-pre-wrap">{article.content}</div>
          </div>
          <div
            ref={dividerRef}
            className="w-1.5 bg-gray-200 dark:bg-gray-800 cursor-col-resize hover:bg-primary active:bg-primary shrink-0 relative"
            onMouseDown={() => setDragging(true)}
          />
          <div
            className="overflow-y-auto p-8"
            style={{ width: `${100 - dividerPos}%` }}
          >
            {questions.length > 0 ? (
              renderQuestions()
            ) : (
              <div className="space-y-4 pt-4">
                <h2 className="text-xl font-bold">{t('library.ai_section')}</h2>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">{error}</div>
                )}
                <p className="text-center text-gray-400 text-sm">{t('library.no_questions')}</p>
                <QuizConfigPanel
                  config={quizConfig}
                  onChange={setQuizConfig}
                  showGenerateButton
                  generating={generating}
                  onGenerate={() => genMut.mutate()}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/library" className="text-sm text-primary hover:underline inline-block">
          &larr; {t('library.back')}
        </Link>
        <button
          onClick={() => setReadingMode(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          {t('reading.enter')}
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{article.title}</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-x-2">
          <span>{article.source === 'txt' ? t('library.source_txt') : t('library.source_paste')}</span>
          <span>·</span>
          <span>{new Date(article.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-8 whitespace-pre-wrap leading-8 text-base">
        {article.content}
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="text-xl font-bold mb-6">{t('library.ai_section')}</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {questions.length > 0 ? (
          <div className="space-y-8">
            <QuizConfigPanel
              config={quizConfig}
              onChange={setQuizConfig}
            />

            {questions.map((q, qi) => (
              <div key={q.id} className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
                <div className="font-semibold text-base mb-4 leading-relaxed">{qi + 1}. {q.question}</div>
                <div className="space-y-3">
                  {q.options.map((opt, oi) => {
                    let className = 'flex items-center gap-3 px-4 py-3 rounded-lg text-base border cursor-pointer transition-colors ';
                    if (!submitted) {
                      className += selections[q.id] === oi
                        ? 'border-primary bg-primary-light/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
                    } else {
                      if (oi === q.answer) {
                        className += 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                      } else if (oi === selections[q.id] && oi !== q.answer) {
                        className += 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                      } else {
                        className += 'border-gray-200 dark:border-gray-700 opacity-60';
                      }
                    }
                    return (
                      <div
                        key={oi}
                        className={className}
                        onClick={() => handleSelect(q.id, oi)}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={selections[q.id] === oi}
                          onChange={() => handleSelect(q.id, oi)}
                          disabled={submitted}
                          className="accent-primary"
                        />
                        <span className="font-medium text-gray-500 dark:text-gray-400 shrink-0">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        <span className="leading-relaxed">{opt}</span>
                      </div>
                    );
                  })}
                </div>
                {submitted && (
                  <div className="mt-2 text-sm">
                    {selections[q.id] === q.answer ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">{t('library.correct')}</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        {t('library.wrong')} {String.fromCharCode(65 + q.answer)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {submitted && (
              <div className="text-center text-lg font-bold">
                {t('library.score', { correct: correctCount, total: questions.length })}
              </div>
            )}

            <div className="flex gap-4 justify-center pt-2">
              {!submitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  className="px-8 py-3 bg-primary text-white rounded-lg text-base hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium"
                >
                  {t('library.submit')}
                </button>
              ) : null}
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="px-8 py-3 bg-gray-200 dark:bg-gray-800 rounded-lg text-base hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {generating ? t('library.generating') : t('library.regenerate')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">
              {t('library.no_questions')}
            </p>
            <QuizConfigPanel
              config={quizConfig}
              onChange={setQuizConfig}
              showGenerateButton
              generating={generating}
              onGenerate={() => genMut.mutate()}
            />
          </div>
        )}
      </div>
    </div>
  );
}
