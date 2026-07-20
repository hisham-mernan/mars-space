'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function InvoicesLog() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await fetch('/api/v1/public/homepage');
        const json = await res.json();
        if (json.success) {
          // Seeds invoices list
          setInvoices([
            {
              id: "inv-2026-001245",
              invoiceNumber: "INV-2026-001245",
              date: "2026-06-28",
              dueDate: "2026-07-05",
              type: "Membership",
              description: "Mars Premium Membership - Business Plan",
              amount: 2400,
              status: "Paid",
              paymentMethod: "Visa ending 4827",
              subtotal: 2086.96,
              vat: 313.04,
              total: 2400
            },
            {
              id: "inv-2026-001288",
              invoiceNumber: "INV-2026-001288",
              date: "2026-07-10",
              dueDate: "2026-07-27",
              type: "Booking",
              description: "Meeting Room Alpha - 2 hours",
              amount: 160,
              status: "Unpaid",
              paymentMethod: "—",
              subtotal: 139.13,
              vat: 20.87,
              total: 160
            },
            {
              id: "inv-2026-001302",
              invoiceNumber: "INV-2026-001302",
              date: "2026-07-10",
              dueDate: "2026-07-15", // Overdue
              type: "Service",
              description: "Locker Unit Rental",
              amount: 150,
              status: "Unpaid",
              paymentMethod: "—",
              subtotal: 130.43,
              vat: 19.57,
              total: 150
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadInvoices();
  }, [user]);

  if (!mounted || !user) return null;

  const handlePayInvoice = (id) => {
    setInvoices(prev =>
      prev.map(inv => (inv.id === id ? { ...inv, status: 'Paid', paymentMethod: 'Mada' } : inv))
    );
    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice(prev => ({ ...prev, status: 'Paid', paymentMethod: 'Mada' }));
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (activeFilter === 'all') return true;
    return inv.status.toLowerCase() === activeFilter;
  });

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
    <div style={{ display: 'grid', gap: '32px', position: 'relative' }}>
      
      {/* Page Header */}
      <div style={{ textAlign: 'start' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'سجل الفواتير والمالية' : 'Financial Invoices'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          {language === 'ar' ? 'عرض فواتير اشتراكاتك والخدمات الإضافية وتاريخ المدفوعات.' : 'Monitor all invoice logs related to memberships, bookings, and printing.'}
        </p>
      </div>

      {/* KPI Cards section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--mars-slate)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ المستحق' : 'Outstanding Balance'}</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {invoices.filter(i => i.status === 'Unpaid').reduce((a, b) => a + b.amount, 0)} SAR
          </div>
        </div>
        <div style={{ background: 'var(--mars-slate)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المدفوعات هذا العام' : 'Paid This Year'}</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
            {invoices.filter(i => i.status === 'Paid').reduce((a, b) => a + b.amount, 0)} SAR
          </div>
        </div>
      </div>

      {/* Outstanding Balance Warning Banner */}
      {invoices.some(i => i.status === 'Unpaid') && (
        <div style={{
          background: 'rgba(200, 107, 60, 0.08)',
          border: '1px solid rgba(200, 107, 60, 0.3)',
          borderRadius: '8px',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {language === 'ar' 
              ? 'تنبيه: لديك فواتير مستحقة الدفع حالياً. الرجاء سدادها لتجنب انقطاع الميزات.' 
              : 'Attention: You have outstanding invoices. Please settle them to prevent services interruptions.'}
          </span>
          <button
            onClick={() => handlePayInvoice(invoices.find(i => i.status === 'Unpaid').id)}
            className="btn-pill-primary"
            style={{ padding: '8px 20px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
          >
            {language === 'ar' ? 'دفع الفاتورة المستحقة' : 'Pay Outstanding'}
          </button>
        </div>
      )}

      {/* Filters selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '20px' }}>
        {['all', 'paid', 'unpaid'].map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                color: isActive ? 'var(--copper-400)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--copper-400)' : 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Invoices List Table */}
      <div style={{ background: 'var(--mars-slate)', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Invoice No</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Type</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Due Date</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Amount</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => {
              const statusColor = inv.status === 'Paid' ? '#4CAF50' : '#FF4A4A';
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{inv.type}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{inv.dueDate}</td>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{inv.amount} SAR</td>
                  <td style={{ padding: '16px 24px', color: statusColor, fontWeight: 600 }}>{inv.status}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      {language === 'ar' ? 'عرض التفاصيل' : 'View'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Slide-out Drawer */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: language === 'ar' ? 'auto' : 0,
          left: language === 'ar' ? 0 : 'auto',
          width: 'min(100%, 480px)',
          background: 'var(--mars-slate)',
          borderLeft: language === 'ar' ? 'none' : '1px solid var(--border-color)',
          borderRight: language === 'ar' ? '1px solid var(--border-color)' : 'none',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          zIndex: 100,
          padding: '40px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Drawer Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>{selectedInvoice.invoiceNumber}</h3>
            <button
              onClick={() => setSelectedInvoice(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Drawer Body details */}
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '24px', display: 'grid', gap: '20px', fontSize: '14px', textAlign: 'start' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ الفاتورة' : 'Invoice Date'}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedInvoice.date}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedInvoice.dueDate}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الحالة' : 'Status'}</div>
                <div style={{ fontWeight: 600, color: selectedInvoice.status === 'Paid' ? '#4CAF50' : '#FF4A4A', marginTop: '4px' }}>
                  {selectedInvoice.status}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'وسيلة الدفع' : 'Payment Method'}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedInvoice.paymentMethod}</div>
              </div>
            </div>

            {/* Line items list */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>{language === 'ar' ? 'تفاصيل الرسوم' : 'Line Items'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{selectedInvoice.description}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedInvoice.subtotal} SAR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>VAT (15%)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedInvoice.vat} SAR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                <span>{language === 'ar' ? 'الإجمالي' : 'Total Amount'}</span>
                <span>{selectedInvoice.total} SAR</span>
              </div>
            </div>

          </div>

          {/* Drawer Footer Actions */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'grid', gap: '10px' }}>
            {selectedInvoice.status === 'Unpaid' && (
              <button
                onClick={() => handlePayInvoice(selectedInvoice.id)}
                className="btn-pill-primary"
                style={{ width: '100%', padding: '12px 0', fontSize: '14px', border: 'none', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'دفع الفاتورة الآن' : 'Pay Invoice Now'}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="btn-pill-secondary"
              style={{ width: '100%', padding: '12px 0', fontSize: '14px', cursor: 'pointer' }}
            >
              {language === 'ar' ? 'طباعة وتنزيل PDF' : 'Download Invoice PDF'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
