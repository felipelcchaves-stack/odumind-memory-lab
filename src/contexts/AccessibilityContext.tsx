import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'small' | 'normal' | 'large';

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  simplifiedMode: boolean;
  setSimplifiedMode: (enabled: boolean) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const stored = localStorage.getItem('accessibility-font-size');
    return (stored as FontSize) || 'normal';
  });

  const [simplifiedMode, setSimplifiedMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('accessibility-simplified-mode');
    return stored === 'true';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    const stored = localStorage.getItem('accessibility-high-contrast');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('accessibility-font-size', fontSize);
    
    // Remove all font size classes
    document.documentElement.classList.remove('font-size-small', 'font-size-normal', 'font-size-large');
    
    // Add the current font size class
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('accessibility-simplified-mode', String(simplifiedMode));
    
    if (simplifiedMode) {
      document.documentElement.classList.add('simplified-mode');
    } else {
      document.documentElement.classList.remove('simplified-mode');
    }
  }, [simplifiedMode]);

  useEffect(() => {
    localStorage.setItem('accessibility-high-contrast', String(highContrast));
    
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider value={{ fontSize, setFontSize, simplifiedMode, setSimplifiedMode, highContrast, setHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
