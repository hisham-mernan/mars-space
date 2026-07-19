'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ReportsDashboard() {
  const { language, mounted } = useLanguage();
  const [user, setUser] = useState(null);

  // Scheduled reports config states
  const [reportType, setReportType] = useState('Profit & Loss');
  const [frequency, setFrequency] = useState('Weekly');
  const [recipients, setRecipients] = useState('ceo@mars.space');
  const [schedules, setSchedules] = useState([
    { id: 'sch-1', type: 'Profit & Loss', freq: 'Monthly', email: 'cfo@mars.space' }
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleAddSchedule = (e) => {
    e.preventDefault();
    if (!recipients) return;

    const newSch = {
      id: `sch-${Date.now()}`,
      type: reportType,
      freq: frequency,
      email: recipients
    };

    setSchedules([...schedules, newSch]);
    setRecipients('');
    alert("Report scheduler automated successfully!");
  };

  const handleRemoveSchedule = (id) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  const handleDownload = (name, format) => {
    alert(`Compiling ${name}... Exporting to ${format} file format.`);
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'التقارير المالية والتشغيلية المتقدمة' : 'Advanced Operations Reports'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'تنزيل كشوفات الأرباح والخسائر وحالة الميزانية العمومية وأتمتة إرسال التقارير.' : 'Download comprehensive financial and occupancy statements or automate recurring email delivery.'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Report Logs & Downloads */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'سجل البيانات المالية والتشغيلية' : 'Financial Statement Exports'}
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                { name: 'Profit & Loss Statement (P&L)', period: 'Q2 2026', type: 'Financial' },
                { name: 'Balance Sheet', period: 'As of June 30, 2026', type: 'Financial' },
                { name: 'Space Utilization & Occupancy Log', period: 'Jeddah Towers - MTD', type: 'Operational' },
                { name: 'AR/AP Aging Report', period: 'Outstanding Balances', type: 'Financial' }
              ].map((rep, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--mars-void)',
                    padding: '20px',
                    borderRadius: '6px',
                    border: '1px solid var(--line-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div style={{ textAlign: 'start' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{rep.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                      Period: {rep.period} · Category: {rep.type}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['PDF', 'Excel', 'CSV'].map((format) => (
                      <button
                        key={format}
                        onClick={() => handleDownload(rep.name, format)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--line-dark)',
                          borderRadius: '4px',
                          color: '#FFFFFF',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Automated Scheduler Form */}
        <div>
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'جدولة التقارير التلقائية' : 'Report Delivery Scheduler'}
            </h3>

            <form onSubmit={handleAddSchedule} style={{ display: 'grid', gap: '16px', fontSize: '13px', textAlign: 'start' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                Report Type
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                  <option value="Profit & Loss">Profit & Loss (P&L)</option>
                  <option value="Occupancy Status">Occupancy Status</option>
                  <option value="Cash Flow Projections">Cash Flow Projections</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                Frequency
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                Recipients Emails (Comma separated)
                <input type="text" required placeholder="ceo@mars.space" value={recipients} onChange={(e) => setRecipients(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <button type="submit" className="btn-pill-primary" style={{ padding: '12px 0', fontSize: '13px', border: 'none', cursor: 'pointer', marginTop: '12px' }}>
                Automate Scheduler
              </button>
            </form>

            {/* Active Schedules log */}
            {schedules.length > 0 && (
              <div style={{ marginTop: '32px', borderTop: '1px solid rgba(245,245,245,0.08)', paddingTop: '20px' }}>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginBottom: '12px', fontSize: '14px', textAlign: 'start' }}>Active Schedules</div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {schedules.map((sch) => (
                    <div
                      key={sch.id}
                      style={{
                        background: 'var(--mars-void)',
                        padding: '12px',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ textAlign: 'start' }}>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{sch.type} ({sch.freq})</div>
                        <div style={{ color: 'var(--text-muted-dark)', marginTop: '2px' }}>{sch.email}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveSchedule(sch.id)}
                        style={{ background: 'none', border: 'none', color: '#FF4A4A', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
