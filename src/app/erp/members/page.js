'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpMembersPage() {
  const { language, mounted } = useLanguage();
  const [members, setMembers] = useState([
    {
      id: 'MBR-01',
      name: 'Ahmed Al-Ghamdi',
      email: 'ahmed@example.com',
      company: 'TechCorp KSA',
      plan: 'Dedicated Desk',
      status: 'Active',
      startDate: '2026-01-01'
    },
    {
      id: 'MBR-02',
      name: 'Sarah Al-Otaibi',
      email: 'sarah@techcorp.sa',
      company: 'TechCorp KSA',
      plan: 'Private Office',
      status: 'Active',
      startDate: '2026-02-15'
    }
  ]);
  const [search, setSearch] = useState('');

  if (!mounted) return null;

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.company.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة الأعضاء' : 'Members Management'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'عرض وإدارة جميع أعضاء المساحات والاشتراكات الفعالة.' : 'View and manage active workspace members & subscriptions.'}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={language === 'ar' ? 'البحث عن عضو أو شركة...' : 'Search members or companies...'}
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

      {/* Members Table */}
      <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Member ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Company</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Plan</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Start Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--copper-400)' }}>{m.id}</td>
                  <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{m.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted-dark)' }}>{m.email}</td>
                  <td style={{ padding: '12px 16px' }}>{m.company}</td>
                  <td style={{ padding: '12px 16px' }}>{m.plan}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      color: '#10B981',
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontWeight: 600
                    }}>
                      {m.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted-dark)' }}>{m.startDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
