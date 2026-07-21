'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function CrmKanban() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [pipeline, setPipeline] = useState({
    'Leads': [],
    'Contacted': [],
    'Proposal Sent': [],
    'Won': []
  });
  const [loading, setLoading] = useState(true);

  // Selected Lead details drawer state
  const [selectedLead, setSelectedLead] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationConverted, setQuotationConverted] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    async function loadPipeline() {
      try {
        const res = await fetch('/api/v1/erp/crm');
        const json = await res.json();
        if (json.success) {
          setPipeline(json.data);
        }
      } catch (err) {
        console.error('Failed to load CRM pipeline:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPipeline();
  }, []);

  if (!mounted || !user) return null;

  // Move lead card to another stage
  const moveLeadStage = async (id, newStage) => {
    try {
      const res = await fetch('/api/v1/erp/crm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: newStage })
      });
      const json = await res.json();
      if (json.success) {
        // Re-fetch pipeline
        const pipeRes = await fetch('/api/v1/erp/crm');
        const pipeJson = await pipeRes.json();
        if (pipeJson.success) {
          setPipeline(pipeJson.data);
        }
        if (newStage === 'Won') {
          alert(`Deal WON! Simulating conversion into an active Member, generating Contract draft, and issuing Invoice.`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuotation = () => {
    setShowQuotationModal(true);
    setQuotationConverted(false);
  };

  const handleConvertQuotation = () => {
    setQuotationConverted(true);
    if (selectedLead) {
      moveLeadStage(selectedLead.id, 'Proposal Sent');
      setSelectedLead(prev => ({ ...prev, stage: 'Proposal Sent' }));
    }
  };

  const columns = ['Leads', 'Contacted', 'Proposal Sent', 'Won'];

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Header */}
      <div style={{ textAlign: 'start' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'مبيعات الـ CRM والصفقات' : 'CRM Sales pipeline'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          {language === 'ar' ? 'إدارة فرص المبيعات والعملاء المحتملين وتتبع جولات المعاينة وصياغة العقود.' : 'Drag and drop leads between pipeline stages to trigger workflows and track conversions.'}
        </p>
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))`,
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '20px',
        boxSizing: 'border-box'
      }}>
        {columns.map((colName) => {
          const colLeads = pipeline[colName] || [];
          const colValue = colLeads.reduce((a, b) => a + Number(b.value || 0), 0);

          return (
            <div
              key={colName}
              style={{
                background: theme === 'light'
                  ? 'linear-gradient(135deg, rgba(11, 11, 15, 0.03) 0%, rgba(11, 11, 15, 0.01) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '440px',
                boxSizing: 'border-box'
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{colName}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{colLeads.length}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--copper-400)', fontWeight: 600, textAlign: 'start' }}>
                Est: {colValue.toLocaleString()} SAR
              </div>

              {/* Cards wrapper */}
              <div style={{ display: 'grid', gap: '10px', flex: 1, contentVisibility: 'auto' }}>
                {colLeads.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    style={{
                      background: 'var(--mars-slate)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '8px',
                      textAlign: 'start',
                      transition: 'border-color 120ms ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--copper-400)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{l.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.company || 'Individual'}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--copper-400)', fontWeight: 600 }}>{l.value} SAR</span>
                      <span style={{ background: 'rgba(245, 245, 245, 0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        Source: {l.source || 'Direct'}
                      </span>
                    </div>

                    {/* Stage Move Trigger controls */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                      {columns.filter(c => c !== colName).map((targetCol) => (
                        <button
                          key={targetCol}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLeadStage(l.id, targetCol);
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                            fontSize: '9px',
                            padding: '2px 6px',
                            cursor: 'pointer'
                          }}
                        >
                          ➔ {targetCol.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

      {/* Lead Details Slide-out Drawer (Customer 360 Profile) */}
      {selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: language === 'ar' ? 'auto' : 0,
          left: language === 'ar' ? 0 : 'auto',
          width: 'min(100%, 540px)',
          background: 'var(--mars-slate)',
          borderLeft: language === 'ar' ? 'none' : '1px solid var(--border-color)',
          borderRight: language === 'ar' ? '1px solid var(--border-color)' : 'none',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          padding: '40px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Drawer Header */}
          <div style={{ display: 'flex', justifySelf: 'start', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', width: '100%' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--copper-400)', letterSpacing: '0.12em' }}>CUSTOMER 360 PROFILE</span>
              <h3 style={{ margin: '2px 0 0', fontSize: '22px', color: 'var(--text-primary)' }}>{selectedLead.name}</h3>
            </div>
            <button
              onClick={() => setSelectedLead(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Drawer Body details */}
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '24px', display: 'grid', gap: '24px', fontSize: '13px', textAlign: 'start' }}>
            
            {/* Customer Health Score Gauge Card */}
            <div style={{ background: 'var(--mars-void)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>Customer Health Score</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#4CAF50', marginTop: '4px' }}>94 / 100 (Optimal)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>High engagement · 0 overdue invoices · Active ticket resolutions</div>
              </div>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(76,175,80,0.1)', border: '2px solid #4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#4CAF50', fontWeight: 700 }}>
                A+
              </div>
            </div>

            {/* Entity details grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Company Entity</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedLead.company || 'Individual Member'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Pipeline Stage</div>
                <div style={{ fontWeight: 600, color: 'var(--copper-400)', marginTop: '4px' }}>{selectedLead.stage}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Email Contact</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedLead.email || 'ahmed@example.com'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)' }}>Phone / Mobile</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedLead.phone || '0501234567'}</div>
              </div>
            </div>

            {/* Linked Systems 360 overview */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'grid', gap: '16px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>360 Linked Modules Summary</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--mars-void)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Linked Contract</div>
                  <div style={{ fontWeight: 600, color: 'var(--copper-400)', marginTop: '2px' }}>MS-CON-2026-5001</div>
                </div>
                <div style={{ background: 'var(--mars-void)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Assigned Workspace</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>Private Office A-101</div>
                </div>
                <div style={{ background: 'var(--mars-void)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Invoices Status</div>
                  <div style={{ fontWeight: 600, color: '#4CAF50', marginTop: '2px' }}>Paid (INV-2026-001245)</div>
                </div>
                <div style={{ background: 'var(--mars-void)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Support Tickets</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>MSP-2043 (In Progress)</div>
                </div>
              </div>
            </div>

            {/* Sales Communication Notes */}
            <div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Communication Log & Notes</div>
              <div style={{ background: 'var(--mars-void)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {selectedLead.notes || 'Inquired regarding Private Office suites for 4 engineers. Requested keyless access and 24/7 branch entry.'}
              </div>
            </div>

          </div>

          {/* Drawer Actions */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'grid', gap: '10px' }}>
            <button
              onClick={handleCreateQuotation}
              className="btn-pill-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: '14px', border: 'none', cursor: 'pointer' }}
            >
              {language === 'ar' ? 'إنشاء وتجهيز عرض السعر (Contract Builder)' : 'Generate Contract (CLM Builder)'}
            </button>
          </div>

        </div>
      )}

      {/* Quotation Builder Modal */}
      {showQuotationModal && selectedLead && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110
        }}>
          <div style={{
            background: 'var(--mars-slate)',
            padding: '36px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            width: '100%',
            maxWidth: '480px',
            boxSizing: 'border-box',
            margin: '0 20px',
            textAlign: 'start'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '16px' }}>
              {language === 'ar' ? 'صياغة عرض السعر للعميل' : 'Quotation Builder'}
            </h3>

            {quotationConverted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ color: 'var(--copper-400)', fontSize: '15px', fontWeight: 600 }}>
                  ✓ Quotation generated and sent to {selectedLead.name}!
                </div>
                <button
                  onClick={() => setShowQuotationModal(false)}
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer', marginTop: '24px' }}
                >
                  Close
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)' }}>Client Recipient</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>{selectedLead.name} ({selectedLead.company || 'Individual'})</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                    Plan Type
                    <input type="text" value="Workspace Membership" readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                    Base Price (Monthly)
                    <input type="text" value={`${selectedLead.value} SAR`} readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => setShowQuotationModal(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConvertQuotation}
                    className="btn-pill-primary"
                    style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                  >
                    Convert & Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
