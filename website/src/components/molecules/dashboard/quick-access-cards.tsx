'use client';

import { QuickAccessCard , QuickAccessCardProps } from '@/src/components/atoms';

export interface QuickAccessCardsProps {
  cards: QuickAccessCardProps[];
  className?: string;
}

export function QuickAccessCards({ cards, className }: QuickAccessCardsProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${className || ''}`}>
      {cards.map((card, index) => (
        <QuickAccessCard key={index} {...card} />
      ))}
    </div>
  );
}

