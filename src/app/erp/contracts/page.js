'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpContractsCLM() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Selected Contract
  const [activeStage, setActiveStage] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [auditCert, setAuditCert] = useState(null);

  // Modals
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);

  // Builder Form Fields
  const [customerName, setCustomerName] = useState('Ahmed Alharbi');
  const [companyName, setCompanyName] = useState('Mars Technologies');
  const [workspaceName, setWorkspaceName] = useState('Private Office A-101');
  const [templateId, setTemplateId] = useState('tpl-office');
  const [monthlyFee, setMonthlyFee] = useState(4800);
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2027-07-31');
  const [parkingSpaces, setParkingSpaces] = useState(1);
  const [lockerUnit, setLockerUnit] = useState('Locker #14');

  // Amendment Form Fields
  const [amendFee, setAmendFee] = useState(5500);
  const [amendReason, setAmendReason] = useState('Expanded office layout and added 2 extra parking passes');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    async function loadData() {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch('/api/v1/erp/contracts'),
          fetch('/api/v1/erp/contracts/templates')
        ]);
        const cJson = await cRes.json();
        const tJson = await tRes.json();

        if (cJson.success) setContracts(cJson.data);
        if (tJson.success) setTemplates(tJson.data);
      } catch (err) {
        console.error('Failed loading CLM data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (!mounted || !user) return null;

  const reloadContracts = async () => {
    const res = await fetch('/api/v1/erp/contracts');
    const json = await res.json();
    if (json.success) setContracts(json.data);
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/erp/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          companyName,
          workspaceName,
          templateId,
          monthlyFee: Number(monthlyFee),
          startDate,
          endDate,
          parkingSpaces: Number(parkingSpaces),
          lockerUnit
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowBuilderModal(false);
        await reloadContracts();
        alert(`Contract Draft ${json.data.contractNumber} generated successfully!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendToCustomer = async (contractId) => {
    try {
      const res = await fetch('/api/v1/erp/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', id: contractId })
      });
      const json = await res.json();
      if (json.success) {
        await reloadContracts();
        const signUrl = `${window.location.origin}/sign-contract/${json.data.signingToken}`;
        prompt('Contract sent! Copy unique customer e-Signature link:', signUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCounterSign = async (contractId) => {
    try {
      const res = await fetch('/api/v1/erp/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'counterSign', id: contractId, managerName: user.name })
      });
      const json = await res.json();
      if (json.success) {
        await reloadContracts();
        alert(`Contract Counter-Signed! Activated membership, allocated workspace, and issued initial invoice.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAmendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedContract) return;

    try {
      const res = await fetch('/api/v1/erp/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'amend',
          id: selectedContract.id,
          amendmentData: {
            newMonthlyFee: Number(amendFee),
            reason: amendReason
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setShowAmendModal(false);
        await reloadContracts();
        alert(`Amendment v${json.data.version} created! Resent for signature review.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditCertificate = async (contractId) => {
    try {
      const res = await fetch(`/api/v1/public/contracts/verify/${contractId}`);
      const json = await res.json();
      if (json.success) {
        setAuditCert(json.data);
      }
    } catch (err) {
      console.error(err);
    }
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

  const filteredContracts = contracts.filter(c => {
    if (activeStage === 'all') return true;
    return c.status.toLowerCase() === activeStage.toLowerCase();
  });

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', textAlign: 'start' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة عقود الاتفاقيات والتوقيع الإلكتروني' : 'Contract Lifecycle Management (CLM)'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {language === 'ar' ? 'صياغة العقود التلقائية والتوقيع الإلكتروني وتتبع دورة حياة الاتفاقيات.' : 'DocuSign-style Contract Builder, e-signatures, counter-sign approvals, and audit certificates.'}
          </p>
        </div>
        <button
          onClick={() => setShowBuilderModal(true)}
          className="btn-pill-primary"
          style={{ padding: '12px 28px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          + {language === 'ar' ? 'إنشاء عقد جديد (Builder)' : 'Contract Builder'}
        </button>
      </div>

      {/* Lifecycle Stage Filters */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['all', 'Draft', 'Sent to Customer', 'Viewed', 'Signed', 'Active'].map((stage) => {
          const isActive = activeStage === stage;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                color: isActive ? 'var(--copper-400)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--copper-400)' : 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {stage === 'all' ? (language === 'ar' ? 'جميع العقود' : 'All Contracts') : stage}
            </button>
          );
        })}
      </div>

      {/* Contracts Table */}
      <div style={glassStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>Contract Ref / Tenant</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>Workspace Plan</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>Monthly Value</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>CLM Stage</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>Version</th>
                <th style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--copper-400)' }}>{c.contractNumber}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>{c.companyName || c.customerName}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{c.planName || c.workspaceName}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.monthlyFee} SAR</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      color: c.status === 'Active' ? '#4CAF50' : c.status === 'Signed' ? '#2196F3' : 'var(--copper-400)',
                      background: theme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      ● {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>v{c.version || 1}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedContract(c);
                          loadAuditCertificate(c.id);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Inspect
                      </button>

                      {c.status === 'Draft' && (
                        <button
                          onClick={() => handleSendToCustomer(c.id)}
                          style={{ background: 'var(--mars-copper)', border: 'none', color: '#FFFFFF', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Send Link
                        </button>
                      )}

                      {c.status === 'Signed' && (
                        <button
                          onClick={() => handleCounterSign(c.id)}
                          style={{ background: '#4CAF50', border: 'none', color: '#FFFFFF', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                        >
                          Counter-Sign
                        </button>
                      )}

                      {c.status === 'Active' && (
                        <button
                          onClick={() => {
                            setSelectedContract(c);
                            setShowAmendModal(true);
                          }}
                          style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                        >
                          Amend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Builder Modal */}
      {showBuilderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '560px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', color: 'var(--text-primary)' }}>Contract Builder (CLM)</h3>

            <form onSubmit={handleCreateContract} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Customer Name
                  <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Company Name
                  <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Contract Template
                  <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Workspace Allocation
                  <input type="text" required value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Monthly Base Fee (SAR)
                  <input type="number" required value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Parking Passes
                  <input type="number" value={parkingSpaces} onChange={(e) => setParkingSpaces(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowBuilderModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>Generate Contract Draft</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Details & Audit Certificate Slide-out Drawer */}
      {selectedContract && (
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
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          zIndex: 100,
          padding: '40px 32px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>{selectedContract.contractNumber}</h3>
              <div style={{ fontSize: '12px', color: 'var(--copper-400)', marginTop: '2px' }}>Version {selectedContract.version || 1} · {selectedContract.status}</div>
            </div>
            <button onClick={() => setSelectedContract(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', marginTop: '24px', display: 'grid', gap: '24px', fontSize: '13px', textAlign: 'start' }}>
            
            {/* Interpolated Contract Content Preview */}
            <div style={{ background: 'var(--mars-void)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-primary)', fontSize: '12px' }}>
              {selectedContract.content}
            </div>

            {/* Electronic Signature Audit Trail */}
            {auditCert && (
              <div style={{ background: 'rgba(76,175,80,0.06)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(76,175,80,0.3)', display: 'grid', gap: '8px' }}>
                <div style={{ fontWeight: 700, color: '#4CAF50', fontSize: '14px' }}>✓ e-Signature Audit Certificate</div>
                <div><b>Signatory:</b> {auditCert.signatoryName || selectedContract.customerName}</div>
                <div><b>Signed Timestamp:</b> {auditCert.signedAt || 'Pending customer signature'}</div>
                <div><b>IP Address:</b> {auditCert.signatoryIp || 'N/A'}</div>
                <div><b>Browser User-Agent:</b> {auditCert.signatoryUserAgent || 'N/A'}</div>
                <div style={{ wordBreak: 'break-all', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <b>SHA-256 Signature Hash:</b> {auditCert.signatureHash || 'N/A'}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Contract Amendment Modal */}
      {showAmendModal && selectedContract && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '12px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', color: 'var(--text-primary)' }}>Amend Contract ({selectedContract.contractNumber})</h3>
            <form onSubmit={handleAmendSubmit} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                New Adjusted Monthly Price (SAR)
                <input type="number" required value={amendFee} onChange={(e) => setAmendFee(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Amendment Reason / Notes
                <textarea rows="3" required value={amendReason} onChange={(e) => setAmendReason(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAmendModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" className="btn-pill-primary" style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>Create Version {selectedContract.version + 1}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
