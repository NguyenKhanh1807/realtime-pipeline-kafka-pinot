'use client';

export interface MobileOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function MobileOverlay({ isOpen, onClose, className }: MobileOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${className || ''}`}
      onClick={onClose}
      aria-hidden="true"
    />
  );
}

