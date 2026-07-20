'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize configs from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('mars-lang') || 'ar';
    const savedTheme = localStorage.getItem('mars-theme') || 'dark';
    setLanguage(savedLanguage);
    setTheme(savedTheme);
    setMounted(true);
  }, []);

  // Update HTML lang and dir attributes whenever language changes
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('mars-lang', language);
  }, [language, mounted]);

  // Update HTML theme class when theme changes
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.className = theme === 'light' ? 'theme-light' : '';
    localStorage.setItem('mars-theme', theme);
  }, [theme, mounted]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const t = translations[language] || translations.en;

  // Render children once mounted to prevent SSR hydration mismatches
  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, theme, toggleTheme, t, mounted }}>
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
