import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import {
  getArticles, createArticle, deleteArticle, importArticleTxt,
  getCompositions, createComposition, deleteComposition, importCompositionTxt,
} from '../lib/api';
import { t } from '../lib/i18n';

interface SectionItem {
  id: string;
  title: string;
  source: string;
  created_at: string;
  hasBadge?: boolean;
}

interface SectionConfig {
  type: string;
  labelKey: string;
  emptyKey: string;
  linkPrefix: string;
  getBadge?: (item: SectionItem) => string | null;
}

const SECTIONS: SectionConfig[] = [
  {
    type: 'article',
    labelKey: 'nav.articles',
    emptyKey: 'library.empty',
    linkPrefix: '/library',
    getBadge: (item) => item.hasBadge ? '有题目' : null,
  },
  {
    type: 'composition',
    labelKey: 'nav.compositions',
    emptyKey: 'composition.empty',
    linkPrefix: '/composition',
    getBadge: (item) => item.hasBadge ? '有评价' : null,
  },
];

export default function Library() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['article']));
  const [pasteState, setPasteState] = useState<{ type: string; show: boolean; title: string; content: string }>({
    type: '', show: false, title: '', content: '',
  });
  const [message, setMessage] = useState('');

  const articlesQuery = useQuery({
    queryKey: ['articles'],
    queryFn: () => getArticles().then(list => list.map(a => ({ ...a, hasBadge: a.has_questions }))),
  });

  const compositionsQuery = useQuery({
    queryKey: ['compositions'],
    queryFn: () => getCompositions().then(list => list.map(c => ({ ...c, hasBadge: c.has_review }))),
  });

  const sectionData: Record<string, SectionItem[] | undefined> = {
    article: articlesQuery.data,
    composition: compositionsQuery.data,
  };

  function toggleSection(type: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function closePaste() {
    setPasteState({ type: '', show: false, title: '', content: '' });
  }

  function sectionList(section: SectionConfig): SectionItem[] {
    return sectionData[section.type] ?? [];
  }

  const importArticleMut = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        filters: [{ name: 'Text', extensions: ['txt'] }],
        multiple: false,
      });
      if (!filePath) return null;
      return importArticleTxt(filePath as string);
    },
    onSuccess: (result) => {
      if (result) {
        setMessage(`已导入：${(result as { title: string }).title}`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
      }
    },
    onError: (e) => setMessage(`导入失败：${e}`),
  });

  const importCompositionMut = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        filters: [{ name: 'Text', extensions: ['txt'] }],
        multiple: false,
      });
      if (!filePath) return null;
      return importCompositionTxt(filePath as string);
    },
    onSuccess: (result) => {
      if (result) {
        setMessage(`已导入：${(result as { title: string }).title}`);
        queryClient.invalidateQueries({ queryKey: ['compositions'] });
      }
    },
    onError: (e) => setMessage(`导入失败：${e}`),
  });

  const createArticleMut = useMutation({
    mutationFn: () => createArticle(pasteState.title, pasteState.content, 'paste'),
    onSuccess: () => {
      setMessage('已创建');
      closePaste();
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (e) => setMessage(`创建失败：${e}`),
  });

  const createCompositionMut = useMutation({
    mutationFn: () => createComposition(pasteState.title, pasteState.content, 'paste'),
    onSuccess: () => {
      setMessage('已创建');
      closePaste();
      queryClient.invalidateQueries({ queryKey: ['compositions'] });
    },
    onError: (e) => setMessage(`创建失败：${e}`),
  });

  const deleteArticleMut = useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (e) => setMessage(`删除失败：${e}`),
  });

  const deleteCompositionMut = useMutation({
    mutationFn: (id: string) => deleteComposition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compositions'] });
    },
    onError: (e) => setMessage(`删除失败：${e}`),
  });

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-bold mb-4">{t('library.title')}</h1>

      {SECTIONS.map((section) => {
        const items = sectionList(section);
        const isExpanded = expanded.has(section.type);

        return (
          <div key={section.type} className="bg-white dark:bg-gray-900 rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => toggleSection(section.type)}
              className="w-full flex items-center justify-between px-4 py-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-semibold text-base">{t(section.labelKey)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length > 0 ? `${items.length}` : ''}
                </span>
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
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-border">
                    <button
                      onClick={() => {
                        const mut = section.type === 'article' ? importArticleMut : importCompositionMut;
                        mut.mutate();
                      }}
                      disabled={
                        section.type === 'article' ? importArticleMut.isPending : importCompositionMut.isPending
                      }
                      className="px-3 py-1 bg-primary-light text-primary-dark rounded-md text-xs hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                    >
                      {section.type === 'article' ? t('library.import_txt') : t('composition.import_txt')}
                    </button>
                    <button
                      onClick={() => setPasteState({
                        type: section.type,
                        show: true,
                        title: '',
                        content: '',
                      })}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      {section.type === 'article' ? t('library.paste') : t('composition.paste')}
                    </button>
                  </div>

                  {pasteState.show && pasteState.type === section.type && (
                    <div className="p-4 border-b border-border space-y-3 bg-white dark:bg-gray-900">
                      <input
                        autoFocus
                        placeholder={section.type === 'article' ? t('library.paste_title') : t('composition.paste_title')}
                        value={pasteState.title}
                        onChange={(e) => setPasteState((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <textarea
                        placeholder={section.type === 'article' ? t('library.paste_placeholder') : t('composition.paste_placeholder')}
                        value={pasteState.content}
                        onChange={(e) => setPasteState((prev) => ({ ...prev, content: e.target.value }))}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const mut = section.type === 'article' ? createArticleMut : createCompositionMut;
                            mut.mutate();
                          }}
                          disabled={!pasteState.title.trim() || !pasteState.content.trim() || (section.type === 'article' ? createArticleMut.isPending : createCompositionMut.isPending)}
                          className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={closePaste}
                          className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}

                  {items.length > 0 ? (
                    <div className="divide-y divide-border">
                      {items.map((item) => (
                        <Link
                          key={item.id}
                          to={`${section.linkPrefix}/${item.id}`}
                          className="flex items-center justify-between px-4 py-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base truncate">{item.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                              <span>
                                {item.source === 'txt'
                                  ? (section.type === 'article' ? t('library.source_txt') : t('composition.source_txt'))
                                  : (section.type === 'article' ? t('library.source_paste') : t('composition.source_paste'))}
                              </span>
                              <span>·</span>
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              {section.getBadge && section.getBadge(item) && (
                                <>
                                  <span>·</span>
                                  <span className="text-primary-dark">{section.getBadge(item)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm(section.type === 'article' ? t('library.delete_confirm') : t('composition.delete_confirm'))) {
                                const mut = section.type === 'article' ? deleteArticleMut : deleteCompositionMut;
                                mut.mutate(item.id);
                              }
                            }}
                            className="ml-4 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors shrink-0"
                          >
                            {t('common.delete')}
                          </button>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400 text-sm">
                      {t(section.emptyKey)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {message && (
        <div className="text-sm text-center text-blue-600 dark:text-blue-400">{message}</div>
      )}
    </div>
  );
}
