'use client';

import { useEffect, useRef } from 'react';

const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const openDialogs: HTMLElement[] = [];
let originalOverflow = '';

/** Keep keyboard focus in the top dialog and return it to its trigger on close. */
export function useModalFocus(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!openDialogs.length) originalOverflow = document.body.style.overflow;
    openDialogs.push(dialog);
    document.body.style.overflow = 'hidden';
    const elements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusable)).filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'));
    (elements()[0] || dialog).focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (openDialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const targets = elements();
      const first = targets[0] || dialog;
      const last = targets.at(-1) || dialog;
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const handleFocus = (event: FocusEvent) => {
      if (openDialogs.at(-1) === dialog && !dialog.contains(event.target as Node)) (elements()[0] || dialog).focus({ preventScroll: true });
    };
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('focusin', handleFocus);
      const wasTop = openDialogs.at(-1) === dialog;
      const index = openDialogs.indexOf(dialog);
      if (index >= 0) openDialogs.splice(index, 1);
      if (!openDialogs.length) document.body.style.overflow = originalOverflow;
      if (wasTop && trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  return ref;
}
