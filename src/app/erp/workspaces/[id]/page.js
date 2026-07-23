'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

export default function WorkspaceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { language, mounted } = useLanguage();

  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulated IoT parameters
  const [temp, setTemp] = useState(22.5);
  const [humidity, setHumidity] = useState(42);
  const [noise, setNoise] = useState(38); // dB
  const [power, setPower] = useState(1.4); // kW

  // Cleaning Checklist state
  const [cleaningChecklist, setCleaningChecklist] = useState({
    vacuum: true,
    tables: true,
    chairs: true,
    screen: false,
    whiteboard: false,
    trash: true,
    coffee: false
  });

  useEffect(() => {
    async function loadWorkspaceDetail() {
      try {
        const res = await fetch('/api/v1/public/workspaces');
        const json = await res.json();
        if (json.success) {
          const match = json.data.find(s => s.id === id);
          if (match) {
            setSpace(match);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaceDetail();
  }, [id]);

  // Simulate IoT live data fluctuations
  useEffect(() => {
    if (!space) return;
    const interval = setInterval(() => {
      setTemp(prev => Math.round((prev + (Math.random() - 0.5) * 0.4) * 10) / 10);
      setHumidity(prev => Math.round(prev + (Math.random() - 0.5) * 2));
      setNoise(prev => Math.round(Math.max(30, Math.min(75, prev + (Math.random() - 0.5) * 6))));
      setPower(prev => Math.round(Math.max(0.5, prev + (Math.random() - 0.5) * 0.2) * 10) / 10);
    }, 2500);
    return () => clearInterval(interval);
  }, [space]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#C86B3C', fontSize: '18px' }}>LOADING DEVICE STATUS...</div>
      </div>
    );
  }

  if (!space) {
    return (
      <div style={{ background: '#0B0B0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ color: '#FFFFFF' }}>Workspace Asset not found</h2>
        <button onClick={() => router.push('/erp/workspaces')} className="btn-pill-primary" style={{ padding: '12px 28px' }}>
          Back to Workspaces
        </button>
      </div>
    );
  }

  const handleToggleCheck = (key) => {
    setCleaningChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColor = (status) => {
    if (status === 'Available') return '#4CAF50';
    if (status === 'Occupied') return '#2196F3';
    if (status === 'Reserved') return '#FF9800';
    if (status === 'Cleaning') return '#FFEB3B';
    if (status === 'Maintenance') return '#F44336';
    return 'var(--text-muted-dark)';
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Back button */}
      <div>
        <a href="/erp/workspaces" style={{ fontSize: '14px', color: 'var(--copper-400)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          ← {language === 'ar' ? 'العودة لإدارة المساحات' : 'Back to workspaces'}
        </a>
      </div>

      {/* Title */}
      <div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--copper-400)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {space.category.replace('_', ' ')}
        </span>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, marginTop: '6px' }}>
          {language === 'ar' ? space.nameAr : space.name} (Asset View)
        </h1>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
        gap: '32px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Asset Detail specifications and Cleaning log */}
        <div style={{ gridColumn: 'span 2', display: 'grid', gap: '32px' }}>
          
          {/* Detailed Specifications info card */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF', borderBottom: '1px solid rgba(245, 245, 245, 0.08)', paddingBottom: '16px' }}>
              Workspace Asset Profile
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Asset ID</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>AST-RUH-A101</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Status</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: getStatusColor(space.status), marginTop: '4px' }}>
                  {space.status}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Serial Number</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>SN-48820019283</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Warranty Expiry</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>12 Dec 2028</div>
              </div>
            </div>
          </div>

          {/* Cleaning Checklist checklist widget */}
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              Cleaning Management Checklist
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
              Check off tasks completed by the floor cleaning crew to update the room status.
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              {Object.keys(cleaningChecklist).map((key) => {
                const checked = cleaningChecklist[key];
                const label = {
                  vacuum: 'Vacuum floor carpet',
                  tables: 'Sanitize desk surfaces',
                  chairs: 'Clean conference chairs',
                  screen: 'Wipe interactive Smart TV display',
                  whiteboard: 'Erase writing whiteboard board',
                  trash: 'Empty wastebin trash bins',
                  coffee: 'Restock coffee station'
                }[key];

                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: checked ? 'var(--text-muted-dark)' : '#FFFFFF',
                      textDecoration: checked ? 'line-through' : 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleCheck(key)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: IoT Telemetry simulator panel */}
        <div>
          <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 600, color: '#FFFFFF' }}>
              IoT Telemetry Simulator
            </h3>
            <span style={{ fontSize: '11px', color: '#4CAF50', fontWeight: 700, textTransform: 'uppercase' }}>
              ● Live Connection Established
            </span>

            <div style={{ display: 'grid', gap: '20px', marginTop: '24px' }}>
              {/* Temp Sensor */}
              <div style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Ambient Temperature</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                  {temp} °C
                </div>
              </div>

              {/* Humidity Sensor */}
              <div style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Relative Humidity</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                  {humidity} %
                </div>
              </div>

              {/* Noise Level */}
              <div style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Noise Sensor Level</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: noise > 60 ? '#FF4A4A' : '#FFFFFF', marginTop: '6px' }}>
                  {noise} dB
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted-dark)', marginTop: '4px' }}>
                  {noise > 60 ? 'Warning: High volume detected' : 'Comfortable workspace level'}
                </div>
              </div>

              {/* Power Consumption */}
              <div style={{ background: 'var(--mars-void)', padding: '16px', borderRadius: '6px', border: '1px solid var(--line-dark)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted-dark)' }}>Power Load</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
                  {power} kW
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
