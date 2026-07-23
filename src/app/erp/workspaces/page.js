'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function WorkspaceManagement() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility states
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);

  // Selected space trackers
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState('private_office');
  const [floor, setFloor] = useState('Floor 1');
  const [capacity, setCapacity] = useState(4);
  const [status, setStatus] = useState('Available');

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
          localStorage.setItem('mars-erp-spaces', JSON.stringify(json.data));
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

  const saveSpaces = (newSpaces) => {
    setSpaces(newSpaces);
    localStorage.setItem('mars-erp-spaces', JSON.stringify(newSpaces));
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSpace = {
      id: `space-${Date.now()}`,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      nameAr: nameAr || name,
      category,
      floor,
      capacity: Number(capacity),
      status: 'Available',
      price: category === 'private_office' ? 4500 : 80,
      description: `${category.replace('_', ' ')} layout workspace.`,
      descriptionAr: `مساحة عمل بتصميم متميز.`
    };

    saveSpaces([...spaces, newSpace]);
    setAddModal(false);
    resetForm();
  };

  const handleEditClick = (spaceItem) => {
    setSelectedSpace(spaceItem);
    setName(spaceItem.name);
    setNameAr(spaceItem.nameAr);
    setCategory(spaceItem.category);
    setFloor(spaceItem.floor);
    setCapacity(spaceItem.capacity);
    setEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedSpace) return;

    const updated = spaces.map(s =>
      s.id === selectedSpace.id
        ? {
            ...s,
            name,
            nameAr,
            category,
            floor,
            capacity: Number(capacity)
          }
        : s
    );

    saveSpaces(updated);
    setEditModal(false);
    resetForm();
  };

  const handleUpdateStatusClick = (spaceItem) => {
    setSelectedSpace(spaceItem);
    setStatus(spaceItem.status);
    setStatusModal(true);
  };

  const handleUpdateStatusSubmit = (e) => {
    e.preventDefault();
    if (!selectedSpace) return;

    const updated = spaces.map(s =>
      s.id === selectedSpace.id ? { ...s, status } : s
    );

    saveSpaces(updated);
    setStatusModal(false);
    resetForm();
  };

  const handleDeleteClick = (id) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه المساحة نهائياً؟' : 'Are you sure you want to delete this workspace?')) {
      const updated = spaces.filter(s => s.id !== id);
      saveSpaces(updated);
    }
  };

  const resetForm = () => {
    setName('');
    setNameAr('');
    setCategory('private_office');
    setFloor('Floor 1');
    setCapacity(4);
    setStatus('Available');
    setSelectedSpace(null);
  };

  const getStatusColor = (statusVal) => {
    if (statusVal === 'Available') return '#4CAF50';
    if (statusVal === 'Occupied') return '#2196F3';
    if (statusVal === 'Reserved') return '#FF9800';
    if (statusVal === 'Cleaning') return '#FFEB3B';
    if (statusVal === 'Maintenance') return '#F44336';
    return 'var(--text-secondary)';
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'إدارة الأصول ومساحات العمل' : 'Workspace & Assets Management'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {language === 'ar' ? 'متابعة وتحديث حالات إشغال المكاتب الخاصة وقاعات الاجتماعات وجدولة الصيانة.' : 'Track physical spaces status, update cleaning/maintenance schedules, and assign workspaces.'}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setAddModal(true);
          }}
          className="btn-pill-primary"
          style={{ padding: '12px 28px', fontSize: '14px', border: 'none', cursor: 'pointer' }}
        >
          {language === 'ar' ? 'إضافة مساحة جديدة' : 'Add New Workspace'}
        </button>
      </div>

      {/* Color Legend Card */}
      <div style={{
        background: 'var(--mars-slate)',
        borderRadius: '8px',
        padding: '20px 24px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-primary)'
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
      <div style={{ background: 'var(--mars-slate)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--copper-400)' }}>
            LOADING WORKSPACES...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Space Name</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Category</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Location</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Capacity</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Status</th>
                <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <a href={`/erp/workspaces/${s.id}`} style={{ color: 'var(--copper-400)' }}>
                      {language === 'ar' ? s.nameAr : s.name}
                    </a>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.category.replace('_', ' ')}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.floor}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{s.capacity} Pax</td>
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
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleUpdateStatusClick(s)}
                        style={{ background: 'none', border: 'none', color: '#4CAF50', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Status
                      </button>
                      <button
                        onClick={() => handleEditClick(s)}
                        style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(s.id)}
                        style={{ background: 'none', border: 'none', color: '#FF4A4A', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Workspace Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Add New Workspace
            </h3>

            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Space Name (English)
                <input type="text" required placeholder="e.g. Suite 104" value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Space Name (Arabic)
                <input type="text" placeholder="مثال: جناح ١٠٤" value={nameAr} onChange={(e) => setNameAr(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="private_office">Private Office</option>
                    <option value="meeting_room">Meeting Room</option>
                    <option value="dedicated_desk">Dedicated Desk</option>
                    <option value="community_floor">Community Floor</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Floor Location
                  <select value={floor} onChange={(e) => setFloor(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Floor 1">Floor 1</option>
                    <option value="Floor 2">Floor 2</option>
                    <option value="Floor 3">Floor 3</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Capacity (Pax)
                <input type="number" min="1" required value={capacity} onChange={(e) => setCapacity(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  Save Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {editModal && selectedSpace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Edit Workspace details
            </h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Space Name (English)
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Space Name (Arabic)
                <input type="text" required value={nameAr} onChange={(e) => setNameAr(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="private_office">Private Office</option>
                    <option value="meeting_room">Meeting Room</option>
                    <option value="dedicated_desk">Dedicated Desk</option>
                    <option value="community_floor">Community Floor</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Floor Location
                  <select value={floor} onChange={(e) => setFloor(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Floor 1">Floor 1</option>
                    <option value="Floor 2">Floor 2</option>
                    <option value="Floor 3">Floor 3</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Capacity (Pax)
                <input type="number" min="1" required value={capacity} onChange={(e) => setCapacity(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
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

      {/* Update Occupancy Status Modal */}
      {statusModal && selectedSpace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Update Space Occupancy
            </h3>

            <form onSubmit={handleUpdateStatusSubmit} style={{ display: 'grid', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected Workspace</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {selectedSpace.name}
                </div>
              </div>

              <label style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                New Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    background: 'var(--mars-void)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '10px',
                    color: 'var(--text-primary)',
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
                  onClick={() => setStatusModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
