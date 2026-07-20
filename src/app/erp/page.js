'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpOperations() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Seeded Activity Feed timeline logs
  const [activities, setActivities] = useState([
    { id: 'act-1', time: '09:32 AM', desc: 'Ahmed Alharbi checked in', descAr: 'تم تسجيل دخول أحمد الحربي في الاستقبال', type: 'reception' },
    { id: 'act-2', time: '09:40 AM', desc: 'Sarah Khan submitted Support Ticket MSP-2043', descAr: 'قامت سارة خان برفع تذكرة الدعم MSP-2043', type: 'support' },
    { id: 'act-3', time: '10:05 AM', desc: 'Invoice INV-2026-001288 paid securely via Mada', descAr: 'تم سداد الفاتورة INV-2026-001288 بنجاح عبر مدى', type: 'finance' },
    { id: 'act-4', time: '11:12 AM', desc: 'Booking MS-BK-1002 generated for Office A-101', descAr: 'تم إنشاء حجز مخصص للمكتب A-101 برقم MS-BK-1002', type: 'booking' }
  ]);

  // Seeded Operations Checklist tasks
  const [tasks, setTasks] = useState([
    { id: 'tsk-1', label: 'Approve contract amendment for Mars Technologies', category: 'Approvals', priority: 'High', done: false },
    { id: 'tsk-2', label: 'Assign technician for locker lock replacement (MSP-2040)', category: 'Maintenance', priority: 'Medium', done: false },
    { id: 'tsk-3', label: 'Send outstanding balance reminder to overdues', category: 'Finance', priority: 'High', done: true }
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const toggleTask = (id) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const glassStyle = {
    background: theme === 'light'
      ? 'linear-gradient(135deg, rgba(11, 11, 15, 0.03) 0%, rgba(11, 11, 15, 0.01) 100%)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
    border: theme === 'light'
      ? '1px solid rgba(11, 11, 15, 0.08)'
      : '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(12px)',
    borderRadius: '12px',
    padding: '28px',
    boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Title */}
      <div style={{ textAlign: 'start' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'لوحة قيادة العمليات الموحدة' : 'Operations Command Cockpit'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          {language === 'ar' ? 'متابعة العمليات اليومية للفرع والتحقق من مؤشرات الأداء والتقارير المالية.' : 'Jeddah Towers branch live activity feed, executive KPIs, and urgent task lists.'}
        </p>
      </div>

      {/* Executive KPIs Grid (clickable KPIs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        {[
          { label: language === 'ar' ? 'الأعضاء النشطين' : 'Active Members', val: '642', sub: '▲ 18% this month', color: 'var(--copper-400)' },
          { label: language === 'ar' ? 'نسبة إشغال المكاتب' : 'Office Occupancy', val: '94%', sub: '45/48 Private Suites occupied', color: 'var(--text-primary)' },
          { label: language === 'ar' ? 'قاعات الاجتماعات المحجوزة' : 'Rooms Booked Today', val: '31 / 36', sub: '86% capacity utilization', color: 'var(--text-primary)' },
          { label: language === 'ar' ? 'إيرادات اليوم' : "Today's Revenue", val: '18,450 SAR', sub: '12 invoices processed', color: 'var(--copper-400)' },
          { label: language === 'ar' ? 'التذاكر المفتوحة' : 'Open Support Tickets', val: '8 Open', sub: '3 waiting for customer replies', color: 'var(--text-primary)' }
        ].map((kpi, idx) => (
          <div
            key={idx}
            style={{
              ...glassStyle,
              cursor: 'pointer',
              transition: 'transform 120ms ease',
              textAlign: 'start'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{kpi.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: kpi.color, marginTop: '8px' }}>{kpi.val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Main dashboard widgets grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left column: Live Activity Feed */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              {language === 'ar' ? 'شريط العمليات والنشاط المباشر' : 'Live Operations Activity Feed'}
            </h3>

            <div style={{ display: 'grid', gap: '24px', position: 'relative' }}>
              {/* Vertical timeline rule */}
              <div style={{
                position: 'absolute',
                top: '10px',
                bottom: '10px',
                left: language === 'ar' ? 'auto' : '20px',
                right: language === 'ar' ? '20px' : 'auto',
                width: '1px',
                background: 'var(--border-color)'
              }} />

              {activities.map((act) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex',
                    gap: '24px',
                    position: 'relative',
                    paddingLeft: language === 'ar' ? 0 : '40px',
                    paddingRight: language === 'ar' ? '40px' : 0,
                    boxSizing: 'border-box',
                    textAlign: 'start'
                  }}
                >
                  {/* Timeline dot */}
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    left: language === 'ar' ? 'auto' : '16px',
                    right: language === 'ar' ? '16px' : 'auto',
                    width: '9px',
                    height: '9px',
                    background: 'var(--mars-copper)',
                    borderRadius: '50%',
                    border: '2px solid var(--mars-slate)'
                  }} />

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--copper-400)', background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '4px' }}>
                      {act.time}
                    </span>
                    <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                      {language === 'ar' ? act.descAr : act.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Checklist & shortcuts */}
        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* Urgent Checklist Widget */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              {language === 'ar' ? 'تنبيهات وقائمة المهام العاجلة' : 'Urgent Checklist Alerts'}
            </h3>

            <div style={{ display: 'grid', gap: '14px' }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '12px',
                    opacity: task.done ? 0.6 : 1,
                    textDecoration: task.done ? 'line-through' : 'none',
                    transition: 'all 120ms ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    readOnly
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'grid', gap: '4px', fontSize: '13px', textAlign: 'start' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.label}</div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{task.category}</span>
                      <span>·</span>
                      <span style={{ color: task.priority === 'High' ? '#FF4A4A' : 'var(--text-secondary)' }}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reports Shortcuts */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              {language === 'ar' ? 'روابط التقارير السريعة' : 'Reports Quick Access'}
            </h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { name: language === 'ar' ? 'تقرير إشغال المساحات' : 'Occupancy & Utilization Report' },
                { name: language === 'ar' ? 'مؤشرات الأداء المالي' : 'Financial Statement Analysis' },
                { name: language === 'ar' ? 'تقرير نمو الأعضاء' : 'Memberships Growth Log' }
              ].map((rep, idx) => (
                <button
                  key={idx}
                  onClick={() => alert(`Generating ${rep.name} PDF...`)}
                  style={{
                    background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '14px 20px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'start',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 120ms ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--copper-400)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                  {rep.name}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
