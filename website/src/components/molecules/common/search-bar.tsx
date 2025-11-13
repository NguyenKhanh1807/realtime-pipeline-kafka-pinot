'use client';

import * as React from 'react';
import { Input } from '@/src/components/atoms';
import { Search } from 'lucide-react';
import { cn } from '@/src/lib';

export interface SearchBarProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  /**
   * Placeholder text for the search input
   */
  placeholder?: string;
  /**
   * Current search value
   */
  value: string;
  /**
   * Callback when search value changes
   */
  onChange: (value: string) => void;
  /**
   * Additional className for the wrapper div
   */
  className?: string;
  /**
   * Additional className for the input element
   */
  inputClassName?: string;
  /**
   * Whether the search bar is disabled
   */
  disabled?: boolean;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChange,
  className,
  inputClassName,
  disabled,
  ...props
}: SearchBarProps) {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn('pl-10', inputClassName)}
        {...props}
      />
    </div>
  );
}

