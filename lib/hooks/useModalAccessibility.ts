"use client";

import { useEffect, useRef } from "react";

export interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  preventScroll?: boolean;
}

/**
 * useModalAccessibility
 * Ensures keyboard navigation (Escape to close, Tab trapping)
 * and body scroll locking for any modal dialog or drawer overlay.
 */
export function useModalAccessibility<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  preventScroll = true,
}: UseModalAccessibilityOptions) {
  const modalRef = useRef<T | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for focus restoration
    triggerRef.current = document.activeElement as HTMLElement | null;

    // Handle Escape key
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      // Trap Tab key navigation within the modal
      if (event.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Auto-focus first interactive element
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
        );
        firstFocusable?.focus();
      }
    }, 50);

    // Prevent body scroll
    const originalStyle = document.body.style.overflow;
    if (preventScroll) {
      document.body.style.overflow = "hidden";
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (preventScroll) {
        document.body.style.overflow = originalStyle;
      }
      // Restore previous focus
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose, preventScroll]);

  return modalRef;
}
