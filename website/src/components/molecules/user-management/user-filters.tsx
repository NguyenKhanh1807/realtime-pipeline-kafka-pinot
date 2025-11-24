'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@/src/components/atoms';
import { SearchBar } from '@/src/components/molecules/common';
import { RotateCcw } from 'lucide-react';
import { ROLE_DEFINITIONS, type UserRole } from '@/src/types';
import { cn } from '@/src/lib';

export interface UserFiltersProps {
  searchTerm: string;
  roleFilter: UserRole | 'all';
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: UserRole | 'all') => void;
  onClearFilters: () => void;
  className?: string;
}

export function UserFilters({
  searchTerm,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onClearFilters,
  className,
}: UserFiltersProps) {
  return (
    <div className={`p-4 border-b border-border bg-muted/20 ${className || ''}`}>
      <div className="flex flex-col md:flex-row gap-3">
        <SearchBar
          placeholder="Search users..."
          value={searchTerm}
          onChange={onSearchChange}
        />

        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-full md:w-[200px] h-11">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.values(ROLE_DEFINITIONS).map((role) => (
              <SelectItem key={role.name} value={role.name}>
                {role.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={onClearFilters}
          className={cn(
            "h-11 w-11 shrink-0",
            "transition-all duration-300 ease-in-out",
            "hover:scale-110 hover:shadow-lg hover:bg-primary/10 hover:border-primary/50",
            "active:scale-95 active:shadow-sm",
            // Subtle glow when filters are active
            (searchTerm || roleFilter !== 'all') && 
              "ring-2 ring-primary/30 shadow-md bg-primary/5"
          )}
          title="Clear all filters"
        >
          <RotateCcw 
            className={cn(
              "h-4 w-4 text-muted-foreground",
              "transition-transform duration-500 ease-in-out",
              "hover:rotate-180 hover:text-primary",
              // Rotate icon when filters are active to indicate action available
              (searchTerm || roleFilter !== 'all') && 
                "rotate-180 text-primary"
            )}
          />
        </Button>
      </div>
    </div>
  );
}

