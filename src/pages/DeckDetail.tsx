import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { getCards, addCard, deleteCard } from '../lib/api';
import { t } from '../lib/i18n';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';


export default function DeckDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: cards } = useQuery({
    queryKey: ['cards', id],
    queryFn: () => getCards(id!),
    enabled: !!id,
  });

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const addMut = useMutation({
    mutationFn: () => addCard(id!, front, back, phonetic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setFront('');
      setBack('');
      setPhonetic('');
      setShowAdd(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/decks" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeftIcon className="w-4 h-4 inline" /> {t('common.back')}
        </Link>
        <h1 className="text-xl font-bold flex-1">词库详情</h1>
        <Link
          to={`/import?deckId=${encodeURIComponent(id ?? '')}`}
          className="px-4 py-1.5 bg-primary-light text-primary-dark rounded-lg text-sm hover:bg-primary hover:text-white transition-colors"
        >
          {t('deck.import_csv')}
        </Link>
        <Link
          to={`/study/${id}`}
          className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors"
        >
          {t('study.start')}
        </Link>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 inline" /> {t('deck.add_card')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
          <input
            autoFocus
            placeholder={t('placeholder.word')}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            placeholder={t('placeholder.phonetic')}
            value={phonetic}
            onChange={(e) => setPhonetic(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            placeholder={t('placeholder.translation')}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => addMut.mutate()}
              disabled={!front.trim() || !back.trim() || addMut.isPending}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {cards?.map((card) => (
          <div
            key={card.id}
            className="flex items-start justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-border"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium">{card.front}</div>
              {card.phonetic && (
                <div className="text-sm text-gray-400 dark:text-gray-500">{card.phonetic}</div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 whitespace-pre-line line-clamp-2">
                {card.back}
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm(t('confirm.delete_card'))) {
                  deleteMut.mutate(card.id);
                }
              }}
              className="ml-3 px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors flex-shrink-0"
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
        {cards?.length === 0 && (
          <p className="text-center py-8 text-gray-400">{t('study.no_cards')}</p>
        )}
      </div>
    </div>
  );
}
