'use client';

import  { createContext, useContext, useState, ReactNode } from 'react';
import { log as logger } from '@/src/lib/logger';

interface CorrelationContextType {
  correlationId: string;
  generateNewCorrelationId: () => string;
  setCorrelationId: (id: string) => void;
}

const CorrelationContext = createContext<CorrelationContextType | undefined>(undefined);

interface CorrelationProviderProps {
  children: ReactNode;
}

export function CorrelationProvider({ children }: CorrelationProviderProps) {
  const [correlationId, setCorrelationIdState] = useState(() =>
    logger.generateCorrelationId()
  );

  const generateNewCorrelationId = () => {
    const newId = logger.generateCorrelationId();
    setCorrelationIdState(newId);
    return newId;
  };

  const setCorrelationId = (id: string) => {
    setCorrelationIdState(id);
  };

  const value: CorrelationContextType = {
    correlationId,
    generateNewCorrelationId,
    setCorrelationId,
  };

  return (
    <CorrelationContext.Provider value={value}>
      {children}
    </CorrelationContext.Provider>
  );
}

export function useCorrelation() {
  const context = useContext(CorrelationContext);
  if (context === undefined) {
    throw new Error('useCorrelation must be used within a CorrelationProvider');
  }
  return context;
}

// HOC to wrap API calls with correlation ID tracking
export function withCorrelationTracking<T extends any[], R>(
  fn: (correlationId: string, ...args: T) => R
) {
  return (...args: T): R => {
    const correlationId = logger.generateCorrelationId();
    return fn(correlationId, ...args);
  };
}

// Hook for API calls with correlation tracking
export function useApiWithCorrelation() {
  const { correlationId } = useCorrelation();

  return {
    correlationId,
    makeApiCall: async function<T>(
      apiCall: () => Promise<T>,
    ): Promise<T> {
      // Logging can be handled separately by the calling component
      try {
        const result = await apiCall();
        return result;
      } catch (error) {
        throw error;
      }
    },
  };
}