'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';

export interface SelectOption<Value extends string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

interface SelectProps<Value extends string> extends Omit<React.ComponentPropsWithoutRef<'button'>, 'value' | 'onChange' | 'children' | 'type'> {
  value: Value;
  options: readonly SelectOption<Value>[];
  onValueChange: (value: Value) => void;
  placeholder?: string;
  name?: string;
}

export function Select<Value extends string>({
  value, options, onValueChange, placeholder, name, id, className = '', disabled = false, ...buttonProps
}: SelectProps<Value>) {
  const { t } = useI18n();
  const generatedId = useId();
  const controlId = id || `select-${generatedId}`;
  const listId = `${controlId}-options`;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const selected = options.findIndex(option => option.value === value);
  const enabled = options.flatMap((option, index) => option.disabled ? [] : [index]);
  const expanded = open && !disabled && enabled.length > 0;

  const show = (edge?: 'first' | 'last') => {
    if (disabled || !enabled.length) return;
    const index = edge === 'first' ? enabled[0] : edge === 'last' ? enabled[enabled.length - 1]
      : enabled.includes(selected) ? selected : enabled[0];
    setActive(index);
    setPosition(null);
    setOpen(true);
    search.current = { text: '', time: 0 };
  };
  const choose = (index: number) => {
    const option = options[index];
    if (disabled || !option || option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  useEffect(() => { if (disabled || !enabled.length) setOpen(false); }, [disabled, enabled.length]);
  useEffect(() => { if (!expanded) search.current = { text: '', time: 0 }; }, [expanded]);
  useLayoutEffect(() => {
    if (!expanded) return;
    if (!options[active] || options[active].disabled) setActive(enabled.includes(selected) ? selected : enabled[0]);
    const place = () => {
      if (!trigger.current || !list.current) return;
      const bounds = trigger.current.getBoundingClientRect();
      const below = Math.max(0, innerHeight - bounds.bottom - 12);
      const above = Math.max(0, bounds.top - 12);
      const height = Math.min(list.current.scrollHeight, 288);
      const upward = below < height && above > below;
      const maxHeight = Math.min(height, upward ? above : below);
      const width = Math.min(Math.max(bounds.width, 200), innerWidth - 24);
      setPosition({
        left: Math.max(12, Math.min(bounds.left, innerWidth - width - 12)),
        top: upward ? bounds.top - maxHeight - 6 : bounds.bottom + 6,
        width, maxHeight,
      });
    };
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !list.current?.contains(event.target)) setOpen(false);
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && list.current?.contains(event.target)) return;
      const bounds = trigger.current?.getBoundingClientRect();
      if (!bounds || bounds.bottom <= 0 || bounds.top >= innerHeight) setOpen(false);
      else place();
    };
    place();
    const observer = new ResizeObserver(place);
    if (trigger.current) observer.observe(trigger.current);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('focusin', dismiss);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('focusin', dismiss);
    };
  }, [expanded, options]);
  useLayoutEffect(() => {
    const option = list.current?.children[active];
    if (!expanded || !list.current || !(option instanceof HTMLElement)) return;
    if (option.offsetTop < list.current.scrollTop) list.current.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.current.scrollTop + list.current.clientHeight) {
      list.current.scrollTop = option.offsetTop + option.offsetHeight - list.current.clientHeight;
    }
  }, [active, expanded, position]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || disabled) return;
    if (event.key === 'Tab') { setOpen(false); return; }
    if (event.key === 'Escape' || (event.altKey && event.key === 'ArrowUp')) {
      if (expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      if (!expanded) { show(event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : undefined); return; }
      const offset = event.key === 'PageDown' ? 5 : event.key === 'PageUp' ? -5 : event.key === 'ArrowUp' ? -1 : 1;
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : Math.max(0, Math.min(enabled.length - 1, enabled.indexOf(active) + offset));
      if (enabled[index] !== undefined) setActive(enabled[index]);
      return;
    }
    const continuingSearch = Date.now() - search.current.time < 700 && search.current.text.length > 0;
    if (event.key === 'Enter' || (event.key === ' ' && !continuingSearch)) {
      event.preventDefault();
      if (expanded) choose(active); else show();
      return;
    }
    if (event.altKey || event.key.length !== 1) return;
    event.preventDefault();
    const text = `${continuingSearch ? search.current.text : ''}${event.key}`.toLocaleLowerCase();
    search.current = { text, time: Date.now() };
    const prefix = [...text].every(character => character === text[0]) ? text[0] : text;
    const from = prefix.length === 1 ? (expanded ? active : selected) + 1 : 0;
    for (let offset = 0; offset < options.length; offset++) {
      const index = (from + offset + options.length) % options.length;
      if (!options[index].disabled && options[index].label.toLocaleLowerCase().startsWith(prefix)) {
        if (expanded) setActive(index); else onValueChange(options[index].value);
        break;
      }
    }
  };

  return (
    <span className={`custom-select ${className}`}>
      {name && <input type="hidden" name={name} value={value} disabled={disabled || !enabled.length || selected < 0 || options[selected].disabled} />}
      <button {...buttonProps} ref={trigger} id={controlId} type="button" role="combobox"
        className="custom-select-trigger" disabled={disabled || !enabled.length} aria-haspopup="listbox"
        aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => { if (expanded) setOpen(false); else show(); }} onKeyDown={onKeyDown}>
        <span className="min-w-0 truncate">{options[selected]?.label || placeholder || t('Choose an option')}</span>
        <ChevronDown className="custom-select-chevron h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      {expanded && createPortal(
        <div ref={list} id={listId} role="listbox" className="custom-select-menu"
          aria-label={buttonProps['aria-label']} aria-labelledby={buttonProps['aria-labelledby'] || (buttonProps['aria-label'] ? undefined : controlId)}
          style={{ ...position, visibility: position ? 'visible' : 'hidden' }}>
          {options.map((option, index) => (
            <div key={option.value} id={`${listId}-${index}`} role="option" aria-selected={index === selected}
              aria-disabled={option.disabled || undefined} data-active={index === active || undefined} className="custom-select-option"
              onPointerMove={() => { if (!option.disabled) setActive(index); }} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)}>
              <span>{option.label}</span>
              {index === selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            </div>
          ))}
        </div>, document.body
      )}
    </span>
  );
}
