import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import { getArticles, createArticle, deleteArticle, importArticleTxt } from '../lib/api';
import { t } from '../lib/i18n';

export default function Library() {
  const queryClient = useQueryClient();
  const { data: articles } = useQuery({ queryKey: ['articles'], queryFn: getArticles });
  const [showPaste, setShowPaste] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [message, setMessage] = useState('');

  const importMut = useMutation({
    mutationFn: async () => {
      const filePath = await open({
        filters: [{ name: 'Text', extensions: ['txt'] }],
        multiple: false,
      });
      if (!filePath) return null;
      return importArticleTxt(filePath as string);
    },
    onSuccess: (article) => {
      if (article) {
        setMessage(`已导入：${article.title}`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
      }
    },
    onError: (e) => setMessage(`导入失败：${e}`),
  });

  const createMut = useMutation({
    mutationFn: () => createArticle(pasteTitle, pasteContent, 'paste'),
    onSuccess: () => {
      setMessage('文章已创建');
      setShowPaste(false);
      setPasteTitle('');
      setPasteContent('');
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (e) => setMessage(`创建失败：${e}`),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onError: (e) => setMessage(`删除失败：${e}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('library.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => importMut.mutate()}
            disabled={importMut.isPending}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {t('library.import_txt')}
          </button>
          <button
            onClick={() => setShowPaste(!showPaste)}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            {t('library.paste')}
          </button>
        </div>
      </div>

      {showPaste && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-4 space-y-3">
          <input
            autoFocus
            placeholder={t('library.paste_title')}
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            placeholder={t('library.paste_placeholder')}
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={() => createMut.mutate()}
              disabled={!pasteTitle.trim() || !pasteContent.trim() || createMut.isPending}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {t('common.save')}
            </button>
            <button
              onClick={() => setShowPaste(false)}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {articles && articles.length > 0 ? (
          articles.map((article) => (
            <Link
              key={article.id}
              to={`/library/${article.id}`}
              className="block p-4 bg-white dark:bg-gray-900 rounded-lg border border-border hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{article.title}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 space-x-2">
                    <span>
                      {article.source === 'txt' ? t('library.source_txt') : t('library.source_paste')}
                    </span>
                    <span>·</span>
                    <span>{new Date(article.created_at).toLocaleDateString()}</span>
                    {article.has_questions && (
                      <>
                        <span>·</span>
                        <span className="text-primary-dark">有题目</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(t('library.delete_confirm'))) {
                      deleteMut.mutate(article.id);
                    }
                  }}
                  className="ml-4 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors shrink-0"
                >
                  {t('common.delete')}
                </button>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-16 text-gray-400">
            {t('library.empty')}
          </div>
        )}
      </div>

      {message && (
        <div className="text-sm text-center text-blue-600 dark:text-blue-400">{message}</div>
      )}
    </div>
  );
}
