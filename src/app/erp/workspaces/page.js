'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function WorkspaceManagement() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for updating maintenance status
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [statusValue, setStatusValue] = useState('Available');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    async function loadSpaces() {
      try {
        const res = await fetch('/api/v1/public/workspaces');
        const json = await res.json();
        if (json.success) {
          setSpaces(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadSpaces();
  }, []);

  if (!mounted || !user) return null;

  const handleUpdateStatusSubmit = (e) => {
    e.preventDefault();
    if (!selectedSpace) return;

    setSpaces(prev =>
      prev.map(s => (s.id === selectedSpace.id ? { ...s, status: statusValue } : s))
    );
    setSelectedSpace(null);
  };

  const getStatusColor = (status) => {
    if (status === 'Available') return '#4CAF50'; // Green
    if (status === 'Occupied') return '#2196F3'; // Blue
    if (status === 'Reserved') return '#FF9800'; // Orange
    if (status === 'Cleaning') return '#FFEB3B'; // Yellow
    if (status === 'Maintenance') return '#F44336'; // Red
    return 'var(--text-muted-dark)';
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة الأصول ومساحات العمل' : 'Workspace & Assets Management'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'متابعة وتحديث حالات إشغال المكاتب الخاصة وقاعات الاجتماعات وجدولة الصيانة.' : 'Track physical spaces status, update cleaning/maintenance schedules, and assign workspaces.'}
          </p>
        </div>
      </div>

      {/* Color Legend Card */}
      <div style={{
        background: 'var(--mars-slate)',
        borderRadius: '8px',
        padding: '20px 24px',
        border: '1px solid var(--line-dark)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        fontSize: '13px',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', background: '#4CAF50', borderRadius: '50%' }} />
          <span>Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', background: '#2196F3', borderRadius: '50%' }} />
          <span>Occupied</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', background: '#FF9800', borderRadius: '50%' }} />
          <span>Reserved</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', background: '#FFEB3B', borderRadius: '50%' }} />
          <span>Cleaning</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', background: '#F44336', borderRadius: '50%' }} />
          <span>Maintenance</span>
        </div>
      </div>

      {/* Spaces Matrix Table */}
      <div style={{ background: 'var(--mars-slate)', borderRadius: '8px', border: '1px solid var(--line-dark)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--copper-400)', fontFamily: 'monospace' }}>
            LOADING WORKSPACES...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Space Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Location</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Capacity</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px 24px', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.04)' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                    <a href={`/erp/workspaces/${s.id}`} style={{ color: 'var(--copper-400)' }}>
                      {language === 'ar' ? s.nameAr : s.name}
                    </a>
                  </td>
                  <td style={{ padding: '16px 24px' }}>{s.category.replace('_', ' ')}</td>
                  <td style={{ padding: '16px 24px' }}>{s.floor}</td>
                  <td style={{ padding: '16px 24px' }}>{s.capacity} Pax</td>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: getStatusColor(s.status)
                    }}>
                      <span style={{ width: '6px', height: '6px', background: getStatusColor(s.status), borderRadius: '50%' }} />
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setSelectedSpace(s);
                        setStatusValue(s.status);
                      }}
                      style={{ background: 'none', border: 'none', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Update Status Modal */}
      {selectedSpace && (
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
            maxWidth: '400px',
            boxSizing: 'border-box',
            margin: '0 20px',
            textAlign: 'start'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF', marginBottom: '24px' }}>
              Update Space Status
            </h3>

            <form onSubmit={handleUpdateStatusSubmit} style={{ display: 'grid', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>Selected Workspace</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF', marginTop: '4px' }}>
                  {selectedSpace.name}
                </div>
              </div>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-muted-dark)' }}>
                New Status
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--line-dark)',
                    borderRadius: '4px',
                    padding: '10px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedSpace(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
