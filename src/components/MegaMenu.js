'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MegaMenu({ isOpen, onClose }) {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const categories = [
    {
      title: t?.megaMenu?.offices || (language === 'ar' ? 'مكاتب خاصة' : 'Private Offices'),
      desc: t?.megaMenu?.officesDesc || (language === 'ar' ? 'مكاتب قابلة للإغلاق للفرق، مُسجّلة باسمك' : 'Lockable offices for teams, registered to your name'),
      href: '/spaces?category=private_office',
      icon: '🏢'
    },
    {
      title: t?.megaMenu?.desks || (language === 'ar' ? 'مكاتب مشتركة' : 'Coworking Desks'),
      desc: t?.megaMenu?.desksDesc || (language === 'ar' ? 'مكاتب مرنة باليوم، ومكاتب مُخصّصة بالشهر' : 'Hot desks by the day, dedicated desks by the month'),
      href: '/spaces?category=coworking',
      icon: '🖥️'
    },
    {
      title: t?.megaMenu?.rooms || (language === 'ar' ? 'قاعات اجتماعات' : 'Meeting Rooms'),
      desc: t?.megaMenu?.roomsDesc || (language === 'ar' ? 'قاعات مُجهّزة كما ينبغي، قابلة للحجز بالساعة' : 'Properly equipped rooms, bookable by the hour'),
      href: '/spaces?category=meeting_room',
      icon: '🎙️'
    },
    {
      title: t?.megaMenu?.pods || (language === 'ar' ? 'غرف تركيز' : 'Focus Pods'),
      desc: t?.megaMenu?.podsDesc || (language === 'ar' ? 'غرف لشخص واحد للمكالمات والعمل العميق' : 'Single-occupancy rooms for calls and deep work'),
      href: '/spaces?category=focus_pod',
      icon: '🎧'
    },
    {
      title: t?.megaMenu?.community || (language === 'ar' ? 'مساحة مجتمعية' : 'Community Space'),
      desc: t?.megaMenu?.communityDesc || (language === 'ar' ? 'مُهيّأة للمحاضرات والورش والإطلاقات' : 'Arranged for talks, workshops and launches'),
      href: '/events',
      icon: '✨'
    },
    {
      title: t?.megaMenu?.cafe || (language === 'ar' ? 'المقهى والاستراحة' : 'Café & Lounge'),
      desc: t?.megaMenu?.cafeDesc || (language === 'ar' ? 'قهوة مختصة وجلسات هادئة ضمن كل باقة' : 'Specialty coffee and quiet seating included'),
      href: '/spaces?category=cafe',
      icon: '☕'
    }
  ];

  return (
    <div
      onMouseLeave={onClose}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        background: 'var(--mars-slate)',
        borderBottom: '1px solid var(--line-dark)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        padding: '32px clamp(24px, 4vw, 72px)',
        zIndex: 99,
        animation: 'fadeIn 200ms ease-out'
      }}
    >
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
            {t?.megaMenu?.heading || (language === 'ar' ? 'طابقٌ واحد منتقى' : 'One curated floor')}
          </span>
          <a href="/spaces" style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'underline' }}>
            {language === 'ar' ? 'استعرض الطابق ←' : 'See the floor →'}
          </a>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {categories.map((cat, idx) => (
            <a
              key={idx}
              href={cat.href}
              onClick={onClose}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '16px',
                borderRadius: '8px',
                background: 'var(--surface-1)',
                border: '1px solid var(--glass-border)',
                transition: 'border-color 200ms, transform 200ms'
              }}
              className="glass-card"
            >
              <div style={{ fontSize: '24px', flexShrink: 0 }}>{cat.icon}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px' }}>
                  {cat.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', lineHeight: 1.4 }}>
                  {cat.desc}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer line of the mega menu */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(245,243,239,0.08)', fontSize: '13px', color: '#A8A49D', fontStyle: 'italic', textAlign: language === 'ar' ? 'right' : 'left' }}>
          {t?.megaMenu?.footerLine || (language === 'ar' ? 'كل شيء على بُعد خطوات.' : 'Everything is a few steps apart.')}
        </div>
      </div>
    </div>
  );
}
