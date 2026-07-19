'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function RewardsProgram() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Simulated loyalty balance
  const [points, setPoints] = useState(1250);

  // Redemptions list
  const [rewards, setRewards] = useState([
    { id: 'rew-1', name: 'Free Espresso Coffee', cost: 100, count: 0 },
    { id: 'rew-2', name: '1 Extra Meeting Room Hour', cost: 350, count: 0 },
    { id: 'rew-3', name: 'Mars Space T-Shirt', cost: 500, count: 0 }
  ]);

  // Partner benefits
  const partners = [
    { name: 'Amazon Web Services (AWS)', discount: '10,000 USD Active Credits', category: 'Cloud Credits', code: 'AWS-MARS-2026' },
    { name: 'Stripe Payments', discount: 'Fee-free processing on first 15,000 SAR', category: 'Finance', code: 'STRIPE-KSA-SPACE' },
    { name: 'HubSpot', discount: '90% discount on first year subscriptions', category: 'Software Tools', code: 'HUBSPOT-STARTUP-90' }
  ];

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleRedeem = (id, cost) => {
    if (points < cost) {
      alert("Insufficient points balance.");
      return;
    }

    setPoints(prev => prev - cost);
    setRewards(prev =>
      prev.map(r => (r.id === id ? { ...r, count: r.count + 1 } : r))
    );
    alert(`Success! Reward voucher redeemed. Your new balance is ${points - cost} points.`);
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'نقاط الولاء ومكافآت مجتمع مارس' : 'Loyalty & Community Rewards'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'اكسب النقاط عن طريق حضور الفعاليات، واستبدلها بقسائم حجز أو مزايا الشركاء.' : 'Earn points by attending networking workshops and redeem them for free hours, coffee, or merchandise.'}
        </p>
      </div>

      {/* KPI Points Cockpit Balance */}
      <div style={{
        background: 'linear-gradient(135deg, var(--mars-slate) 0%, var(--mars-void) 100%)',
        padding: '32px',
        borderRadius: '8px',
        border: '1px solid var(--line-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', fontWeight: 600 }}>
            {language === 'ar' ? 'رصيد نقاط المجتمع المتاحة' : 'Available Community Points'}
          </div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--copper-400)', marginTop: '8px' }}>
            {points} pts
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)', maxWidth: '28ch', lineHeight: 1.5 }}>
            {language === 'ar'
              ? 'اكسب +100 نقطة لكل فعالية تحضرها. تتم تسوية النقاط تلقائياً.'
              : 'Earn +100 pts for every networking meetup you attend. Points settle automatically.'}
          </span>
        </div>
      </div>

      {/* Grid of widgets: Left (Redeemable) and Right (Partner Discounts) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Redeemable vouchers */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'استبدال النقاط بالمكافآت' : 'Redeem Points for Vouchers'}
            </h3>

            <div style={{ display: 'grid', gap: '16px' }}>
              {rewards.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--mars-void)',
                    padding: '20px',
                    borderRadius: '6px',
                    border: '1px solid var(--line-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{r.name}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                      Cost: {r.cost} pts {r.count > 0 && `· Active Vouchers: ${r.count}`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRedeem(r.id, r.cost)}
                    className="btn-pill-primary"
                    disabled={points < r.cost}
                    style={{
                      padding: '8px 20px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: points < r.cost ? 0.5 : 1
                    }}
                  >
                    {language === 'ar' ? 'استبدال' : 'Redeem'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Partner Discounts */}
        <div>
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'مزايا وخصومات الشركاء' : 'Exclusive Partner Benefits'}
            </h3>
            <p style={{ margin: '6px 0 24px', color: 'var(--text-muted-dark)', fontSize: '13px', lineHeight: 1.5 }}>
              {language === 'ar' ? 'خصومات وعروض حصرية متوفرة لأعضاء مجتمع مارس.' : 'Special tech credits and discounts from our ecosystem partners.'}
            </p>

            <div style={{ display: 'grid', gap: '16px' }}>
              {partners.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--mars-void)',
                    padding: '20px',
                    borderRadius: '6px',
                    border: '1px solid var(--line-dark)',
                    display: 'grid',
                    gap: '8px',
                    textAlign: 'start'
                  }}
                >
                  <span style={{ fontSize: '10px', color: 'var(--copper-400)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {p.category}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#FFFFFF' }}>{p.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{p.discount}</div>
                  
                  <div style={{ borderTop: '1px solid rgba(245,245,245,0.05)', paddingTop: '10px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted-dark)' }}>Code: <code>{p.code}</code></span>
                    <button
                      onClick={() => alert(`Copied promo code: ${p.code}`)}
                      style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
