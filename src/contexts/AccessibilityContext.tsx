import React, { createContext, useContext, useState, useEffect } from 'react';

type FontSize = 'small' | 'normal' | 'large';

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const stored = localStorage.getItem('accessibility-font-size');
    return (stored as FontSize) || 'normal';
  });

  useEffect(() => {
    localStorage.setItem('accessibility-font-size', fontSize);
    
    // Remove all font size classes
    document.documentElement.classList.remove('font-size-small', 'font-size-normal', 'font-size-large');
    
    // Add the current font size class
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  return (
    <AccessibilityContext.Provider value={{ fontSize, setFontSize }}>
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
