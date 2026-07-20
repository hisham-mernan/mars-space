'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, toggleLanguage, theme, toggleTheme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('jeddah');

  // Spotlight search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (!storedUser) {
      router.push('/auth/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [router]);

  // Spotlight search lookup
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    
    // Search across mocked collections
    const mockData = [
      { category: 'Member', name: 'Ahmed Alharbi', sub: 'ahmed@example.com', link: '/erp' },
      { category: 'Member', name: 'Sarah Khan', sub: 'sarah@example.com', link: '/erp' },
      { category: 'Booking', name: 'Meeting Room Alpha reservation', sub: 'MS-BK-1001 · Confirmed', link: '/erp/workspaces' },
      { category: 'Invoice', name: 'Premium Membership invoice', sub: 'INV-2026-001245 · Paid', link: '/erp' },
      { category: 'Ticket', name: 'Intermittent Wi-Fi issues', sub: 'MSP-2043 · In Progress', link: '/erp' }
    ];

    const matches = mockData.filter(
      item => item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    );
    setSearchResults(matches);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('mars-user');
    router.push('/auth/login');
  };

  if (!mounted || loading) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#C86B3C', fontSize: '18px', fontFamily: 'monospace' }}>SECURE ACCESS AUTHENTICATING...</div>
      </div>
    );
  }

  if (!user) return null;

  const links = [
    { name: language === 'ar' ? 'لوحة العمليات' : 'Operations Cockpit', path: '/erp', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: language === 'ar' ? 'مبيعات الـ CRM' : 'CRM Kanban Pipeline', path: '/erp/crm', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 01-2 2m2 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    { name: language === 'ar' ? 'إدارة المساحات' : 'Workspace Management', path: '/erp/workspaces', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { name: language === 'ar' ? 'المخزون والمستودع' : 'Inventory Tracking', path: '/erp/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: language === 'ar' ? 'الفواتير والمالية' : 'Billing & Invoices', path: '/erp/invoices', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: language === 'ar' ? 'تحليلات الأعمال' : 'Business Intelligence', path: '/erp/bi', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2' },
    { name: language === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports', path: '/erp/reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--mars-paper)', flexDirection: 'column' }}>
      
      {/* Top Header bar with branch switcher and Spotlight Search */}
      <header style={{
        height: '70px',
        background: 'var(--mars-slate)',
        borderBottom: '1px solid var(--line-dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        boxSizing: 'border-box',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50
      }}>
        {/* Left Side: Logo & Collapsible toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted-dark)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: 0
            }}
          >
            ☰
          </button>
          
          <a href="/erp" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/assets/mars-lockup-white.png" alt="MARS" style={{ height: '30px' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--copper-400)', letterSpacing: '0.12em' }}>
              OPERATIONS ERP
            </span>
          </a>
        </div>

        {/* Center: Spotlight search bar & Branch picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifySelf: 'center', maxWidth: '560px', position: 'relative' }} className="erp-top-search-section">
          {/* Branch Picker */}
          <select
            value={currentBranch}
            onChange={(e) => setCurrentBranch(e.target.value)}
            style={{
              background: 'var(--mars-void)',
              border: '1px solid var(--line-dark)',
              borderRadius: '6px',
              color: '#FFFFFF',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="jeddah">Jeddah Towers</option>
            <option value="riyadh">Olaya Towers (Soon)</option>
          </select>

          {/* Spotlight Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث شامل في النظام (Ctrl+K)...' : 'Global Spotlight search (Ctrl+K)...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              style={{
                width: '100%',
                background: 'var(--mars-void)',
                border: '1px solid var(--line-dark)',
                borderRadius: '6px',
                padding: '8px 16px',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {/* Spotlight Dropdown results list */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '42px',
                left: 0,
                right: 0,
                background: 'var(--mars-slate)',
                border: '1px solid var(--line-dark)',
                borderRadius: '6px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 60,
                padding: '8px 0',
                maxHeight: '280px',
                overflowY: 'auto'
              }}>
                {searchResults.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.link}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: 'var(--mars-paper)',
                      borderBottom: '1px solid rgba(245,245,245,0.02)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted-dark)', marginTop: '2px' }}>{item.sub}</div>
                    </div>
                    <span style={{ fontSize: '10px', background: 'var(--mars-void)', color: 'var(--copper-400)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                      {item.category}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--line-dark)',
              borderRadius: '999px',
              padding: '6px 12px',
              color: 'var(--text-muted-dark)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {/* Lang Toggle */}
          <button
            onClick={toggleLanguage}
            style={{
              background: 'none',
              border: '1px solid var(--line-dark)',
              borderRadius: '999px',
              padding: '6px 12px',
              color: 'var(--text-muted-dark)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {language === 'en' ? 'عربي' : 'EN'}
          </button>

          <span style={{ fontSize: '13px', fontWeight: 500 }} className="erp-username">{user.name} ({user.role})</span>

          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#FF4A4A',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            {language === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Main Content shell */}
      <div style={{ display: 'flex', flex: 1, paddingTop: '70px', boxSizing: 'border-box' }}>
        
        {/* Sidebar Left navigation */}
        <aside style={{
          width: sidebarCollapsed ? '72px' : '240px',
          background: 'var(--mars-slate)',
          borderRight: '1px solid var(--line-dark)',
          position: 'fixed',
          top: '70px',
          bottom: 0,
          left: language === 'ar' ? 'auto' : 0,
          right: language === 'ar' ? 0 : 'auto',
          padding: '24px 12px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 40,
          transition: 'width 150ms ease'
        }} className="erp-sidebar">
          {links.map((link) => {
            const isActive = pathname === link.path;
            return (
              <a
                key={link.name}
                href={link.path}
                title={link.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isActive ? '#FFFFFF' : 'var(--text-muted-dark)',
                  background: isActive ? 'var(--mars-copper)' : 'none',
                  transition: 'all 120ms ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flex: 'none' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {!sidebarCollapsed && <span>{link.name}</span>}
              </a>
            );
          })}
        </aside>

        {/* Dynamic page children panel */}
        <div style={{
          flex: 1,
          padding: '32px 24px 120px',
          boxSizing: 'border-box',
          marginLeft: language === 'ar' ? '0' : (sidebarCollapsed ? '72px' : '240px'),
          marginRight: language === 'ar' ? (sidebarCollapsed ? '72px' : '240px') : '0',
          transition: 'all 150ms ease'
        }} className="erp-main-content">
          {children}
        </div>

      </div>

      <style jsx global>{`
        @media (max-width: 960px) {
          .erp-sidebar {
            width: 72px !important;
          }
          .erp-main-content {
            margin-left: 72px !important;
          }
          .erp-top-search-section {
            display: none !important;
          }
          .erp-username {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
