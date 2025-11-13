'use client';

import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@/src/components/atoms';
import { Search, RotateCcw } from 'lucide-react';
import { ROLE_DEFINITIONS, type UserRole } from '@/src/types';

export interface UserFiltersProps {
  searchTerm: string;
  roleFilter: UserRole | 'all';
  statusFilter: 'all' | 'active' | 'inactive';
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: UserRole | 'all') => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
  onClearFilters: () => void;
  className?: string;
}

export function UserFilters({
  searchTerm,
  roleFilter,
  statusFilter,
  onSearchChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onClearFilters,
  className,
}: UserFiltersProps) {
  return (
    <div className={`p-4 border-b border-border bg-muted/20 ${className || ''}`}>
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="h-11 w-full md:w-[200px]">
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

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-11 w-full md:w-[200px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={onClearFilters}
          className="h-11 w-11 shrink-0"
          title="Clear all filters"
        >
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

