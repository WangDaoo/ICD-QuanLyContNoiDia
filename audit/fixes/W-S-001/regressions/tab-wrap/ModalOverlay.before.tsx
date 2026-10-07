import React, { useEffect, useRef, type ReactNode } from 'react';

interface ModalOverlayProps {
  children: ReactNode;
  onClose: () => void;
  pending?: boolean;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export function ModalOverlay({ children, onClose, pending = false, className = '', ...name }: ModalOverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollContainers = [document.body, document.querySelector<HTMLElement>('.app-content')].filter(
      (element): element is HTMLElement => element !== null,
    );
    const overflow = scrollContainers.map(element => element.style.overflow);
    scrollContainers.forEach(element => { element.style.overflow = 'hidden'; });
    dialog.showModal();
    return () => {
      dialog.close();
      scrollContainers.forEach((element, index) => { element.style.overflow = overflow[index]; });
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      {...name}
      aria-modal="true"
      onCancel={event => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className={`${className} m-0 h-full w-full max-w-none max-h-none border-0 overflow-y-auto backdrop:bg-transparent`}
    >
      {children}
    </dialog>
  );
}
