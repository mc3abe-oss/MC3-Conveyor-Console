/**
 * DropdownPortal - Portal-based dropdown menu component
 *
 * Renders dropdown menus at the document body level to avoid overflow clipping
 * from parent containers. Handles positioning, click-outside, and escape key.
 */

'use client';

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Callback when dropdown should close */
  onClose: () => void;
  /** Reference to the trigger element for positioning */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** Dropdown content */
  children: ReactNode;
  /** Additional class names for the dropdown container */
  className?: string;
  /** Alignment relative to trigger: 'left' or 'right' */
  align?: 'left' | 'right';
  /** Whether to flip upward if near bottom of viewport */
  autoFlip?: boolean;
  /** Width mode: 'auto', 'trigger' (match trigger width), or specific px value */
  width?: 'auto' | 'trigger' | number;
}

export default function DropdownPortal({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = '',
  align = 'left',
  autoFlip = true,
  width = 'auto',
}: DropdownPortalProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, flipUp: false });
  const [mounted, setMounted] = useState(false);

  // Only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position when open or window resizes
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !isOpen) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // Check if we should flip upward
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const flipUp = autoFlip && spaceBelow < 200; // Flip if less than 200px below

    let top: number;
    if (flipUp) {
      // Position above the trigger
      top = scrollY + triggerRect.top - 4; // Will be adjusted by transform
    } else {
      // Position below the trigger
      top = scrollY + triggerRect.bottom + 4;
    }

    let left: number;
    if (align === 'right') {
      // Align right edge of dropdown with right edge of trigger
      left = scrollX + triggerRect.right;
    } else {
      // Align left edge of dropdown with left edge of trigger
      left = scrollX + triggerRect.left;
    }

    setPosition({ top, left, flipUp });
  }, [triggerRef, isOpen, align, autoFlip]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Use setTimeout to avoid closing immediately on the same click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  // Calculate width
  let widthStyle: string | number = 'auto';
  if (width === 'trigger' && triggerRef.current) {
    widthStyle = triggerRef.current.getBoundingClientRect().width;
  } else if (typeof width === 'number') {
    widthStyle = width;
  }

  const dropdown = (
    <div
      ref={dropdownRef}
      className={`fixed z-[9999] ${className}`}
      style={{
        top: position.top,
        left: align === 'right' ? 'auto' : position.left,
        right: align === 'right' ? `calc(100vw - ${position.left}px)` : 'auto',
        width: typeof widthStyle === 'number' ? `${widthStyle}px` : widthStyle,
        transform: position.flipUp ? 'translateY(-100%)' : undefined,
      }}
    >
      {children}
    </div>
  );

  return createPortal(dropdown, document.body);
}
