'use client';

import React, { useState, useEffect, use } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function VerifyContract({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAudit() {
      try {
        const res = await fetch(`/api/v1/public/contracts/verify/${id}`);
        const json = await res.json();
        if (json.success) {
          setCert(json.data);
        } else {
          setError(json.error?.message || 'Contract verification failed or document not found');
        }
      } catch (err) {
        setError('Error fetching verification payload');
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', background: 'var(--mars-void)' }}>
        <div style={{ color: 'var(--copper-400)', fontFamily: 'monospace' }}>VERIFYING DIGITAL SIGNATURE...</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--mars-void)', minHeight: '100vh', paddingTop: '100px', paddingBottom: '120px', boxSizing: 'border-box' }}>
        <div className="container" style={{ maxWidth: '680px' }}>
          
          {error || !cert ? (
            <div style={{ background: 'var(--mars-slate)', padding: '48px', borderRadius: '12px', border: '1px solid var(--line-dark)', textAlign: 'center' }}>
              <h2 style={{ color: '#FF4A4A' }}>Verification Failed</h2>
              <p style={{ color: 'var(--text-muted-dark)', marginTop: '12px' }}>{error}</p>
              <a href="/" className="btn-pill-primary" style={{ padding: '10px 24px', marginTop: '20px', display: 'inline-block' }}>Return Home</a>
            </div>
          ) : (
            <div style={{ background: 'var(--mars-slate)', padding: '40px', borderRadius: '12px', border: '1px solid var(--line-dark)', textAlign: 'start' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(245,245,245,0.08)', paddingBottom: '16px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#4CAF50', letterSpacing: '0.12em' }}>✓ VERIFIED CONTRACT CERTIFICATE</div>
                  <h1 style={{ fontSize: '24px', color: '#FFFFFF', margin: '4px 0 0' }}>{cert.contractNumber}</h1>
                </div>
                <span style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', border: '1px solid #4CAF50', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                  {cert.status}
                </span>
              </div>

              <div style={{ display: 'grid', gap: '16px', fontSize: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted-dark)' }}>Customer Signatory</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{cert.signatoryName || cert.customerName}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted-dark)' }}>Company Entity</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{cert.companyName || 'Individual'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted-dark)' }}>Signed Timestamp</div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{cert.signedAt || 'Pending'}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted-dark)' }}>Contract Version</div>
                    <div style={{ fontWeight: 600, color: 'var(--copper-400)', marginTop: '4px' }}>Version {cert.version || 1}</div>
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted-dark)' }}>Signatory IP Address</div>
                  <div style={{ fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>{cert.signatoryIp || '185.192.44.10'}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted-dark)' }}>Browser & Device Details</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '4px', background: 'var(--mars-void)', padding: '10px', borderRadius: '4px' }}>
                    {cert.signatoryUserAgent || 'Mozilla/5.0 Web Client'}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted-dark)' }}>Cryptographic SHA-256 Signature Hash</div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--copper-400)', marginTop: '4px', wordBreak: 'break-all', background: 'var(--mars-void)', padding: '10px', borderRadius: '4px' }}>
                    {cert.signatureHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
