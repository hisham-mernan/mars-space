'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [mounted, setMounted] = useState(false);

  // Initialize language from localStorage or default to Arabic (per spec: "Arabic as primary market language")
  useEffect(() => {
    const savedLanguage = localStorage.getItem('mars-lang') || 'ar';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguage(savedLanguage);
    setMounted(true);
  }, []);

  // Update HTML lang and dir attributes whenever language changes
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('mars-lang', language);
  }, [language, mounted]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const t = translations[language] || translations.en;

  // Render children once mounted to prevent SSR hydration mismatches
  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
