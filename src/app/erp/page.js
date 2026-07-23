'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpOperations() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [cockpitData, setCockpitData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Operations Checklist tasks
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

    async function loadCockpit() {
      try {
        const res = await fetch('/api/v1/erp/cockpit');
        const json = await res.json();
        if (json.success) {
          setCockpitData(json.data);
        }
      } catch (err) {
        console.error('Failed loading cockpit data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCockpit();
  }, []);

  if (!mounted || !user) return null;

  const toggleTask = (id) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const kpis = cockpitData?.kpis || {
    activeMembers: '642',
    occupancyRate: '94%',
    occupiedDetails: '45/48 Suites Occupied',
    roomsBookedToday: '31 / 36',
    roomUtilizationRate: '86%',
    todayRevenue: '18,450 SAR',
    processedInvoicesCount: 12,
    openTicketsCount: '8 Open'
  };

  const activities = cockpitData?.activities || [];

  return (
    <div style={{ display: 'grid', gap: '28px' }} className="animate-fade-in">
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="status-pill status-pill-copper" style={{ marginBottom: '8px' }}>
            {language === 'ar' ? 'غرفة العمليات الرئيسية · جدة' : 'OPERATIONS COCKPIT · JEDDAH HQ'}
          </div>
          <h1 style={{ fontSize: '26px', color: 'var(--text-primary)', fontWeight: 300, margin: 0, letterSpacing: '-0.02em' }}>
            {language === 'ar' ? 'لوحة قيادة العمليات الموحدة' : 'Executive Operations Center'}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            {language === 'ar' ? 'متابعة العمليات اليومية ومؤشرات الأداء والتقارير المالية.' : 'Live facility telemetry, telemetry counters, and pending approvals queue.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert('Generating operational summary report...')}
            className="btn-pill-secondary"
            style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '6px' }}
          >
            {language === 'ar' ? 'تصدير التقرير' : 'Export Summary'}
          </button>
        </div>
      </div>

      {/* Executive Telemetry KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {[
          { label: language === 'ar' ? 'الأعضاء النشطين' : 'Active Members', val: kpis.activeMembers, sub: '▲ Real-time active count', color: 'var(--copper-400)' },
          { label: language === 'ar' ? 'نسبة إشغال المكاتب' : 'Office Occupancy', val: kpis.occupancyRate, sub: kpis.occupiedDetails, color: '#FFFFFF' },
          { label: language === 'ar' ? 'القاعات المحجوزة اليوم' : 'Rooms Booked Today', val: kpis.roomsBookedToday, sub: `${kpis.roomUtilizationRate} utilization`, color: '#FFFFFF' },
          { label: language === 'ar' ? 'إيرادات اليوم' : "Today's Revenue", val: kpis.todayRevenue, sub: `${kpis.processedInvoicesCount} invoices processed`, color: 'var(--copper-400)' },
          { label: language === 'ar' ? 'التذاكر المفتوحة' : 'Open Support Tickets', val: kpis.openTicketsCount, sub: 'Support Desk Queue', color: '#FFFFFF' }
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="glass-card"
            style={{
              padding: '20px',
              textAlign: 'start'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{kpi.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color, marginTop: '8px', fontVariantNumeric: 'tabular-nums' }}>{kpi.val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Main dashboard widgets grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '28px',
        alignItems: 'start'
      }}>
        
        {/* Live Activity Feed */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '28px' }}>
          
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              {language === 'ar' ? 'سجل العمليات والنشاط المباشر' : 'Live Operations Telemetry Stream'}
            </h3>

            <div style={{ display: 'grid', gap: '20px', position: 'relative' }}>
              {activities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    textAlign: 'start'
                  }}
                >
                  <span className="status-pill status-pill-copper" style={{ flexShrink: 0 }}>
                    {act.time || 'NOW'}
                  </span>

                  <div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {language === 'ar' ? (act.descAr || act.desc) : act.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Urgent Checklist */}
        <div style={{ display: 'grid', gap: '28px' }}>
          
          {/* Urgent Checklist Widget */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              {language === 'ar' ? 'قائمة المهام العاجلة' : 'Pending Operations Tasks'}
            </h3>

            <div style={{ display: 'grid', gap: '12px' }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'start',
                    gap: '12px',
                    opacity: task.done ? 0.5 : 1,
                    textDecoration: task.done ? 'line-through' : 'none',
                    transition: 'all 140ms ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    readOnly
                    style={{ marginTop: '3px', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'grid', gap: '4px', fontSize: '12px', textAlign: 'start' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.label}</div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>{task.category}</span>
                      <span>·</span>
                      <span style={{ color: task.priority === 'High' ? 'var(--status-crimson)' : 'var(--text-secondary)' }}>
                        {task.priority} Priority
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reports Shortcuts */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              {language === 'ar' ? 'التقارير السريعة' : 'Quick Reports'}
            </h3>
            
            <div style={{ display: 'grid', gap: '10px' }}>
              {[
                { name: language === 'ar' ? 'تقرير إشغال المساحات' : 'Occupancy Telemetry Report' },
                { name: language === 'ar' ? 'القوائم المالية والاشتراكات' : 'Financial Statement Analysis' },
                { name: language === 'ar' ? 'سجل نمو الأعضاء' : 'Memberships Growth Log' }
              ].map((rep, idx) => (
                <button
                  key={idx}
                  onClick={() => alert(`Generating ${rep.name} PDF...`)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    textAlign: 'start',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 140ms ease'
                  }}
                  className="glass-card"
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
