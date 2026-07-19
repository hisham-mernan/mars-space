'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function CrmKanban() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Seeded Lead records matching MSP schema
  const [leads, setLeads] = useState([
    { id: 'ld-101', name: 'Khalid Al-Mansoori', company: 'Zenith Tech', stage: 'New Leads', value: 4800, score: 91, interest: 'Private Office' },
    { id: 'ld-102', name: 'Reema Abdullah', company: 'Design Grid', stage: 'Qualified', value: 1200, score: 85, interest: 'Dedicated Desk' },
    { id: 'ld-103', name: 'Tariq Fahad', company: 'Apex Consulting', stage: 'Tour', value: 4800, score: 94, interest: 'Private Office' },
    { id: 'ld-104', name: 'Sara Yousif', company: 'Sara Est', stage: 'Proposal', value: 2400, score: 78, interest: 'Private Office' },
    { id: 'ld-105', name: 'Mohammed Ali', company: 'Global Traders', stage: 'Negotiation', value: 6500, score: 88, interest: 'Private Office' }
  ]);

  // Selected Lead details drawer state
  const [selectedLead, setSelectedLead] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationConverted, setQuotationConverted] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  // Move lead card to another stage
  const moveLeadStage = (id, newStage) => {
    setLeads(prev =>
      prev.map(l => {
        if (l.id === id) {
          // If moved to "Won", simulate converting to member
          if (newStage === 'Won') {
            alert(`Deal WON! Simulating conversion of ${l.name} into an active Member, generating Contract draft, and issuing Invoice.`);
          }
          return { ...l, stage: newStage };
        }
        return l;
      })
    );
  };

  const handleCreateQuotation = () => {
    setShowQuotationModal(true);
    setQuotationConverted(false);
  };

  const handleConvertQuotation = () => {
    setQuotationConverted(true);
    // Simulate updating stage to Proposal or Negotiation
    if (selectedLead) {
      moveLeadStage(selectedLead.id, 'Proposal');
      setSelectedLead(prev => ({ ...prev, stage: 'Proposal' }));
    }
  };

  const columns = ['New Leads', 'Qualified', 'Tour', 'Proposal', 'Negotiation', 'Won', 'Lost'];

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'مبيعات الـ CRM والصفقات' : 'CRM Sales pipeline'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'إدارة فرص المبيعات والعملاء المحتملين وتتبع جولات المعاينة وصياغة العقود.' : 'Drag and drop leads between pipeline stages to trigger workflows and track conversions.'}
        </p>
      </div>

      {/* Kanban Board Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, minmax(180px, 1fr))`,
        gap: '16px',
        overflowX: 'auto',
        paddingBottom: '20px',
        boxSizing: 'border-box'
      }}>
        {columns.map((colName) => {
          const colLeads = leads.filter(l => l.stage === colName);
          const colValue = colLeads.reduce((a, b) => a + b.value, 0);

          return (
            <div
              key={colName}
              style={{
                background: 'var(--mars-slate)',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{colName}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>{colLeads.length}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--copper-400)', fontWeight: 600 }}>
                Est: {colValue} SAR
              </div>

              {/* Cards wrapper */}
              <div style={{ display: 'grid', gap: '10px', flex: 1, contentVisibility: 'auto' }}>
                {colLeads.map((l) => (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    style={{
                      background: 'var(--mars-void)',
                      border: '1px solid var(--line-dark)',
                      borderRadius: '6px',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '8px',
                      transition: 'border-color 120ms ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--copper-400)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line-dark)'}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#FFFFFF' }}>{l.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>{l.company}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--copper-400)', fontWeight: 600 }}>{l.value} SAR</span>
                      <span style={{ background: 'rgba(245, 245, 245, 0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted-dark)' }}>
                        Score: {l.score}
                      </span>
                    </div>

                    {/* Quick Move Trigger controls for drag simulation */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderTop: '1px solid rgba(245, 245, 245, 0.05)', paddingTop: '8px', marginTop: '4px' }}>
                      {columns.filter(c => c !== colName).slice(0, 3).map((targetCol) => (
                        <button
                          key={targetCol}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLeadStage(l.id, targetCol);
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid var(--line-dark)',
                            borderRadius: '4px',
                            color: 'var(--text-muted-dark)',
                            fontSize: '9px',
                            padding: '2px 4px',
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

      {/* Lead Details Slide-out Drawer */}
      {selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: language === 'ar' ? 'auto' : 0,
          left: language === 'ar' ? 0 : 'auto',
          width: 'min(100%, 480px)',
          background: 'var(--mars-slate)',
          borderLeft: language === 'ar' ? 'none' : '1px solid var(--line-dark)',
          borderRight: language === 'ar' ? '1px solid var(--line-dark)' : 'none',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
          zIndex: 100,
          padding: '40px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Drawer Header */}
          <div style={{ display: 'flex', justifySelf: 'start', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '20px', width: '100%' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF' }}>{selectedLead.name}</h3>
            <button
              onClick={() => setSelectedLead(null)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', fontSize: '22px', cursor: 'pointer', padding: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Drawer Body details */}
          <div style={{ flex: 1, overflowY: 'auto', marginTop: '24px', display: 'grid', gap: '20px', fontSize: '14px', textAlign: 'start' }}>
            <div>
              <div style={{ color: 'var(--text-muted-dark)' }}>Company Name</div>
              <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{selectedLead.company}</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-muted-dark)' }}>Pipeline Stage</div>
                <div style={{ fontWeight: 600, color: 'var(--copper-400)', marginTop: '4px' }}>{selectedLead.stage}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted-dark)' }}>Lead Score</div>
                <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{selectedLead.score} / 100</div>
              </div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted-dark)' }}>Workspace Interest</div>
              <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{selectedLead.interest}</div>
            </div>

            {/* AI Workspace Recommendation Engine mockup */}
            <div style={{ background: 'rgba(200, 107, 60, 0.06)', padding: '20px', borderRadius: '6px', border: '1px solid rgba(200, 107, 60, 0.2)' }}>
              <div style={{ fontWeight: 600, color: 'var(--copper-400)', fontSize: '13px' }}>
                ★ AI Workspace Recommendation
              </div>
              <ul style={{ margin: '8px 0 0', paddingLeft: '16px', color: 'var(--text-muted-dark)', fontSize: '13px', display: 'grid', gap: '6px' }}>
                <li>Suggested Workspace: <b>Private Office A-101</b></li>
                <li>Reason: Matches capacity request (4 desk layout) and monthly target budget (4,800 SAR).</li>
              </ul>
            </div>

          </div>

          {/* Drawer Actions */}
          <div style={{ borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '20px', display: 'grid', gap: '10px' }}>
            <button
              onClick={handleCreateQuotation}
              className="btn-pill-primary"
              style={{ width: '100%', padding: '12px 0', fontSize: '14px', border: 'none', cursor: 'pointer' }}
            >
              {language === 'ar' ? 'إنشاء وتجهيز عرض السعر' : 'Generate Quotation'}
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
            border: '1px solid var(--line-dark)',
            width: '100%',
            maxWidth: '480px',
            boxSizing: 'border-box',
            margin: '0 20px',
            textAlign: 'start'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF', marginBottom: '16px' }}>
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
                  <div style={{ color: 'var(--text-muted-dark)' }}>Client Recipient</div>
                  <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{selectedLead.name} ({selectedLead.company})</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                    Plan Type
                    <input type="text" value={selectedLead.interest} readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                    Base Price (Monthly)
                    <input type="text" value={`${selectedLead.value} SAR`} readOnly style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: 'rgba(255,255,255,0.7)', outline: 'none' }} />
                  </label>
                </div>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  Special Contract Terms
                  <textarea rows="3" defaultValue="Includes 24/7 branch access, high-speed fiber internet, and 30 meeting room credits per month." style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => setShowQuotationModal(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', fontWeight: 600 }}
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
