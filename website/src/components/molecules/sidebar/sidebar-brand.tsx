'use client';

import { Logo } from '@/src/components/atoms';

export interface SidebarBrandProps {
  className?: string;
}

export function SidebarBrand({ className }: SidebarBrandProps) {
  return (
    <div className={`flex h-16 shrink-0 items-center px-6 ${className || ''}`}>
      <Logo />
    </div>
  );
}

