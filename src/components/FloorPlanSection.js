'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function FloorPlanSection() {
  const { t, language } = useLanguage();
  const [activeZone, setActiveZone] = useState(2); // Default to Meeting rooms (index 2)
  const [live, setLive] = useState(true);

  const zones = [
    {
      id: 0,
      img: '/assets/photo-glass-offices.jpg',
      link: '#floor',
    },
    {
      id: 1,
      img: '/assets/photo-coworking.jpg',
      link: '#floor',
    },
    {
      id: 2,
      img: '/assets/photo-glass-offices.jpg',
      link: '#rooms',
    },
    {
      id: 3,
      img: '/assets/photo-community-cinema.jpg',
      link: '#floor',
    },
    {
      id: 4,
      img: '/assets/photo-community-cinema.jpg',
      link: '#community',
    },
    {
      id: 5,
      img: '/assets/photo-lounge-velvet.jpg',
      link: '#floor',
    },
  ];

  // Helper colors for SVG zones
  const getZoneFill = (index) => {
    return activeZone === index ? 'rgba(200, 107, 60, 0.10)' : 'transparent';
  };

  const getZoneStroke = (index) => {
    return activeZone === index ? '#C86B3C' : 'rgba(200, 107, 60, 0.55)';
  };

  const currentZoneData = t.zones.items[activeZone];
  const currentZoneMeta = zones[activeZone];

  const zoneStatusText =
    activeZone === 2 && !live
      ? language === 'ar'
        ? 'احجز بالساعة'
        : 'Book by the hour'
      : language === 'ar'
      ? t.floorPlan.interactive[
          activeZone === 0
            ? 'offices1'
            : activeZone === 1
            ? 'coworking'
            : activeZone === 2
            ? 'meetingRooms'
            : activeZone === 3
            ? 'phoneBooths'
            : activeZone === 4
            ? 'community'
            : 'cafe'
        ] // Actually let's use the status from translation
      : '';

  // Use status fields from translations
  const statusValues = {
    0: language === 'ar' ? 'طلب حجز · شهري' : 'Enquiry-led · monthly',
    1: language === 'ar' ? 'بطاقة يومية أو عضوية' : 'Day pass or membership',
    2: live
      ? language === 'ar'
        ? '3 من 4 قاعات متاحة الآن'
        : '3 of 4 free right now'
      : language === 'ar'
      ? 'احجز بالساعة'
      : 'Book by the hour',
    3: language === 'ar' ? '2 كبائن شاغرة الآن' : '2 booths free now',
    4: language === 'ar' ? 'بالساعة أو نصف يوم' : 'Hourly or half-day',
    5: language === 'ar' ? 'مشمول مع كل حجز' : 'Included with every booking',
  };

  const statusLineText = live ? t.floorPlan.legend.liveActive : t.floorPlan.legend.liveInactive;

  return (
    <section
      id="floor"
      data-screen-label="The Floor"
      style={{
        background: 'var(--mars-void)',
        padding: 'clamp(80px, 12vw, 150px) 0 clamp(88px, 13vw, 160px)',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ maxWidth: '820px' }} className="reveal-init reveal-active">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--copper-400)' }}>
              {t.floorPlan.eyebrow}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted-dark)' }}>
              {language === 'ar' ? 'الطابق' : 'The Floor'}
            </span>
          </div>
          <h2
            style={{
              margin: '20px 0 0',
              fontSize: 'clamp(28px, 3vw, 40px)',
              fontWeight: 300,
              letterSpacing: '-0.015em',
              lineHeight: 1.15,
            }}
          >
            {t.floorPlan.h2}
          </h2>
          <p style={{ margin: '20px 0 0', color: 'rgba(245, 245, 245, 0.72)', maxWidth: '58ch' }}>
            {t.floorPlan.body}
          </p>
        </div>

        {/* Interactive Floor Plan Grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '48px',
            marginTop: '56px',
            alignItems: 'flex-start',
          }}
        >
          {/* SVG Floor Plan Column */}
          <div style={{ flex: '1.65 1 460px', minWidth: 0 }}>
            <div className="floorplan-svg-container">
              <svg
                viewBox="0 0 1000 780"
                role="img"
                aria-label="Floor plan of Mars Space"
              >
              {/* Outer boundary */}
              <rect
                x="30"
                y="30"
                width="940"
                height="710"
                fill="none"
                stroke="rgba(200, 107, 60, 0.8)"
                strokeWidth="1.5"
                pathLength="1"
                strokeDasharray="1"
                style={{ animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 0ms both' }}
              />

              {/* Service Areas (Fixed, non-interactive) */}
              <g style={{ animation: 'fadeIn 500ms 700ms both' }}>
                <rect x="30" y="30" width="450" height="95" fill="none" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="120" y1="30" x2="120" y2="125" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="185" y1="30" x2="185" y2="125" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="330" y1="30" x2="330" y2="125" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="45" y="83" style={{ fontSize: '11px', fill: '#5A5A62' }}>
                  {language === 'ar' ? 'الدرج' : 'Stairs'}
                </text>
                <text x="133" y="83" style={{ fontSize: '11px', fill: '#5A5A62' }}>
                  {language === 'ar' ? 'المصاعد' : 'Lifts'}
                </text>
                <text x="200" y="83" style={{ fontSize: '11px', fill: '#5A5A62' }}>
                  {language === 'ar' ? 'دورات مياه · خدمات' : 'Showers · services'}
                </text>
                <text x="345" y="83" style={{ fontSize: '11px', fill: '#5A5A62' }}>
                  {language === 'ar' ? 'حمامات' : 'WC'}
                </text>
              </g>

              {/* Zone 3: Phone booths */}
              <g onClick={() => setActiveZone(3)} style={{ cursor: 'pointer' }}>
                <rect
                  x="500"
                  y="30"
                  width="140"
                  height="95"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(3)}
                  fill={getZoneFill(3)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 480ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <line x1="547" y1="30" x2="547" y2="125" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="594" y1="30" x2="594" y2="125" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="510" y="60" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'كابينة' : 'Phone'}
                </text>
                <text x="510" y="76" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'هاتف' : 'booths'}
                </text>
                <text
                  x="510"
                  y="112"
                  fill={live ? '#C86B3C' : 'transparent'}
                  style={{ fontSize: '11px', fontWeight: 500, pointerEvents: 'none' }}
                >
                  {language === 'ar' ? '● 2 شاغرة' : '● 2 free'}
                </text>
              </g>

              {/* Zone 0: Offices 01 - 08 */}
              <g onClick={() => setActiveZone(0)} style={{ cursor: 'pointer' }}>
                <rect
                  x="660"
                  y="30"
                  width="310"
                  height="430"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(0)}
                  fill={getZoneFill(0)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 120ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <line x1="815" y1="30" x2="815" y2="460" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="660" y1="138" x2="970" y2="138" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="660" y1="245" x2="970" y2="245" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="660" y1="353" x2="970" y2="353" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="676" y="60" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مكاتب 01 – 08' : 'Offices 01 – 08'}
                </text>
              </g>

              {/* Zone 0: Offices 13 - 18 */}
              <g onClick={() => setActiveZone(0)} style={{ cursor: 'pointer' }}>
                <rect
                  x="30"
                  y="150"
                  width="270"
                  height="310"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(0)}
                  fill={getZoneFill(0)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 200ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <line x1="165" y1="150" x2="165" y2="460" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="30" y1="253" x2="300" y2="253" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="30" y1="356" x2="300" y2="356" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="46" y="180" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مكاتب 13 – 18' : 'Offices 13 – 18'}
                </text>
              </g>

              {/* Zone 0: Offices 19 - 21 */}
              <g onClick={() => setActiveZone(0)} style={{ cursor: 'pointer' }}>
                <rect
                  x="330"
                  y="150"
                  width="310"
                  height="90"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(0)}
                  fill={getZoneFill(0)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 280ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <line x1="433" y1="150" x2="433" y2="240" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="537" y1="150" x2="537" y2="240" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="346" y="180" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مكاتب 19 – 21' : 'Offices 19 – 21'}
                </text>
              </g>

              {/* Zone 1: Coworking */}
              <g onClick={() => setActiveZone(1)} style={{ cursor: 'pointer' }}>
                <rect
                  x="330"
                  y="250"
                  width="310"
                  height="210"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(1)}
                  fill={getZoneFill(1)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 240ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <text x="346" y="280" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مكاتب مشتركة' : 'Coworking'}
                </text>
                <text x="346" y="298" style={{ fontSize: '11px', fill: '#8E8E96', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مكاتب مشتركة ومخصصة' : 'Hot and dedicated desks'}
                </text>
                <g style={{ animation: 'fadeIn 400ms 1000ms both', pointerEvents: 'none' }}>
                  <rect x="360" y="330" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="396" y="330" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="432" y="330" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="468" y="330" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="504" y="330" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="540" y="330" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="360" y="372" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="396" y="372" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="432" y="372" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="468" y="372" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="504" y="372" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="540" y="372" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="360" y="414" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="396" y="414" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="432" y="414" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="468" y="414" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="504" y="414" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <rect x="540" y="414" width="26" height="12" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                </g>
              </g>

              {/* Zone 5: Café and lounge */}
              <g onClick={() => setActiveZone(5)} style={{ cursor: 'pointer' }}>
                <rect
                  x="30"
                  y="480"
                  width="270"
                  height="260"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(5)}
                  fill={getZoneFill(5)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 720ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <text x="46" y="510" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'المقهى والاستراحة' : 'Café and lounge'}
                </text>
                <text x="46" y="528" style={{ fontSize: '11px', fill: '#8E8E96', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مطبخ تحضيري · ركن الطباعة' : 'Pantry · printing corner'}
                </text>
                <g style={{ animation: 'fadeIn 400ms 1000ms both', pointerEvents: 'none' }}>
                  <circle cx="80" cy="590" r="14" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <circle cx="140" cy="620" r="14" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <circle cx="90" cy="670" r="14" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                  <circle cx="200" cy="660" r="14" fill="none" stroke="rgba(200, 107, 60, 0.4)" />
                </g>
              </g>

              {/* Zone 2: Meeting rooms */}
              <g onClick={() => setActiveZone(2)} style={{ cursor: 'pointer' }}>
                <rect
                  x="330"
                  y="480"
                  width="310"
                  height="120"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(2)}
                  fill={getZoneFill(2)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 360ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <line x1="407" y1="480" x2="407" y2="600" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="485" y1="480" x2="485" y2="600" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="562" y1="480" x2="562" y2="600" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="346" y="510" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'قاعات الاجتماعات' : 'Meeting rooms'}
                </text>
                <text
                  x="346"
                  y="585"
                  fill={live ? '#C86B3C' : 'transparent'}
                  style={{ fontSize: '11px', fontWeight: 500, pointerEvents: 'none' }}
                >
                  {language === 'ar' ? '● 3 من 4 شاغرة الآن' : '● 3 of 4 free now'}
                </text>
              </g>

              {/* Zone 0: Offices 09 - 12 */}
              <g onClick={() => setActiveZone(0)} style={{ cursor: 'pointer' }}>
                <rect
                  x="330"
                  y="620"
                  width="310"
                  height="120"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(0)}
                  fill={getZoneFill(0)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 440ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <line x1="407" y1="620" x2="407" y2="740" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="485" y1="620" x2="485" y2="740" stroke="rgba(200, 107, 60, 0.35)" />
                <line x1="562" y1="620" x2="562" y2="740" stroke="rgba(200, 107, 60, 0.35)" />
                <text x="346" y="650" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مكاتب 09 – 12' : 'Offices 09 – 12'}
                </text>
              </g>

              {/* Zone 4: Community space */}
              <g onClick={() => setActiveZone(4)} style={{ cursor: 'pointer' }}>
                <rect
                  x="660"
                  y="480"
                  width="310"
                  height="260"
                  strokeWidth="1.5"
                  pathLength="1"
                  strokeDasharray="1"
                  stroke={getZoneStroke(4)}
                  fill={getZoneFill(4)}
                  style={{
                    animation: 'planDraw 700ms cubic-bezier(0.16, 1, 0.30, 1) 600ms both',
                    transition: 'all 120ms',
                  }}
                  className="svg-hotspot"
                />
                <text x="676" y="510" style={{ fontSize: '12px', fontWeight: 500, fill: 'rgba(245, 245, 245, 0.88)', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'المساحة المجتمعية' : 'Community space'}
                </text>
                <text x="676" y="528" style={{ fontSize: '11px', fill: '#8E8E96', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'فعاليات · شاشة عرض' : 'Events · screen wall'}
                </text>
                <text x="885" y="725" style={{ fontSize: '11px', fill: '#5A5A62', pointerEvents: 'none' }}>
                  {language === 'ar' ? 'مصعد · درج' : 'Lift · stairs'}
                </text>
              </g>
            </svg>
            </div>

            {/* Live occupancy status indicator */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 28px', marginTop: '24px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--copper-400)' }}>
                {live ? t.floorPlan.legend.liveActive : t.floorPlan.legend.liveInactive}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'العرض المباشر متصل بنظام الحجز' : 'Live availability is connected to the booking engine'}
              </span>
            </div>
          </div>

          {/* Details Card Panel Column */}
          <div
            style={{
              flex: '1 1 320px',
              minWidth: 0,
              background: 'var(--mars-slate)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Image display */}
            <div
              style={{
                aspectRatio: '3/2',
                background: '#26262E',
                backgroundImage: `url(${currentZoneMeta.img})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'background-image var(--dur-base) var(--ease-out)',
              }}
            />

            {/* Text details */}
            <div style={{ padding: '28px' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--copper-400)' }}>
                {language === 'ar' ? currentZoneData.ar : currentZoneData.name}
              </div>
              <h3
                style={{
                  margin: '8px 0 0',
                  fontSize: '26px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.25,
                  color: 'var(--mars-paper)',
                }}
              >
                {currentZoneData.name}
              </h3>
              <p style={{ margin: '14px 0 0', fontSize: '15px', color: 'var(--text-muted-dark)', lineHeight: 1.6 }}>
                {currentZoneData.line}
              </p>

              {/* Attributes */}
              <div style={{ display: 'grid', gap: 0, marginTop: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '12px 0',
                    borderTop: '1px solid rgba(245, 245, 245, 0.10)',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted-dark)', fontWeight: 500 }}>
                    {language === 'ar' ? 'السعة' : 'Capacity'}
                  </span>
                  <span>{currentZoneData.cap}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '12px 0',
                    borderTop: '1px solid rgba(245, 245, 245, 0.10)',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ color: 'var(--text-muted-dark)', fontWeight: 500 }}>
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </span>
                  <span style={{ color: 'var(--copper-400)', fontWeight: 500 }}>
                    {statusValues[activeZone]}
                  </span>
                </div>
              </div>

              {/* CTA Link */}
              <a
                href={currentZoneMeta.link}
                className="btn-pill-primary"
                style={{
                  display: 'inline-flex',
                  padding: '13px 28px',
                  fontSize: '15px',
                  marginTop: '24px',
                  width: '100%',
                  boxSizing: 'border-box',
                  justifyContent: 'center',
                }}
              >
                {currentZoneData.cta.replace(' →', '').replace(' ←', '')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
