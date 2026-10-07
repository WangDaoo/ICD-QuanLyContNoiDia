import { useEffect, useRef, type KeyboardEvent } from 'react';

const focusableSelector =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function focusableControls(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (control) =>
      !control.matches(':disabled') &&
      control.tabIndex >= 0 &&
      !control.closest('[hidden], [inert]') &&
      control.getClientRects().length > 0 &&
      getComputedStyle(control).visibility !== 'hidden',
  );
}

export function useYardDialogFocus(open: boolean, onClose: () => void, pending = false) {
  const ref = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !ref.current) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    (focusableControls(dialog)[0] ?? dialog).focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!open || !ref.current) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!pending) onCloseRef.current();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = focusableControls(ref.current);
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    if (!first) {
      event.preventDefault();
      ref.current.focus();
    } else if (!controls.some((control) => control === active)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { ref, onKeyDown };
}
