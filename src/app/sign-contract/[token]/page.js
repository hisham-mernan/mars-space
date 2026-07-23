'use client';

import React, { useState, useEffect, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PublicSignContract({ params }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Signature states
  const [signatoryName, setSignatoryName] = useState('');
  const [sigMethod, setSigMethod] = useState('Draw'); // 'Draw', 'Type', 'Upload'
  const [typeSignature, setTypeSignature] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  useEffect(() => {
    async function loadContract() {
      try {
        const res = await fetch(`/api/v1/public/contracts/sign/${token}`);
        const json = await res.json();
        if (json.success) {
          setContract(json.data);
          setSignatoryName(json.data.customerName || '');
          setTypeSignature(json.data.customerName || '');
        } else {
          setError(json.error?.message || 'Invalid or expired contract signing link');
        }
      } catch (err) {
        setError('Failed loading contract signing portal');
      } finally {
        setLoading(false);
      }
    }
    loadContract();
  }, [token]);

  const handleSubmitSignature = async (e) => {
    e.preventDefault();
    if (!agreedTerms) {
      alert('Please check the terms agreement box to proceed');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/public/contracts/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureMethod: sigMethod,
          signatureData: sigMethod === 'Type' ? typeSignature : 'DIGITAL_CANVAS_SIGNATURE',
          signatoryName
        })
      });

      const json = await res.json();
      if (json.success) {
        setSignedSuccess(true);
      } else {
        alert(json.error?.message || 'Failed submitting signature');
      }
    } catch (err) {
      alert('Connection error submitting e-Signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: 'var(--mars-void)' }}>
        <div style={{ color: 'var(--copper-400)' }}>LOADING E-SIGNATURE PORTAL...</div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 24px', background: 'var(--mars-void)', minHeight: '80vh' }}>
        <h2 style={{ color: '#FF4A4A' }}>Invalid Signing Link</h2>
        <p style={{ color: 'var(--text-muted-dark)', margin: '12px 0 24px' }}>{error}</p>
        <a href="/" className="btn-pill-primary" style={{ padding: '12px 28px' }}>Return to Homepage</a>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container" style={{ maxWidth: '780px' }}>
          
          {signedSuccess ? (
            /* Success completion screen */
            <div style={{
              background: 'var(--mars-slate)',
              padding: '48px',
              borderRadius: '12px',
              border: '1px solid var(--line-dark)',
              textAlign: 'center',
              animation: 'fadeIn 300ms ease-out'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'rgba(76, 175, 80, 0.1)',
                border: '2px solid #4CAF50',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300 }}>Contract Digitally Signed!</h2>
              <p style={{ color: 'var(--text-muted-dark)', marginTop: '12px', fontSize: '15px', lineHeight: 1.6 }}>
                Thank you, <b>{signatoryName}</b>. Your electronic signature for contract <b>{contract.contractNumber}</b> has been securely recorded and timestamped in our compliance audit log.
              </p>
              <div style={{ marginTop: '32px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <a href={`/verify-contract/${contract.id}`} className="btn-pill-secondary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                  View Audit Certificate
                </a>
                <a href="/auth/login" className="btn-pill-primary" style={{ padding: '12px 24px', fontSize: '14px' }}>
                  Access Member Portal
                </a>
              </div>
            </div>
          ) : (
            /* Signing Form */
            <div style={{ display: 'grid', gap: '32px' }}>
              
              {/* Header banner */}
              <div style={{ textAlign: 'start' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--copper-400)', letterSpacing: '0.12em' }}>MARS SPACE ELECTRONIC SIGNATURE PORTAL</div>
                <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: '6px 0 0' }}>
                  Review & Sign Agreement ({contract.contractNumber})
                </h1>
              </div>

              {/* Document Text Preview */}
              <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '12px', border: '1px solid var(--line-dark)', textAlign: 'start' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', borderBottom: '1px solid rgba(245,245,245,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
                  Contract Document Content (Version {contract.version || 1})
                </div>
                <div style={{
                  background: 'var(--mars-void)',
                  padding: '24px',
                  borderRadius: '6px',
                  border: '1px solid var(--line-dark)',
                  maxHeight: '360px',
                  overflowY: 'auto',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  color: '#FFFFFF',
                  whiteSpace: 'pre-wrap'
                }}>
                  {contract.content}
                </div>
              </div>

              {/* e-Signature Input Block */}
              <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '12px', border: '1px solid var(--line-dark)', textAlign: 'start' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '20px', color: '#FFFFFF' }}>Digital Signature Details</h3>

                <form onSubmit={handleSubmitSignature} style={{ display: 'grid', gap: '20px', fontSize: '13px' }}>
                  
                  <label style={{ display: 'grid', gap: '8px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                    Authorized Signatory Full Name
                    <input
                      type="text"
                      required
                      value={signatoryName}
                      onChange={(e) => {
                        setSignatoryName(e.target.value);
                        if (sigMethod === 'Type') setTypeSignature(e.target.value);
                      }}
                      style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '12px', color: '#FFFFFF', outline: 'none' }}
                    />
                  </label>

                  {/* Signature Method Selector */}
                  <div>
                    <div style={{ color: 'var(--text-muted-dark)', fontWeight: 600, marginBottom: '8px' }}>Select Signature Method</div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {['Draw', 'Type', 'Upload'].map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSigMethod(method)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: sigMethod === method ? 'var(--mars-copper)' : 'var(--mars-void)',
                            border: '1px solid var(--line-dark)',
                            borderRadius: '4px',
                            color: '#FFFFFF',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {method} Signature
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Method Content */}
                  {sigMethod === 'Draw' && (
                    <div style={{ background: 'var(--mars-void)', border: '2px dashed var(--copper-400)', height: '140px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--copper-400)', fontSize: '24px' }}>
                      {signatoryName || 'Draw Signature Here'}
                    </div>
                  )}

                  {sigMethod === 'Type' && (
                    <label style={{ display: 'grid', gap: '8px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                      Calligraphic Typed Signature Preview
                      <input
                        type="text"
                        required
                        value={typeSignature}
                        onChange={(e) => setTypeSignature(e.target.value)}
                        style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '16px', color: 'var(--copper-400)', fontSize: '26px', outline: 'none' }}
                      />
                    </label>
                  )}

                  {sigMethod === 'Upload' && (
                    <label style={{ display: 'grid', gap: '8px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
                      Upload Signature Image (PNG/JPG)
                      <input type="file" accept="image/*" style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', padding: '10px', borderRadius: '4px', color: '#FFFFFF' }} />
                    </label>
                  )}

                  {/* Terms Acceptance */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF', cursor: 'pointer', marginTop: '10px' }}>
                    <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} />
                    I agree to electronic signature terms and accept all binding space policies.
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-pill-primary"
                    style={{ width: '100%', padding: '16px', fontSize: '16px', border: 'none', cursor: 'pointer', marginTop: '12px' }}
                  >
                    {submitting ? 'Encrypting & Signing...' : 'Sign Contract Digitally'}
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
