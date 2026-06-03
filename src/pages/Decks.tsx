import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDecks, createDeck, deleteDeck, getDeckProgress, getSetting, setSetting } from '../lib/api';
import { t, LANGUAGES, langLabel } from '../lib/i18n';
import Select from '../components/Select';
import type { Deck, DeckProgress } from '../types';

export default function Decks() {
  const queryClient = useQueryClient();
  const { data: decks } = useQuery({ queryKey: ['decks'], queryFn: getDecks });
  const { data: currentDeckId } = useQuery({
    queryKey: ['setting', 'current_deck_id'],
    queryFn: () => getSetting('current_deck_id'),
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [langFrom, setLangFrom] = useState('en');
  const [langTo, setLangTo] = useState('zh');

  const groups = useMemo(() => {
    if (!decks) return [];
    const map = new Map<string, Deck[]>();
    for (const deck of decks) {
      const key = `${deck.language_from}:${deck.language_to}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(deck);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [decks]);

  function toggleGroup(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const expandedDeckIds = useMemo(() => {
    if (!decks) return [];
    return decks
      .filter((d) => expanded.has(`${d.language_from}:${d.language_to}`))
      .map((d) => d.id);
  }, [decks, expanded]);

  const { data: progressMap } = useQuery({
    queryKey: ['deckProgress', ...expandedDeckIds.sort()],
    queryFn: async () => {
      const entries = await Promise.all(
        expandedDeckIds.map(async (id) => [id, await getDeckProgress(id)] as [string, DeckProgress])
      );
      return new Map(entries);
    },
    enabled: expandedDeckIds.length > 0,
  });

  const createMut = useMutation({
    mutationFn: () => createDeck(name, desc, langFrom, langTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setShowCreate(false);
      setName('');
      setDesc('');
      setLangFrom('en');
      setLangTo('zh');
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

  const langOptions = LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

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
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('deck.language_from')}
              placeholder={t('placeholder.deck_lang_from')}
              value={langFrom}
              onChange={setLangFrom}
              options={langOptions}
            />
            <Select
              label={t('deck.language_to')}
              placeholder={t('placeholder.deck_lang_to')}
              value={langTo}
              onChange={setLangTo}
              options={langOptions}
            />
          </div>
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

      <div className="space-y-1">
        {groups.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12 text-sm">
            {t('deck.empty')}
          </div>
        )}
        {groups.map(([key, groupDecks]) => {
          const isExpanded = expanded.has(key);
          const totalCards = groupDecks.reduce((s, d) => s + d.card_count, 0);
          return (
            <div key={key} className="bg-white dark:bg-gray-900 rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleGroup(key)}
                className="w-full flex items-center justify-between px-4 py-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform mt-1 ${isExpanded ? 'rotate-90' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <div className="font-semibold text-base">
                      {langLabel(groupDecks[0].language_from)}
                      {' → '}
                      {langLabel(groupDecks[0].language_to)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t('deck.summary', { count: groupDecks.length, total: totalCards })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  )}
                </div>
              </button>
              <div
                className="grid transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border">
                    <div className="divide-y divide-border">
                      {groupDecks.map((deck) => {
                        const isCurrent = currentDeckId === deck.id;
                        const progress = progressMap?.get(deck.id);
                        return (
                          <div
                            key={deck.id}
                            className={`flex items-center justify-between px-4 py-5 transition-colors ${
                              isCurrent ? 'bg-primary-light/30' : ''
                            }`}
                          >
                            <Link to={`/deck/${deck.id}`} className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="font-semibold text-base">{deck.name}</div>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-light text-primary-dark font-medium">
                                    {t('deck.current_study')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {deck.card_count > 0
                                  ? t('deck.progress', {
                                      studied: progress?.studied_count ?? 0,
                                      total: deck.card_count,
                                    })
                                  : `${deck.card_count} ${t('deck.word_unit')}`}
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
