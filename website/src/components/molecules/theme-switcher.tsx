'use client';

import { Button } from '@/src/components/atoms/button';
import { useTheme } from '@/src/contexts';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useState } from 'react';

export function ThemeSwitcher() {
  const { mode, setMode, resolvedMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  const CurrentIcon = mode === 'system' ? Monitor : (resolvedMode === 'dark' ? Moon : Sun);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-md border border-border bg-popover p-1 shadow-md">
            {options.map((option) => {
              const Icon = option.icon;
              const isActive = mode === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setMode(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                    isActive ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{option.label}</span>
                  {option.value === 'system' && mode === 'system' && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      ({resolvedMode})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Simple toggle version for compact spaces
export function ThemeToggle() {
  const { toggleMode } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleMode}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
