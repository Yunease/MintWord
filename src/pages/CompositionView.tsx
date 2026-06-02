import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getComposition, reviewCompositionWithConfig, saveCompositionReview, getSetting } from '../lib/api';
import { t } from '../lib/i18n';
import CompositionReviewConfig from '../components/CompositionReviewConfig';
import { buildCompositionPrompt, DEFAULT_COMPOSITION_CONFIG, loadCompositionConfig, saveCompositionConfig } from '../lib/compositionPrompt';
import type { CompositionReview, ProviderConfig } from '../types';
import type { CompositionConfig } from '../lib/compositionPrompt';

export default function CompositionView() {
  const { id } = useParams<{ id: string }>();
  const { data: composition, isLoading } = useQuery({
    queryKey: ['composition', id],
    queryFn: () => getComposition(id!),
    enabled: !!id,
  });

  const [manualReview, setManualReview] = useState<CompositionReview | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<CompositionConfig>(DEFAULT_COMPOSITION_CONFIG);

  const review = composition?.review ?? manualReview;

  useEffect(() => {
    loadCompositionConfig().then(setConfig);
  }, []);

  async function handleReview() {
    setReviewing(true);
    setError('');
    saveCompositionConfig(config);
    const prompt = buildCompositionPrompt(config);

    try {
      const configListStr = await getSetting('ai_provider_config_list');
      if (configListStr) {
        try {
          const configList: ProviderConfig[] = JSON.parse(configListStr);
          if (configList.length > 0) {
            const providerConfig = configList[0];
            const result = await reviewCompositionWithConfig(id!, providerConfig, prompt);
            await saveCompositionReview(id!, result);
            setManualReview(result);
            setReviewing(false);
            return;
          }
        } catch { /* fall through */ }
      }
      throw new Error(t('composition.config_first'));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReviewing(false);
    }
  }

  if (isLoading) {
    return <div className="text-center py-16 text-gray-400">Loading...</div>;
  }

  if (!composition) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-gray-400">Composition not found</p>
        <Link to="/library" className="text-primary hover:underline text-sm">{t('composition.back')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/library" className="text-sm text-primary hover:underline inline-block">
        &larr; {t('composition.back')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{composition.title}</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-x-2">
          <span>{composition.source === 'txt' ? t('composition.source_txt') : t('composition.source_paste')}</span>
          <span>·</span>
          <span>{new Date(composition.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-8 whitespace-pre-wrap leading-8 text-base">
        {composition.content}
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="text-xl font-bold mb-6">{t('composition.review_section')}</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        {review ? (
          <div className="space-y-6">
            <CompositionReviewConfig
              showPrompt={false}
              config={config}
              onChange={setConfig}
            />

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold">
                  {t('composition.score', { score: review.score })}
                </span>
                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      review.score >= 80 ? 'bg-green-500' : review.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(review.score, 100)}%` }}
                  />
                </div>
              </div>

              {review.corrections.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    {t('composition.corrections')}
                  </h3>
                  <div className="space-y-3">
                    {review.corrections.map((corr, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-border">
                        <div className="text-sm">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-red-500 line-through text-xs font-mono">{corr.original}</span>
                            <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10.21 14.77a.75.75 0 01.02-1.06L14.168 10 10.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                            </svg>
                            <span className="text-green-600 dark:text-green-400 font-medium text-xs font-mono">{corr.corrected}</span>
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{corr.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.suggestions.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3.196 12.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 12.87z" />
                      <path d="M3.196 8.87l-.825.483a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.758 0l7.25-4.25a.75.75 0 000-1.294l-.825-.484-5.666 3.322a2.25 2.25 0 01-2.276 0L3.196 8.87z" />
                      <path d="M10.38 1.103a.75.75 0 00-.76 0l-7.25 4.25a.75.75 0 000 1.294l7.25 4.25a.75.75 0 00.76 0l7.25-4.25a.75.75 0 000-1.294l-7.25-4.25z" />
                    </svg>
                    {t('composition.suggestions')}
                  </h3>
                  <ul className="space-y-2">
                    {review.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary shrink-0 font-mono">{i + 1}.</span>
                        <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleReview}
                disabled={reviewing}
                className="px-8 py-3 bg-gray-200 dark:bg-gray-800 rounded-lg text-base hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {reviewing ? t('composition.reviewing') : t('composition.review_button')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">
              {t('composition.no_review')}
            </p>
            <CompositionReviewConfig
              showPrompt={false}
              config={config}
              onChange={setConfig}
              showReviewButton
              reviewing={reviewing}
              onReview={handleReview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
