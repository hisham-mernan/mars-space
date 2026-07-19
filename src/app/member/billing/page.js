'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function BillingSettings() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([
    { id: 'card-1', brand: 'VISA', last4: '4827', expiry: '06/2029', isDefault: true }
  ]);
  const [autoPay, setAutoPay] = useState(true);
  const [addCardModal, setAddCardModal] = useState(false);

  // Form states for new card
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Billing address form
  const [companyName, setCompanyName] = useState('Mars Technologies');
  const [billingName, setBillingName] = useState('Ahmed Alharbi');
  const [vatNumber, setVatNumber] = useState('300012345600003');
  const [address, setAddress] = useState('Olaya Tower, Floor 14');
  const [city, setCity] = useState('Riyadh');
  const [postalCode, setPostalCode] = useState('12211');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry) return;
    
    const last4 = cardNumber.slice(-4) || '1111';
    const newCard = {
      id: `card-${Date.now()}`,
      brand: cardNumber.startsWith('5') ? 'Mastercard' : 'VISA',
      last4,
      expiry: cardExpiry,
      isDefault: cards.length === 0
    };

    setCards([...cards, newCard]);
    setAddCardModal(false);
    // Clear inputs
    setCardName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  const handleSetDefault = (id) => {
    setCards(prev =>
      prev.map(c => ({ ...c, isDefault: c.id === id }))
    );
  };

  const handleRemoveCard = (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'إعدادات الدفع والبطاقات' : 'Payment Methods & Billing'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'إدارة وسائل الدفع والبطاقات المحفوظة وإعدادات الفواتير التلقائية.' : 'Manage your saved payment cards, default settings, AutoPay, and billing profiles.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '32px', alignItems: 'start' }}>
        
        {/* Left Column (Cards list & AutoPay toggle) */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          {/* Cards List block */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
                {language === 'ar' ? 'البطاقات المحفوظة' : 'Saved Payment Cards'}
              </h3>
              <button
                onClick={() => setAddCardModal(true)}
                className="btn-pill-primary"
                style={{ padding: '8px 20px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
              >
                {language === 'ar' ? 'إضافة بطاقة جديدة' : 'Add Card'}
              </button>
            </div>

            {cards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
                {language === 'ar' ? 'لا توجد أي بطاقات دفع محفوظة.' : 'No saved payment cards.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {cards.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--mars-void)',
                      padding: '24px',
                      borderRadius: '8px',
                      border: c.isDefault ? '1px solid var(--copper-400)' : '1px solid var(--line-dark)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(245,245,245,0.1)',
                        padding: '10px 16px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: 'var(--copper-400)'
                      }}>
                        {c.brand}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px' }}>•••• •••• •••• {c.last4}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                          Expires {c.expiry} {c.isDefault && `· ${language === 'ar' ? 'الافتراضية' : 'Default'}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      {!c.isDefault && (
                        <button
                          onClick={() => handleSetDefault(c.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {language === 'ar' ? 'جعلها افتراضية' : 'Set Default'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveCard(c.id)}
                        style={{ background: 'none', border: 'none', color: '#FF4A4A', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {language === 'ar' ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AutoPay toggle card */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
                  {language === 'ar' ? 'المدفوعات التلقائية (AutoPay)' : 'AutoPay Automation'}
                </h3>
                <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '13px', maxWidth: '46ch', lineHeight: 1.5 }}>
                  {language === 'ar'
                    ? 'سيتم خصم فواتير العضوية تلقائياً من بطاقتك الافتراضية عند صدورها.'
                    : 'Automatically charge your default payment card for membership renewals and booking invoices.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
                style={{ width: '40px', height: '20px', cursor: 'pointer' }}
              />
            </div>
          </div>

        </div>

        {/* Right Column: Billing Address Profile Form */}
        <div>
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              {language === 'ar' ? 'بيانات الفواتير والضرائب' : 'Billing Information'}
            </h3>
            
            <form style={{ display: 'grid', gap: '16px', fontSize: '14px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'اسم المنشأة/الشركة' : 'Company Name'}
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>
              
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'الرقم الضريبي' : 'VAT Registration Number'}
                <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'عنوان الفواتير' : 'Billing Address'}
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'المدينة' : 'City'}
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'الرمز البريدي' : 'Postal Code'}
                  <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
                </label>
              </div>

              <button
                type="button"
                className="btn-pill-primary"
                style={{ padding: '12px 0', fontSize: '13px', border: 'none', cursor: 'pointer', marginTop: '12px' }}
              >
                {language === 'ar' ? 'حفظ البيانات الضريبية' : 'Save Billing Profile'}
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Add Card Modal */}
      {addCardModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div style={{
            background: 'var(--mars-slate)',
            padding: '36px',
            borderRadius: '8px',
            border: '1px solid var(--line-dark)',
            width: '100%',
            maxWidth: '440px',
            boxSizing: 'border-box',
            margin: '0 20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF', marginBottom: '24px' }}>
              {language === 'ar' ? 'إضافة بطاقة سداد جديدة' : 'Add Payment Card'}
            </h3>

            <form onSubmit={handleAddCard} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'اسم حامل البطاقة' : 'Cardholder Name'}
                <input type="text" required value={cardName} onChange={(e) => setCardName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'رقم البطاقة' : 'Card Number'}
                <input type="text" required maxLength="16" placeholder="4000 1234 5678 9010" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  <input type="text" required maxLength="5" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  CVV
                  <input type="password" required maxLength="3" placeholder="•••" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setAddCardModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  {language === 'ar' ? 'حفظ البطاقة' : 'Save Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
