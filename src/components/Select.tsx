import { useState, useRef, useEffect, useCallback, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  label,
  placeholder = '—',
  className = '',
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const instanceId = useId();

  const selectedOption = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusIndex(-1);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return;
      }
      close();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  useEffect(() => {
    if (isOpen && focusIndex >= 0 && listRef.current) {
      const item = listRef.current.children[focusIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen, focusIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusIndex >= 0) {
          onChange(options[focusIndex].value);
          close();
        } else {
          setIsOpen(true);
          setFocusIndex(
            value ? options.findIndex((o) => o.value === value) : 0
          );
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusIndex(
            value ? options.findIndex((o) => o.value === value) : 0
          );
        } else {
          setFocusIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setFocusIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          e.preventDefault();
          setFocusIndex(options.length - 1);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          close();
        }
        break;
      case 'Tab':
        if (isOpen) {
          close();
        }
        break;
    }
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          id={`${instanceId}-label`}
          className="block text-xs text-gray-500 dark:text-gray-400 mb-1"
        >
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? `${instanceId}-label` : undefined}
        aria-controls={isOpen ? `${instanceId}-listbox` : undefined}
        aria-activedescendant={
          isOpen && focusIndex >= 0
            ? `${instanceId}-option-${focusIndex}`
            : undefined
        }
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            close();
          } else {
            setIsOpen(true);
            setFocusIndex(
              value ? options.findIndex((o) => o.value === value) : 0
            );
          }
        }}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 py-2 text-left border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow relative ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span
          className={
            selectedOption
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-500'
          }
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          id={`${instanceId}-listbox`}
          role="listbox"
          aria-labelledby={label ? `${instanceId}-label` : undefined}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg py-1 text-sm"
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`${instanceId}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setFocusIndex(index)}
              onClick={() => {
                onChange(option.value);
                close();
              }}
              className={`px-3 py-2 cursor-pointer transition-colors ${
                option.value === value
                  ? 'bg-primary-light text-primary-dark font-medium'
                  : focusIndex === index
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
