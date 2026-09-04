'use client';

import { createContext, useContext } from 'react';

export type Environment = 'development' | 'staging' | 'production';

export const IntelligenceEnvironmentContext = createContext<{
  environment: Environment;
  setEnvironment: (env: Environment) => void;
}>({ environment: 'production', setEnvironment: () => {} });

export function useIntelligenceEnvironment() {
  return useContext(IntelligenceEnvironmentContext);
}
