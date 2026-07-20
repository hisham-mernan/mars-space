'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpInvoices() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-001245",
      memberName: "Ahmed Alharbi",
      memberEmail: "ahmed@example.com",
      dueDate: "2026-07-05",
      amount: 2400,
      status: "Paid",
      remindersSent: { advance7d: true, post48h: false }
    },
    {
      id: "inv-2",
      invoiceNumber: "INV-2026-001288",
      memberName: "Sarah Khan",
      memberEmail: "sarah@example.com",
      dueDate: "2026-07-27", // Upcoming in 7 days
      amount: 160,
      status: "Unpaid",
      remindersSent: { advance7d: false, post48h: false }
    },
    {
      id: "inv-3",
      invoiceNumber: "INV-2026-001302",
      memberName: "Ahmed Alharbi",
      memberEmail: "ahmed@example.com",
      dueDate: "2026-07-15", // Overdue by 5 days
      amount: 150,
      status: "Unpaid",
      remindersSent: { advance7d: true, post48h: false }
    }
  ]);

  const [activeFilter, setActiveFilter] = useState('all');
  const [reminderLogs, setReminderLogs] = useState([
    { time: 'Yesterday 10:00 AM', text: 'Auto-sent 7-day advance reminder for INV-2026-001302 to Ahmed Alharbi.' }
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Load local invoices if saved
    const savedInvs = localStorage.getItem('mars-erp-invoices');
    if (savedInvs) {
      setInvoices(JSON.parse(savedInvs));
    }
    const savedLogs = localStorage.getItem('mars-erp-reminder-logs');
    if (savedLogs) {
      setReminderLogs(JSON.parse(savedLogs));
    }
  }, []);

  const saveInvoices = (newInvs) => {
    setInvoices(newInvs);
    localStorage.setItem('mars-erp-invoices', JSON.stringify(newInvs));
  };

  const saveLogs = (newLogs) => {
    setReminderLogs(newLogs);
    localStorage.setItem('mars-erp-reminder-logs', JSON.stringify(newLogs));
  };

  if (!mounted || !user) return null;

  const triggerReminder = (invId, type) => {
    const target = invoices.find(i => i.id === invId);
    if (!target) return;

    // Update invoice state
    const updated = invoices.map(i => {
      if (i.id === invId) {
        return {
          ...i,
          remindersSent: {
            ...i.remindersSent,
            [type]: true
          }
        };
      }
      return i;
    });
    saveInvoices(updated);

    // Add log
    const label = type === 'advance7d' ? '7-day Advance Reminder' : '48-hour Post-Due Alert';
    const textLog = `Manually sent ${label} for ${target.invoiceNumber} to ${target.memberName} (${target.memberEmail}).`;
    saveLogs([
      { time: new Date().toLocaleString(), text: textLog },
      ...reminderLogs
    ]);

    alert(`Notification dispatched: ${label} sent successfully to ${target.memberEmail}`);
  };

  const filteredInvoices = invoices.filter(inv => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'overdue') {
      const today = new Date();
      const due = new Date(inv.dueDate);
      return inv.status === 'Unpaid' && due < today;
    }
    return inv.status.toLowerCase() === activeFilter;
  });

  const totalOutstanding = invoices
    .filter(i => i.status === 'Unpaid')
    .reduce((acc, curr) => acc + curr.amount, 0);

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
      
      {/* Header */}
      <div style={{ textAlign: 'start' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'إدارة الفواتير والتذكيرات' : 'Invoices & Reminders Management'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          {language === 'ar' ? 'إرسال التنبيهات التلقائية والتحقق من تحصيل المستحقات والمدفوعات للأعضاء.' : 'Track receivables collection status, log payments, and schedule advance payment reminders.'}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Receivables MTD</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>2,710 SAR</div>
        </div>

        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Outstanding Balance</div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: totalOutstanding > 0 ? '#FF4A4A' : '#4CAF50', marginTop: '8px' }}>
            {totalOutstanding} SAR
          </div>
        </div>

        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Reminder Automation Status</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--copper-400)', marginTop: '12px' }}>
            ● Active (7d & 48h checks)
          </div>
        </div>
      </div>

      {/* Main Grid: Left Invoices Matrix, Right Reminder logs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column (Invoices log) */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '24px' }}>
          
          <div style={glassStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Invoices Directory</h3>
              
              {/* Filters */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['all', 'paid', 'unpaid', 'overdue'].map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      background: activeFilter === f ? 'var(--mars-copper)' : 'none',
                      border: '1px solid var(--border-color)',
                      color: activeFilter === f ? '#FFFFFF' : 'var(--text-primary)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'start' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Invoice / Member</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Due Date</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Amount</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>7-day Alert</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>48h Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoiceNumber}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{inv.memberName}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{inv.dueDate}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{inv.amount} SAR</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          color: inv.status === 'Paid' ? '#4CAF50' : '#FF4A4A',
                          background: inv.status === 'Paid' ? 'rgba(76,175,80,0.08)' : 'rgba(255,74,74,0.08)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {inv.status === 'Paid' ? (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        ) : inv.remindersSent.advance7d ? (
                          <span style={{ color: '#4CAF50', fontWeight: 600 }}>Sent ✓</span>
                        ) : (
                          <button
                            onClick={() => triggerReminder(inv.id, 'advance7d')}
                            style={{ background: 'var(--mars-copper)', border: 'none', color: '#FFFFFF', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Send
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {inv.status === 'Paid' ? (
                          <span style={{ color: 'var(--text-secondary)' }}>—</span>
                        ) : inv.remindersSent.post48h ? (
                          <span style={{ color: '#4CAF50', fontWeight: 600 }}>Sent ✓</span>
                        ) : (
                          <button
                            onClick={() => triggerReminder(inv.id, 'post48h')}
                            style={{
                              background: 'none',
                              border: '1px solid #FF4A4A',
                              color: '#FF4A4A',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            Alert
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column (Automation policy & logs) */}
        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* Policy Overview */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              Reminder Automations
            </h3>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'grid', gap: '12px', textAlign: 'start', lineHeight: 1.6 }}>
              <div>
                <b>⏰ 7 Days in Advance:</b>
                <div>Automatically triggers warning alerts to member emails/SMS containing invoicing draft details.</div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <b>🚨 48 Hours Post-Due:</b>
                <div>Dispatches urgent collection alerts to overdue members with Mada payment shortcuts.</div>
              </div>
            </div>
          </div>

          {/* Activity log */}
          <div style={glassStyle}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'start' }}>
              Alert Dispatch Logs
            </h3>
            <div style={{ display: 'grid', gap: '14px', maxHeight: '280px', overflowY: 'auto' }}>
              {reminderLogs.map((log, idx) => (
                <div key={idx} style={{ background: theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', textAlign: 'start' }}>
                  <div style={{ fontWeight: 700, color: 'var(--copper-400)' }}>{log.time}</div>
                  <div style={{ color: 'var(--text-primary)', marginTop: '4px', lineHeight: 1.5 }}>{log.text}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
