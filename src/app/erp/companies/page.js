'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpCompaniesPage() {
  const { language, mounted } = useLanguage();
  const [companies, setCompanies] = useState([
    {
      id: 'CMP-01',
      name: 'TechCorp KSA',
      crNumber: '1010998877',
      contactPerson: 'Ahmed Al-Ghamdi',
      contactEmail: 'ahmed@example.com',
      status: 'Active',
      officeSpace: 'Office 17 (10 Desks)'
    },
    {
      id: 'CMP-02',
      name: 'Saudi AI Ventures',
      crNumber: '4030112233',
      contactPerson: 'Sarah Al-Otaibi',
      contactEmail: 'sarah@aistudio.sa',
      status: 'Active',
      officeSpace: 'Office 04 (4 Desks)'
    }
  ]);
  const [search, setSearch] = useState('');

  if (!mounted) return null;

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      c.crNumber.includes(search)
  );

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة الشركات المستأجرة' : 'Company Accounts'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'سجل المنشآت والشركات المستأجرة والسجلات التجارية.' : 'Directory of tenant enterprise accounts and commercial registrations.'}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={language === 'ar' ? 'البحث عن شركة أو السجل التجاري...' : 'Search company name or CR number...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'var(--mars-slate)',
            border: '1px solid var(--line-dark)',
            borderRadius: '6px',
            padding: '12px 16px',
            color: '#FFFFFF',
            fontSize: '14px',
            maxWidth: '360px',
            width: '100%',
            outline: 'none'
          }}
        />
      </div>

      {/* Companies Table */}
      <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Company ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Company Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>CR Number</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Contact Person</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Office Space</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--copper-400)' }}>{c.id}</td>
                  <td style={{ padding: '12px 16px', color: '#FFFFFF', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted-dark)' }}>{c.crNumber}</td>
                  <td style={{ padding: '12px 16px' }}>{c.contactPerson} ({c.contactEmail})</td>
                  <td style={{ padding: '12px 16px' }}>{c.officeSpace}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontWeight: 600
                    }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
