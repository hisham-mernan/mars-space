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

    async function performSearch() {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data);
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }

    const timer = setTimeout(performSearch, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('mars-user');
    router.push('/auth/login');
  };

  if (!mounted || loading) {
    return (
      <div style={{ background: 'var(--mars-void)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--copper-400)', fontSize: '15px', fontWeight: 600, letterSpacing: '0.05em' }}>
          {language === 'ar' ? 'جاري تحميل لوحة العمليات...' : 'INITIALIZING OPERATIONAL SYSTEM...'}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const links = [
    { name: language === 'ar' ? 'غرفة العمليات' : 'Operations Control', path: '/erp', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: language === 'ar' ? 'إدارة المبيعات CRM' : 'CRM Pipeline', path: '/erp/crm', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 01-2 2m2 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' },
    { name: language === 'ar' ? 'العقود والتوقيع' : 'Contracts & CLM', path: '/erp/contracts', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: language === 'ar' ? 'المساحات وIoT' : 'Workspaces & IoT', path: '/erp/workspaces', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { name: language === 'ar' ? 'تتبع المخزون' : 'Inventory Logs', path: '/erp/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { name: language === 'ar' ? 'المالية والفواتير' : 'Billing & Invoices', path: '/erp/invoices', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: language === 'ar' ? 'تحليلات الأعمال BI' : 'Intelligence BI', path: '/erp/bi', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2' },
    { name: language === 'ar' ? 'التقارير التنفيذية' : 'Executive Reports', path: '/erp/reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--mars-void)', color: 'var(--text-primary)', flexDirection: 'column' }}>
      
      {/* Top Header System Bar */}
      <header style={{
        height: '68px',
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--glass-border)',
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
        {/* Left Side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            ☰
          </button>
          
          <a href="/erp" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/assets/mars-lockup-white.png" alt="MARS" style={{ height: '30px' }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: 'var(--copper-400)',
              textTransform: 'uppercase',
              background: 'rgba(200, 107, 60, 0.1)',
              border: '1px solid rgba(200, 107, 60, 0.25)',
              padding: '2px 8px',
              borderRadius: '999px',
            }}>
              OPERATIONS ERP
            </span>
          </a>
        </div>

        {/* Center: Command Palette Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifySelf: 'center', maxWidth: '520px', position: 'relative' }} className="erp-top-search-section">
          {/* Branch Selector */}
          <select
            value={currentBranch}
            onChange={(e) => setCurrentBranch(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              padding: '7px 12px',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="jeddah" style={{ background: '#111' }}>Jeddah HQ</option>
            <option value="riyadh" style={{ background: '#111' }}>Riyadh Flagship (Soon)</option>
          </select>

          {/* Spotlight Input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث أو أمر سريع... (Ctrl+K)' : 'Search records or run commands... (Ctrl+K)'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                padding: '7px 14px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            {/* Dropdown Results */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: 0,
                right: 0,
                background: 'var(--surface-2)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                zIndex: 60,
                padding: '6px 0',
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
                      padding: '10px 14px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--glass-border)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.sub}</div>
                    </div>
                    <span className="status-pill status-pill-copper">
                      {item.category}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* System Status Ping */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--status-emerald)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-emerald)', boxShadow: '0 0 6px var(--status-emerald)' }} />
            <span>ONLINE</span>
          </div>

          <button
            onClick={toggleLanguage}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '999px',
              padding: '4px 10px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {language === 'en' ? 'عربي' : 'EN'}
          </button>

          <span style={{ fontSize: '12px', fontWeight: 600 }} className="erp-username">{user.name} ({user.role})</span>

          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--status-crimson)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            {language === 'ar' ? 'خروج' : 'Logout'}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div style={{ display: 'flex', flex: 1, paddingTop: '68px', boxSizing: 'border-box' }}>
        
        {/* Sidebar */}
        <aside style={{
          width: sidebarCollapsed ? '72px' : '240px',
          background: 'var(--surface-1)',
          borderRight: language === 'ar' ? 'none' : '1px solid var(--glass-border)',
          borderLeft: language === 'ar' ? '1px solid var(--glass-border)' : 'none',
          position: 'fixed',
          top: '68px',
          bottom: 0,
          left: language === 'ar' ? 'auto' : 0,
          right: language === 'ar' ? 0 : 'auto',
          padding: '16px 10px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 40,
          transition: 'width 180ms cubic-bezier(0.16, 1, 0.30, 1)'
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
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(200, 107, 60, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(200, 107, 60, 0.3)' : '1px solid transparent',
                  transition: 'all 140ms ease',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={isActive ? 'var(--copper-400)' : 'currentColor'} strokeWidth="1.8" style={{ flex: 'none' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                </svg>
                {!sidebarCollapsed && <span>{link.name}</span>}
              </a>
            );
          })}
        </aside>

        {/* Dynamic page content */}
        <div style={{
          flex: 1,
          padding: '28px 24px 120px',
          boxSizing: 'border-box',
          marginLeft: language === 'ar' ? '0' : (sidebarCollapsed ? '72px' : '240px'),
          marginRight: language === 'ar' ? (sidebarCollapsed ? '72px' : '240px') : '0',
          transition: 'all 180ms ease'
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
