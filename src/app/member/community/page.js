'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function MemberDirectory() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Seeded Member profiles matching specs
  const [members, setMembers] = useState([
    { id: 'usr-01', name: 'Ahmed Alharbi', company: 'Mars Technologies', role: 'CTO / Founder', industry: 'FinTech', skills: ['Next.js', 'React', 'AI', 'SaaS'], bio: 'Building the future of finance in Saudi Arabia.', connected: false },
    { id: 'usr-02', name: 'Sarah Khan', company: 'Design Grid', role: 'UI/UX Lead', industry: 'Design', skills: ['Figma', 'UI/UX Design', 'Branding'], bio: 'Creating beautiful interactive products and designs.', connected: false },
    { id: 'usr-03', name: 'Tariq Fahad', company: 'Apex Consulting', role: 'Management Consultant', industry: 'Consulting', skills: ['Strategy', 'Project Management', 'Market Research'], bio: 'Helping businesses scale and optimize their operations.', connected: false },
    { id: 'usr-04', name: 'Yousef Al-Mutairi', company: 'Yousef VC', role: 'Managing Partner', industry: 'Venture Capital', skills: ['Venture Capital', 'Angel Investing', 'Mentoring'], bio: 'Investing in early-stage tech startups in the MENA region.', connected: false }
  ]);

  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleConnect = (id) => {
    setMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, connected: !m.connected } : m))
    );
  };

  // Filter list
  let filteredMembers = members.filter(m => m.id !== user.id); // Exclude current user
  
  if (search.trim()) {
    const q = search.toLowerCase();
    filteredMembers = filteredMembers.filter(
      m => m.name.toLowerCase().includes(q) || m.company.toLowerCase().includes(q) || m.skills.some(s => s.toLowerCase().includes(q))
    );
  }

  if (selectedIndustry !== 'all') {
    filteredMembers = filteredMembers.filter(m => m.industry === selectedIndustry);
  }

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'دليل شبكة الأعضاء' : 'Member Network Directory'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'تواصل مع المبتكرين والشركات الناشئة في مارس سبيس وتبادل بطاقات الأعمال.' : 'Connect with other entrepreneurs, developers, and designers on the floor.'}
          </p>
        </div>
      </div>

      {/* Toolbar filters */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--mars-slate)',
        padding: '20px 24px',
        borderRadius: '8px',
        border: '1px solid var(--line-dark)'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Industry Picker */}
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            style={{
              background: 'var(--mars-void)',
              border: '1px solid var(--line-dark)',
              color: '#FFFFFF',
              borderRadius: '6px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">{language === 'ar' ? 'جميع التخصصات' : 'All Industries'}</option>
            <option value="FinTech">FinTech</option>
            <option value="Design">Design</option>
            <option value="Consulting">Consulting</option>
            <option value="Venture Capital">Venture Capital</option>
          </select>
        </div>

        {/* Search Input */}
        <input
          type="text"
          placeholder={language === 'ar' ? 'ابحث بالاسم، الشركة، المهارات...' : 'Search by name, company, skills...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: 'min(100%, 300px)',
            background: 'var(--mars-void)',
            border: '1px solid var(--line-dark)',
            borderRadius: '999px',
            padding: '10px 20px',
            color: '#FFFFFF',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Members Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px'
      }}>
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            style={{
              background: 'var(--mars-slate)',
              border: '1px solid var(--line-dark)',
              borderRadius: '8px',
              padding: '24px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px'
            }}
          >
            {/* Upper profile header */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'start' }}>
              <div style={{
                width: '56px',
                height: '56px',
                background: 'var(--mars-copper)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '18px',
                color: '#FFFFFF',
                flex: 'none'
              }}>
                {m.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>{m.name}</h3>
                <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)', marginTop: '2px' }}>
                  {m.role} @ {m.company}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--copper-400)', fontWeight: 600, marginTop: '4px' }}>
                  {m.industry}
                </div>
              </div>
            </div>

            {/* Bio */}
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(245, 245, 245, 0.8)', lineHeight: 1.5 }}>
              {m.bio}
            </p>

            {/* Skills Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {m.skills.map((skill, sIdx) => (
                <span
                  key={sIdx}
                  style={{
                    fontSize: '11px',
                    background: 'var(--mars-void)',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    color: 'var(--text-muted-dark)'
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>

            {/* Action Row */}
            <div style={{ borderTop: '1px solid rgba(245, 245, 245, 0.08)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleConnect(m.id)}
                className="btn-pill-primary"
                style={{
                  background: m.connected ? 'none' : 'var(--mars-copper)',
                  border: m.connected ? '1px solid var(--copper-400)' : 'none',
                  color: m.connected ? 'var(--copper-400)' : '#FFFFFF',
                  padding: '8px 24px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {m.connected 
                  ? (language === 'ar' ? 'تم إرسال الطلب' : 'Connected') 
                  : (language === 'ar' ? 'تبادل بطاقة الأعمال' : 'Connect')}
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
