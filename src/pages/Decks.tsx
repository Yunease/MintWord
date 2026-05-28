import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDecks, createDeck, deleteDeck } from '../lib/api';
import { t } from '../lib/i18n';

export default function Decks() {
  const queryClient = useQueryClient();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
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
    mutationFn: (id: string) => deleteDeck(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decks'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('nav.decks')}</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          + {t('deck.create')}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
          <input
            autoFocus
            placeholder={t('placeholder.deck_name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder={t('placeholder.deck_desc')}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate()}
              disabled={!name.trim() || createMut.isPending}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
        {decks?.map((deck) => (
          <div
            key={deck.id}
            className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <Link to={`/deck/${deck.id}`} className="flex-1 min-w-0">
              <div className="font-medium">{deck.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {deck.card_count} 词
              </div>
            </Link>
            <div className="flex gap-2 ml-4">
              <Link
                to={`/study/${deck.id}`}
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md text-sm hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
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
        ))}
      </div>
    </div>
  );
}
