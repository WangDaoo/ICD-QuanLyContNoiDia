import React, { useEffect, useRef, type ReactNode } from 'react';
import { focusableControls } from './yard/useYardDialogFocus';

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
  pending?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function ModalOverlay({
  children,
  onClose,
  pending = false,
  className = '',
  ...name
}: ModalOverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(() => {
    const isActive = () => ref.current?.open && !ref.current.closest('[hidden], [inert]');
    const guard = (event: Event) => {
      if (!isActive()) return;
      if (
        pendingRef.current ||
        (dirty.current &&
          !window.confirm(
            'Biểu mẫu có dữ liệu chưa lưu. Rời màn hình và giữ bản nháp để quay lại sau?',
          ))
      )
        event.preventDefault();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (!isActive()) return;
      if (!dirty.current && !pendingRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    document.addEventListener('icd:navigation-request', guard);
    window.addEventListener('beforeunload', unload);
    return () => {
      document.removeEventListener('icd:navigation-request', guard);
      window.removeEventListener('beforeunload', unload);
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollContainers = [
      document.body,
      document.querySelector<HTMLElement>('.app-content'),
    ].filter((element): element is HTMLElement => element !== null);
    let overflow: string[] | undefined;
    let lastFocus: HTMLElement | null = null;
    const unlockScroll = () => {
      if (!overflow) return;
      scrollContainers.forEach((element, index) => {
        element.style.overflow = overflow![index];
      });
      overflow = undefined;
    };
    const syncVisibility = () => {
      if (dialog.closest('[hidden], [inert]')) {
        if (dialog.contains(document.activeElement))
          lastFocus = document.activeElement as HTMLElement;
        if (dialog.open) dialog.close();
        unlockScroll();
      } else if (!dialog.open) {
        overflow = scrollContainers.map((element) => element.style.overflow);
        scrollContainers.forEach((element) => {
          element.style.overflow = 'hidden';
        });
        dialog.showModal();
        if (lastFocus?.isConnected && !lastFocus.matches(':disabled')) lastFocus.focus();
      }
    };
    // A kept-mounted view can become inactive without unmounting its form.
    // Suspend the native top layer only; retain its fields, dirty state and focus.
    const observer = new window.MutationObserver(syncVisibility);
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['hidden', 'inert'],
    });
    document.addEventListener('icd:route-changed', syncVisibility);
    syncVisibility();
    return () => {
      observer.disconnect();
      document.removeEventListener('icd:route-changed', syncVisibility);
      if (dialog.open) dialog.close();
      unlockScroll();
      if (opener?.isConnected && !opener.closest('[hidden], [inert]')) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      {...name}
      aria-modal="true"
      tabIndex={-1}
      onInputCapture={() => {
        dirty.current = true;
      }}
      onChangeCapture={() => {
        dirty.current = true;
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab' || !ref.current) return;
        const controls = focusableControls(ref.current);
        const first = controls[0];
        const last = controls[controls.length - 1];
        const active = document.activeElement;
        if (!first) {
          event.preventDefault();
          ref.current.focus();
        } else if (!controls.includes(active as HTMLElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className={`${className} m-0 h-full w-full max-w-none max-h-none border-0 overflow-y-auto backdrop:bg-transparent`}
    >
      {children}
    </dialog>
  );
}
