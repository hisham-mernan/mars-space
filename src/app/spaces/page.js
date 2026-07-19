'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function SpacesListing() {
  const { t, language, mounted } = useLanguage();
  
  // States for search and filter controls
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedCapacity, setSelectedCapacity] = useState('all');

  // Fetch workspaces from our API route
  useEffect(() => {
    async function loadWorkspaces() {
      try {
        let url = '/api/v1/public/workspaces';
        const params = [];
        if (selectedCategory !== 'all') params.push(`category=${selectedCategory}`);
        if (selectedBranch !== 'all') params.push(`branchId=${selectedBranch}`);
        if (params.length > 0) {
          url += '?' + params.join('&');
        }
        
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setSpaces(json.data);
        }
      } catch (err) {
        console.error("Failed to load spaces:", err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaces();
  }, [selectedCategory, selectedBranch]);

  if (!mounted) return null;

  // Filter remaining client-side
  let filteredSpaces = spaces;

  // Search filter
  if (search.trim()) {
    const q = search.toLowerCase();
    filteredSpaces = filteredSpaces.filter(
      s => s.name.toLowerCase().includes(q) || (s.nameAr && s.nameAr.includes(q))
    );
  }

  // Capacity filter logic
  if (selectedCapacity !== 'all') {
    filteredSpaces = filteredSpaces.filter(s => {
      const cap = s.capacity;
      if (selectedCapacity === '1') return cap === 1;
      if (selectedCapacity === '2-4') return cap >= 2 && cap <= 4;
      if (selectedCapacity === '5-8') return cap >= 5 && cap <= 8;
      if (selectedCapacity === '9-12') return cap >= 9 && cap <= 12;
      if (selectedCapacity === '12+') return cap > 12;
      return true;
    });
  }

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedBranch('all');
    setSelectedCapacity('all');
  };

  return (
    <>
      <Header />

      <main style={{ minHeight: '100vh', background: 'var(--mars-void)', paddingTop: '100px', boxSizing: 'border-box' }}>
        {/* Hero Banner Section */}
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--line-dark)' }}>
          <div className="container">
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 200, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              {language === 'ar' ? 'استكشف مساحاتنا' : 'Explore Our Spaces'}
            </h1>
            <p style={{ margin: '14px 0 0', color: 'var(--text-muted-dark)', maxWidth: '60ch' }}>
              {language === 'ar' 
                ? 'ابحث عن مساحة العمل المثالية التي تناسب احتياجاتك، من المكاتب الخاصة المغلقة وقاعات الاجتماعات المجهزة بالكامل إلى مساحات العمل المشتركة المرنة.'
                : 'Discover the ideal workspace tailored for your business needs, ranging from private lockable offices and fully equipped meeting rooms to flexible hot-desking zones.'}
            </p>
          </div>
        </section>

        {/* Filters and Search Toolbar */}
        <section style={{ padding: '32px 0', background: 'var(--mars-slate)', borderBottom: '1px solid var(--line-dark)' }}>
          <div className="container">
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {/* Filter controls */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {/* Branch Picker */}
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    color: '#FFFFFF',
                    borderRadius: '999px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</option>
                  <option value="jeddah">{language === 'ar' ? 'فرع جدة' : 'Jeddah Branch'}</option>
                  <option value="riyadh">{language === 'ar' ? 'فرع الرياض (قريباً)' : 'Riyadh Branch (Soon)'}</option>
                </select>

                {/* Category Picker */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    color: '#FFFFFF',
                    borderRadius: '999px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
                  <option value="private_office">{language === 'ar' ? 'مكاتب خاصة' : 'Private Offices'}</option>
                  <option value="meeting_room">{language === 'ar' ? 'قاعات اجتماعات' : 'Meeting Rooms'}</option>
                  <option value="community_hall">{language === 'ar' ? 'قاعة المجتمع' : 'Community Hall'}</option>
                </select>

                {/* Capacity Picker */}
                <select
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    color: '#FFFFFF',
                    borderRadius: '999px',
                    padding: '10px 18px',
                    fontSize: '14px',
                    fontWeight: 500,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">{language === 'ar' ? 'السعة (الجميع)' : 'Capacity (All)'}</option>
                  <option value="1">1 {language === 'ar' ? 'شخص' : 'Person'}</option>
                  <option value="2-4">2-4 {language === 'ar' ? 'أشخاص' : 'People'}</option>
                  <option value="5-8">5-8 {language === 'ar' ? 'أشخاص' : 'People'}</option>
                  <option value="9-12">9-12 {language === 'ar' ? 'أشخاص' : 'People'}</option>
                  <option value="12+">12+ {language === 'ar' ? 'شخصاً' : 'People'}</option>
                </select>
              </div>

              {/* Search text input */}
              <div style={{ position: 'relative', width: 'min(100%, 320px)' }}>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'ابحث عن مساحة...' : 'Search spaces...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: '999px',
                    padding: '10px 20px',
                    boxSizing: 'border-box',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Space Grid Listing */}
        <section style={{ padding: '64px 0 120px' }}>
          <div className="container">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                <span style={{ fontSize: '18px', color: 'var(--copper-400)', fontFamily: 'monospace' }}>
                  {language === 'ar' ? 'جاري التحميل...' : 'LOADING SPACES...'}
                </span>
              </div>
            ) : filteredSpaces.length === 0 ? (
              /* Empty state matching specs */
              <div style={{ textAlign: 'center', padding: '80px 0', background: 'var(--mars-slate)', borderRadius: '8px', border: '1px dashed var(--line-dark)' }}>
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted-dark)" style={{ margin: '0 auto 16px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 12h-15m0 0l3-3m-3 3l3 3" />
                </svg>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                  {language === 'ar' ? 'لم نجد مساحات مطابقة' : 'No spaces match your filters'}
                </h3>
                <p style={{ margin: '8px 0 24px', color: 'var(--text-muted-dark)', fontSize: '15px' }}>
                  {language === 'ar' 
                    ? 'يرجى تجربة تعديل التصفية للحصول على نتائج أفضل.' 
                    : 'Try clearing or modifying your filter preferences.'}
                </p>
                <button
                  onClick={handleClearFilters}
                  className="btn-pill-primary"
                  style={{ padding: '12px 28px', fontSize: '14px', cursor: 'pointer', border: 'none' }}
                >
                  {language === 'ar' ? 'إعادة تعيين خيارات البحث' : 'Clear Filters'}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '32px'
              }}>
                {filteredSpaces.map((room, idx) => {
                  const availabilityBadgeColor = room.status === 'Available' ? 'var(--copper-400)' : 'var(--text-muted-dark)';
                  const availabilityBadgeBorder = room.status === 'Available' ? '1px solid rgba(200, 107, 60, 0.45)' : '1px solid rgba(245, 245, 245, 0.18)';
                  
                  return (
                    <a
                      key={idx}
                      href={`/spaces/${room.slug}`}
                      style={{
                        display: 'block',
                        background: 'var(--mars-slate)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        color: 'var(--mars-paper)',
                        transition: 'transform var(--dur-instant) var(--ease-out), background var(--dur-instant) var(--ease-out)',
                      }}
                      className="room-card"
                    >
                      <div style={{ aspectRatio: '3/2', overflow: 'hidden', position: 'relative' }}>
                        <img
                          src={room.image || '/assets/photo-glass-offices.jpg'}
                          alt={room.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                            transition: 'transform var(--dur-base) var(--ease-out)',
                          }}
                          className="room-card-img"
                        />
                      </div>
                      
                      <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                            {language === 'ar' ? room.nameAr : room.name}
                          </h3>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: availabilityBadgeColor,
                            border: availabilityBadgeBorder,
                            borderRadius: '999px',
                            padding: '4px 10px',
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                          }}>
                            {language === 'ar' 
                              ? (room.status === 'Available' ? 'متاح الآن' : 'غير متاح')
                              : room.status}
                          </span>
                        </div>
                        
                        <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-muted-dark)', fontWeight: 500 }}>
                          {room.capacity} {language === 'ar' ? 'أشخاص' : 'People'} · {room.floor} · {room.size} sqm
                        </div>

                        {/* Amenities preview list */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                          {(language === 'ar' ? room.amenitiesAr : room.amenities || []).slice(0, 3).map((amenity, amIdx) => (
                            <span key={amIdx} style={{
                              fontSize: '12px',
                              background: 'var(--mars-void)',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              color: 'rgba(245, 245, 245, 0.8)'
                            }}>
                              {amenity}
                            </span>
                          ))}
                        </div>

                        {/* Card Price / CTA Row */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginTop: '24px',
                          paddingTop: '16px',
                          borderTop: '1px solid rgba(245, 245, 245, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>
                              <bdi>{room.rate} SAR</bdi>
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                              {room.category === 'private_office' 
                                ? (language === 'ar' ? '/شهرياً' : '/month')
                                : (language === 'ar' ? '/ساعة' : '/hour')}
                            </span>
                          </div>
                          
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--copper-400)' }}>
                            {language === 'ar' ? 'عرض التفاصيل ←' : 'View Details →'}
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
