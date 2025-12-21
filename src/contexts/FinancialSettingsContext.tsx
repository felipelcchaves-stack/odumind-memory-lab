import { createContext, useContext, ReactNode } from 'react';
import { useFinancialSettings, FinancialSettings } from '@/hooks/useFinancialSettings';

interface FinancialSettingsContextType {
  settings: FinancialSettings;
  loading: boolean;
  saving: boolean;
  updateSettings: (newSettings: Partial<FinancialSettings>) => Promise<void>;
  refetch: () => Promise<void>;
}

const FinancialSettingsContext = createContext<FinancialSettingsContextType | null>(null);

export function FinancialSettingsProvider({ children }: { children: ReactNode }) {
  const financialSettings = useFinancialSettings();
  
  return (
    <FinancialSettingsContext.Provider value={financialSettings}>
      {children}
    </FinancialSettingsContext.Provider>
  );
}

export function useFinancialSettingsContext() {
  const context = useContext(FinancialSettingsContext);
  if (!context) {
    throw new Error('useFinancialSettingsContext must be used within a FinancialSettingsProvider');
  }
  return context;
}
