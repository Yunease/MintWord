import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDecks, createDeck, deleteDeck, getDeckProgress, getSetting, setSetting } from '../lib/api';
import { t } from '../lib/i18n';
import type { DeckProgress } from '../types';

export default function Decks() {
  const queryClient = useQueryClient();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
  const { data: currentDeckId } = useQuery({
    queryKey: ['setting', 'current_deck_id'],
    queryFn: () => getSetting('current_deck_id'),
  });
  const { data: progressMap } = useQuery({
    queryKey: ['deckProgress'],
    queryFn: async () => {
      if (!decks) return new Map<string, DeckProgress>();
      const entries = await Promise.all(
        decks.map(async (d) => [d.id, await getDeckProgress(d.id)] as [string, DeckProgress])
      );
      return new Map(entries);
    },
    enabled: !!decks && decks.length > 0,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const createMut = useMutation({
    mutationFn: () => createDeck(name, desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setShowCreate(false);
      setName('');
      setDesc('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await deleteDeck(id);
      if (currentDeckId === id) {
        await setSetting('current_deck_id', '');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      queryClient.invalidateQueries({ queryKey: ['deckProgress'] });
      queryClient.invalidateQueries({ queryKey: ['setting', 'current_deck_id'] });
      queryClient.invalidateQueries({ queryKey: ['dueCounts'] });
    },
  });

  async function handleSetCurrent(deckId: string) {
    await setSetting('current_deck_id', deckId);
    queryClient.invalidateQueries({ queryKey: ['setting', 'current_deck_id'] });
    queryClient.invalidateQueries({ queryKey: ['dueCounts'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('nav.decks')}</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/import"
            className="px-4 py-1.5 bg-primary-light text-primary-dark rounded-lg text-sm hover:bg-primary hover:text-white transition-colors"
          >
            {t('deck.import_csv')}
          </Link>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
          >
            + {t('deck.create')}
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
          <input
            autoFocus
            placeholder={t('placeholder.deck_name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            placeholder={t('placeholder.deck_desc')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate()}
              disabled={!name.trim() || createMut.isPending}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {decks?.map((deck) => {
          const isCurrent = currentDeckId === deck.id;
          const progress = progressMap?.get(deck.id);

          return (
            <div
              key={deck.id}
              className={`flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border transition-colors ${
                isCurrent
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border'
              }`}
            >
              <Link to={`/deck/${deck.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{deck.name}</div>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-light text-primary-dark font-medium">
                      {t('deck.current_study')}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {deck.card_count > 0
                    ? t('deck.progress', {
                        studied: progress?.studied_count ?? 0,
                        total: deck.card_count,
                      })
                    : `${deck.card_count} 词`}
                </div>
                {deck.card_count > 0 && progress && (
                  <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min((progress.studied_count / deck.card_count) * 100, 100)}%`,
                      }}
                    />
                  </div>
                )}
              </Link>
              <div className="flex gap-2 ml-4 shrink-0">
                {!deck.id.startsWith('builtin-') && (
                  <Link
                    to={`/import?deckId=${encodeURIComponent(deck.id)}`}
                    className="px-3 py-1 bg-primary-light text-primary-dark rounded-md text-sm hover:bg-primary hover:text-white transition-colors"
                  >
                    {t('deck.import_csv')}
                  </Link>
                )}
                {!isCurrent && (
                  <button
                    onClick={() => handleSetCurrent(deck.id)}
                    className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors"
                  >
                    {t('deck.set_current')}
                  </button>
                )}
                <Link
                  to={`/study/${deck.id}`}
                  className="px-3 py-1 bg-primary-light text-primary-dark rounded-md text-sm hover:bg-primary hover:text-white transition-colors"
                >
                  {t('study.start')}
                </Link>
                {!deck.id.startsWith('builtin-') && (
                  <button
                    onClick={() => {
                      if (confirm(t('confirm.delete_deck'))) {
                        deleteMut.mutate(deck.id);
                      }
                    }}
                    className="px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
