import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export interface PickerOption {
  value: string;
  /** Main text, e.g. the container number. */
  label: string;
  /** Second line, e.g. "40HC · Chủ hàng ABC · Trong bãi". */
  description?: string;
  /** Extra searchable text that is not displayed (MBL, HBL, plate…). */
  keywords?: string;
  disabled?: boolean;
  /** Why the option cannot be picked; shown instead of hiding it. */
  disabledReason?: string;
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  options: PickerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Text when nothing matches the query. */
  emptyText?: string;
  /** Helper line below the field. */
  hint?: string;
  maxResults?: number;
  className?: string;
}

export const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function filterPickerOptions(options: PickerOption[], query: string): PickerOption[] {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  if (!terms.length) return options;
  return options.filter((option) => {
    const haystack = normalizeSearchText(
      [option.label, option.description, option.keywords].filter(Boolean).join(' '),
    );
    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Type-to-search picker for long business lists (containers, consignees, trucks).
 * Accessible combobox: arrow keys move, Enter picks, Escape closes.
 */
export function SearchableSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Gõ để tìm…',
  disabled = false,
  required = false,
  emptyText = 'Không tìm thấy kết quả phù hợp.',
  hint,
  maxResults = 50,
  className = '',
}: SearchableSelectProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const listId = `${inputId}-list`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => filterPickerOptions(options, query), [options, query]);
  const visible = matches.slice(0, maxResults);
  const hiddenCount = matches.length - visible.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const pick = (option: PickerOption | undefined) => {
    if (!option || option.disabled) return;
    onChange(option.value);
    setQuery('');
    setOpen(false);
  };

  const moveActive = (step: number) => {
    if (!visible.length) return;
    setActiveIndex((index) => (index + step + visible.length) % visible.length);
  };

  const displayValue = open ? query : selected ? selected.label : '';

  return (
    <div className={`relative ${className}`.trim()}>
      <label htmlFor={inputId} className="block font-semibold text-slate-700 mb-1">
        {label}
        {required && !label.trim().endsWith('*') && '*'}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
        />
        <input
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && visible[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          aria-describedby={hintId}
          aria-required={required || undefined}
          required={required}
          disabled={disabled}
          value={displayValue}
          placeholder={selected && !open ? selected.label : placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setQuery('');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!open) setOpen(true);
              else moveActive(1);
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              moveActive(-1);
            } else if (event.key === 'Enter') {
              if (open) {
                event.preventDefault();
                if (visible[activeIndex]) pick(visible[activeIndex]);
              }
            } else if (event.key === 'Escape') {
              if (open) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
                setQuery('');
              }
            }
          }}
          className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-600"
        />
        {selected && !disabled && (
          <button
            type="button"
            aria-label={`Bỏ chọn ${selected.label}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              setQuery('');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-600 hover:bg-slate-100"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        )}
      </div>
      {selected?.description && !open && (
        <p className="mt-1 text-caption text-slate-600">{selected.description}</p>
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-caption text-slate-600">
          {hint}
        </p>
      )}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm"
        >
          {visible.length === 0 && (
            <li role="presentation" className="px-3 py-2 text-slate-600">
              {emptyText}
            </li>
          )}
          {visible.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              data-index={index}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => pick(option)}
              className={`px-3 py-2 ${option.disabled ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-900'} ${index === activeIndex ? 'bg-blue-50' : ''} ${option.value === value ? 'font-semibold' : ''}`}
            >
              <div className="font-mono">{option.label}</div>
              {(option.description || option.disabledReason) && (
                <div className="text-caption text-slate-600">
                  {option.disabled && option.disabledReason ? option.disabledReason : option.description}
                </div>
              )}
            </li>
          ))}
          {hiddenCount > 0 && (
            <li role="presentation" className="px-3 py-2 text-caption text-slate-600 border-t border-slate-100">
              Còn {hiddenCount} kết quả khác — gõ thêm để thu hẹp.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
