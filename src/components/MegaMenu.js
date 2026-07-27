'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MegaMenu({ isOpen, onClose }) {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const categories = [
    {
      title: language === 'ar' ? 'مكاتب خاصة' : 'Private Offices',
      desc: language === 'ar' ? 'أجنحة زجاجية مغلقة تتسع لـ 2 إلى 20 شخصاً' : 'Enclosed glass suites seating 2 to 20 people',
      href: '/spaces?category=private_office',
      icon: '🏢'
    },
    {
      title: language === 'ar' ? 'قاعات اجتماعات' : 'Meeting Rooms',
      desc: language === 'ar' ? 'شاشات ذكية وأنظمة اتصال مرئي فائق الوضوح' : 'Smart 75" screens and HD video conferencing',
      href: '/spaces?category=meeting_room',
      icon: '🎙️'
    },
    {
      title: language === 'ar' ? 'مكاتب مخصصة' : 'Dedicated Desks',
      desc: language === 'ar' ? 'نفس المكتب والكرسي والخزانة الشخصية كل يوم' : 'Your reserved desk, ergonomic chair & locker daily',
      href: '/spaces?category=dedicated_desk',
      icon: '🖥️'
    },
    {
      title: language === 'ar' ? 'مكاتب مشتركة' : 'Hot Desks',
      desc: language === 'ar' ? 'تصاريح مرنة يومية وشهرية في الصالة المفتوحة' : 'Flexible daily & monthly open lounge seating',
      href: '/spaces?category=hot_desk',
      icon: '☕'
    },
    {
      title: language === 'ar' ? 'كبائن التركيز' : 'Focus Pods',
      desc: language === 'ar' ? 'مساحات عازلة للصوت للمكالمات والعمل المنفرد' : 'Soundproof pods for private calls & deep work',
      href: '/spaces?category=focus_pod',
      icon: '🎧'
    },
    {
      title: language === 'ar' ? 'قاعة الفعاليات' : 'Event Space',
      desc: language === 'ar' ? 'تتسع لـ 80 شخصاً مع تجهيزات الصوت والإضاءة' : 'Hosts up to 80 guests with full A/V & lighting',
      href: '/spaces?category=event_space',
      icon: '✨'
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
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
            {language === 'ar' ? 'استكشف مساحات مارس' : 'EXPLORE MARS WORKSPACES'}
          </span>
          <a href="/spaces" style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textDecoration: 'underline' }}>
            {language === 'ar' ? 'عرض جميع المساحات ←' : 'View all spaces →'}
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
      </div>
    </div>
  );
}
