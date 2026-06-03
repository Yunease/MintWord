import { useState, useRef, useId } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  placeholder?: string;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
}

export default function TagInput({
  value,
  onChange,
  max = 10,
  placeholder,
  label,
  hint,
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= max) return;
    onChange([...value, trimmed]);
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
      setInput('');
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const tags = text.split(/[,，\n]/).map(t => t.trim()).filter(Boolean);
    const merged = [...value];
    for (const tag of tags) {
      if (!merged.includes(tag) && merged.length < max) {
        merged.push(tag);
      }
    }
    onChange(merged);
  }

  return (
    <div>
      {label && (
        <label htmlFor={`${id}-input`} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          {label}
        </label>
      )}
      <div
        className={`flex flex-wrap gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus-within:ring-2 focus-within:ring-primary transition-shadow ${
          disabled ? 'opacity-50' : 'cursor-text'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-light dark:bg-primary-dark/30 text-primary-dark dark:text-primary-light text-xs font-medium"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full hover:bg-primary-dark/20 dark:hover:bg-primary-light/20 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {value.length < max && (
          <input
            ref={inputRef}
            id={`${id}-input`}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => { if (input) { addTag(input); setInput(''); } }}
            placeholder={placeholder || (value.length === 0 ? '' : '')}
            disabled={disabled}
            className="flex-1 min-w-[80px] outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
          />
        )}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
    </div>
  );
}
