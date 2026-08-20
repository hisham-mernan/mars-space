'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/**
 * `resources.floor` is free English text maintained in the back office
 * ('Second floor', 'Floor 1') and there is no floor_ar column to read, so the
 * Arabic page was printing the English string verbatim. Translate the values
 * the floor actually uses and fall back to the raw string for anything new —
 * an untranslated label is better than a missing one.
 */
const FLOOR_LABELS_AR = {
  'ground floor': 'الطابق الأرضي',
  'first floor': 'الطابق الأول',
  'floor 1': 'الطابق الأول',
  'second floor': 'الطابق الثاني',
  'floor 2': 'الطابق الثاني',
  'third floor': 'الطابق الثالث',
  'floor 3': 'الطابق الثالث',
};

function floorLabel(floor, language) {
  if (!floor) return null;
  if (language !== 'ar') return floor;
  return FLOOR_LABELS_AR[floor.trim().toLowerCase()] ?? floor;
}

function capacityLabel(capacity, language) {
  if (capacity == null) return null;
  if (language !== 'ar') return `${capacity} ${capacity === 1 ? 'Person' : 'People'}`;
  // Arabic counts: singular, dual, plural (3-10), then the accusative singular.
  if (capacity === 1) return 'شخص واحد';
  if (capacity === 2) return 'شخصان';
  if (capacity <= 10) return `${capacity} أشخاص`;
  return `${capacity} شخصاً`;
}

/**
 * size_sqm is null on most of the bookable rooms. Returning null here drops the
 * whole segment, instead of rendering a unit with nothing in front of it.
 */
function sizeLabel(size, language) {
  if (size == null) return null;
  return language === 'ar' ? `${size} م²` : `${size} sqm`;
}

const RATE_UNIT_LABELS = {
  ar: { hour: '/ساعة', day: '/يومياً', month: '/شهرياً' },
  en: { hour: '/hour', day: '/day', month: '/month' },
};

function rateUnitLabel(unit, language) {
  return RATE_UNIT_LABELS[language === 'ar' ? 'ar' : 'en'][unit] ?? '';
}

/** Shipped with the site, so it renders even if Storage is unreachable. */
const FALLBACK_IMAGE = '/assets/photo-glass-offices.jpg';

/**
 * ---------------------------------------------------------------------------
 * Why plain <img> and not next/image
 * ---------------------------------------------------------------------------
 * `hero_image` and `resource_photos.url` are absolute URLs on the Supabase
 * Storage origin (https://xihjvfcjnkcjmgruxapu.supabase.co/storage/v1/...).
 * They are absolute rather than relative because the mobile app shares this
 * database and has no web origin to resolve a relative path against.
 *
 * next/image refuses an absolute external URL unless its host is listed in
 * `images.remotePatterns` in next.config.mjs — it throws "hostname is not
 * configured under images" at render. next.config.mjs currently declares no
 * `images` block at all, and it is not a file this change owns, so adding the
 * host there would collide with the agent that does own it.
 *
 * A plain <img> has no such requirement. What it gives up is Next's resizing
 * and format negotiation, so the two things that actually cost the user are
 * done by hand instead: `loading="lazy"` keeps ~116 images (29 cards x hero +
 * 3 thumbnails) off the initial load, and a fixed aspect-ratio box reserves
 * the space so nothing shifts as they arrive.
 *
 * If the Supabase host is later added to remotePatterns, these can become
 * <Image> with `sizes` and `fill` and this comment can go.
 */

/**
 * The hero is already on the card at full width, so a thumbnail repeating it
 * reads as a duplicate rather than as a second view of the room. Gallery rows
 * do overlap the hero in the seeded data, hence the filter.
 */
function galleryThumbs(room) {
  const gallery = Array.isArray(room.gallery) ? room.gallery : [];
  const hero = room.image;
  const seen = new Set(hero ? [hero] : []);
  const thumbs = [];
  for (const url of gallery) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    thumbs.push(url);
    if (thumbs.length === 3) break;
  }
  return thumbs;
}

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
    // Filters can be changed faster than the network answers. Without this
    // guard a slow response for the previous filter can land after the current
    // one and leave the grid showing rows that contradict the dropdowns.
    let current = true;

    async function loadWorkspaces() {
      try {
        // No `bookable` param on purpose: this page is the catalogue, so it
        // lists everything the floor has — private offices are leased by the
        // month (is_bookable = false) and belong here just as much as the
        // rooms you can reserve by the hour. Only a booking flow should send
        // bookable=true.
        let url = '/api/v1/public/workspaces';
        const params = [];
        if (selectedCategory !== 'all') params.push(`category=${encodeURIComponent(selectedCategory)}`);
        if (selectedBranch !== 'all') params.push(`branchId=${encodeURIComponent(selectedBranch)}`);
        if (params.length > 0) {
          url += '?' + params.join('&');
        }
        
        const res = await fetch(url);
        const json = await res.json();
        if (!current) return;
        // On failure clear the grid rather than leaving the previous filter's
        // rows sitting under the new selection.
        setSpaces(json.success ? json.data : []);
      } catch (err) {
        console.error("Failed to load spaces:", err);
        if (current) setSpaces([]);
      } finally {
        if (current) setLoading(false);
      }
    }
    loadWorkspaces();

    return () => {
      current = false;
    };
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
        {/* Hero Banner Section (§3) */}
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--line-dark)' }}>
          <div className="container">
            <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--copper-400)', textTransform: 'uppercase' }}>
              {t?.nav?.space || (language === 'ar' ? 'المساحة' : 'THE SPACE')}
            </span>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 200, letterSpacing: '-0.02em', color: '#FFFFFF', margin: '12px 0 0' }}>
              {t?.theSpacePage?.h1 || (language === 'ar' ? 'طابقٌ واحد، مُنسَّق بعناية وقصد.' : 'One floor, curated with intent.')}
            </h1>
            <p style={{ margin: '14px 0 0', color: 'var(--text-secondary)', maxWidth: '65ch', fontSize: '17px', lineHeight: 1.6 }}>
              {t?.theSpacePage?.sub || (language === 'ar' 
                ? 'العمل المركّز، والعمل المجدول، وكل ما بينهما — لكلٍّ مكانه اللائق هنا، ولا يبعد أيٌّ منها سوى خطوات عن الآخر.'
                : 'Focused work, scheduled work, and everything in between — each has a proper place here, and none is more than a short walk from the rest.')}
            </p>

            {/* Why One Floor (§3) */}
            <div style={{ marginTop: '32px', padding: '24px 28px', background: 'var(--surface-1)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--copper-400)', margin: '0 0 8px' }}>
                {t?.theSpacePage?.whyOneFloorTitle || (language === 'ar' ? 'أبقيناه طابقاً واحداً عن قصد.' : 'We kept it to one floor on purpose.')}
              </h3>
              <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-muted-dark)', lineHeight: 1.6 }}>
                {t?.theSpacePage?.whyOneFloorBody || (language === 'ar'
                  ? 'طابقٌ واحد يعني أن كل شيء قريب، وكل شيء مُتسق، وكل شيء خاضع للمعيار نفسه. إدارة مساحةٍ منتقاة بإتقان أسهل حين تكون في مكان واحد — والتنقُّل خلال يومك أسلس، بلا عوائق.'
                  : 'One floor means everything is close, everything is consistent, and everything is held to the same standard. It\'s easier to run a curated space well when it\'s all in one place — and easier for you to move through your day without friction.')}
              </p>
            </div>
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
                  {/* Co-working desks are part of the catalogue too; without this option
                      they appear under "All Categories" with no way to filter to them. */}
                  <option value="hot_desk">{language === 'ar' ? 'مساحة العمل المشتركة' : 'Co-working'}</option>
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
                <span style={{ fontSize: '18px', color: 'var(--copper-400)' }}>
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
                  const displayName = (language === 'ar' ? room.nameAr : room.name) || room.name;
                  const thumbs = galleryThumbs(room);

                  return (
                    <a
                      key={room.id ?? room.slug ?? idx}
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
                      {/* Hero: resources.hero_image, an absolute Supabase Storage URL.
                          The box holds its 3:2 shape before the bytes arrive, so a
                          screenful of cards does not reflow as images load in. */}
                      <div style={{ aspectRatio: '3/2', overflow: 'hidden', position: 'relative', background: 'var(--mars-void)' }}>
                        <img
                          src={room.image || FALLBACK_IMAGE}
                          alt={displayName}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            // Guard against a loop if the local fallback is the one failing.
                            if (e.currentTarget.dataset.fallback) return;
                            e.currentTarget.dataset.fallback = '1';
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
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

                      {/* Gallery: resource_photos, sorted by sort_order. Every resource
                          carries three. They are alternate views of the same room, so
                          alt="" keeps them out of the link's accessible name — the hero
                          alt and the heading already name it once. */}
                      {thumbs.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${thumbs.length}, 1fr)`, gap: '2px' }}>
                          {thumbs.map((url) => (
                            <div key={url} style={{ aspectRatio: '3/2', overflow: 'hidden', background: 'var(--mars-void)' }}>
                              <img
                                src={url}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                  // Held back from the hero so the card still reads
                                  // as one main image with supporting views.
                                  opacity: 0.72,
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                            {displayName}
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
                          {[
                            capacityLabel(room.capacity, language),
                            floorLabel(room.floor, language),
                            sizeLabel(room.size, language),
                          ].filter(Boolean).join(' · ')}
                        </div>

                        {/* Amenities preview list */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '16px' }}>
                          {/* The `|| []` bound only the English arm before, so an Arabic
                              row with no amenities_ar threw on .slice instead of
                              rendering nothing. */}
                          {((language === 'ar' ? room.amenitiesAr : room.amenities) || []).slice(0, 3).map((amenity, amIdx) => (
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
                            {room.rate > 0 ? (
                              <>
                                <span style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF' }}>
                                  <bdi>{room.rate} SAR</bdi>
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                                  {/* The unit comes from the row, not from the category: desks and
                                      the majlis are day rates, not hourly ones. */}
                                  {rateUnitLabel(room.rateUnit, language)}
                                </span>
                              </>
                            ) : (
                              /* Every private office is stored at rate 0 — they are priced per
                                 lease, not per hour — so printing "0 SAR" would be a false price. */
                              <span style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>
                                {language === 'ar' ? 'السعر عند الطلب' : 'Price on request'}
                              </span>
                            )}
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
