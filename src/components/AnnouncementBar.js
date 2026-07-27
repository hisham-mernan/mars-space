'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function AnnouncementBar() {
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, #8A4120 0%, #C86B3C 100%)',
      color: '#FFFFFF',
      fontSize: '13px',
      fontWeight: 500,
      padding: '8px 16px',
      textAlign: 'center',
      position: 'relative',
      zIndex: 101,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    }}>
      <span>
        {language === 'ar'
          ? '✨ افتتحنا مكاتب جديدة في طابق جدة الفاخر — احجز جولتك اليوم واحصل على خصم 15٪ للشهر الأول!'
          : '✨ New Private Offices open on the Jeddah floor — Book your tour today for 15% off month one!'}
      </span>

      <a
        href="/book-tour"
        style={{
          textDecoration: 'underline',
          fontWeight: 700,
          color: '#FFFFFF',
          whiteSpace: 'nowrap'
        }}
      >
        {language === 'ar' ? 'احجز الجولة ←' : 'Book Tour →'}
      </a>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        style={{
          position: 'absolute',
          right: language === 'ar' ? 'auto' : '16px',
          left: language === 'ar' ? '16px' : 'auto',
          background: 'none',
          border: 'none',
          color: '#FFFFFF',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
}
