'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ErpInventory() {
  const { language, theme, mounted } = useLanguage();
  const [user, setUser] = useState(null);

  // Seeded inventory list
  const [inventory, setInventory] = useState([
    { id: 'inv-01', name: 'MacBook Pro 14"', category: 'Electronics', quantity: 8, minStock: 3, branch: 'Jeddah', cost: 7200 },
    { id: 'inv-02', name: 'LG 27" 4K Monitor', category: 'Electronics', quantity: 15, minStock: 5, branch: 'Jeddah', cost: 1800 },
    { id: 'inv-03', name: 'Ergonomic Office Chair', category: 'Furniture', quantity: 24, minStock: 8, branch: 'Jeddah', cost: 950 },
    { id: 'inv-04', name: 'Arabica Coffee Beans (5kg)', category: 'Pantry', quantity: 2, minStock: 4, branch: 'Jeddah', cost: 350 },
    { id: 'inv-05', name: 'HDMI to USB-C Adapter', category: 'Electronics', quantity: 30, minStock: 10, branch: 'Jeddah', cost: 90 },
    { id: 'inv-06', name: 'A4 Printing Paper (box)', category: 'Office Supplies', quantity: 12, minStock: 5, branch: 'Jeddah', cost: 180 }
  ]);

  // Modal form states
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState(1);
  const [minStock, setMinStock] = useState(1);
  const [branch, setBranch] = useState('Jeddah');
  const [cost, setCost] = useState(100);

  // Filter state
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // Load local inventory if saved
    const savedInv = localStorage.getItem('mars-erp-inventory');
    if (savedInv) {
      setInventory(JSON.parse(savedInv));
    }
  }, []);

  const saveInventory = (newInv) => {
    setInventory(newInv);
    localStorage.setItem('mars-erp-inventory', JSON.stringify(newInv));
  };

  if (!mounted || !user) return null;

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem = {
      id: `inv-${Date.now()}`,
      name,
      category,
      quantity: Number(quantity),
      minStock: Number(minStock),
      branch,
      cost: Number(cost)
    };

    saveInventory([newItem, ...inventory]);
    setAddModal(false);
    resetForm();
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setName(item.name);
    setCategory(item.category);
    setQuantity(item.quantity);
    setMinStock(item.minStock);
    setBranch(item.branch);
    setCost(item.cost);
    setEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const updated = inventory.map(item =>
      item.id === selectedItem.id
        ? {
            ...item,
            name,
            category,
            quantity: Number(quantity),
            minStock: Number(minStock),
            branch,
            cost: Number(cost)
          }
        : item
    );

    saveInventory(updated);
    setEditModal(false);
    resetForm();
  };

  const handleDeleteClick = (id) => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الأصل؟' : 'Are you sure you want to delete this asset item?')) {
      const updated = inventory.filter(item => item.id !== id);
      saveInventory(updated);
    }
  };

  const resetForm = () => {
    setName('');
    setCategory('Electronics');
    setQuantity(1);
    setMinStock(1);
    setBranch('Jeddah');
    setCost(100);
    setSelectedItem(null);
  };

  const filteredInventory = inventory.filter(item => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const lowStockCount = inventory.filter(item => item.quantity <= item.minStock).length;

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: 'var(--text-primary)', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'نظام إدارة المخزون والأصول' : 'Inventory & Asset Tracking'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {language === 'ar' ? 'تتبع اللوازم والمعدات والأصول المتوفرة في الفروع وطلبات الشراء.' : 'Monitor operational supplies, tech gear, spare parts, and stock alerts.'}
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
          {language === 'ar' ? 'إضافة أصل للمستودع' : 'Add Inventory Item'}
        </button>
      </div>

      {/* KPI indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {language === 'ar' ? 'إجمالي الأصول والقطع' : 'Total Asset Items'}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>
            {inventory.reduce((acc, curr) => acc + curr.quantity, 0)}
          </div>
        </div>

        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {language === 'ar' ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts'}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: lowStockCount > 0 ? '#FF4A4A' : '#4CAF50', marginTop: '8px' }}>
            {lowStockCount} {language === 'ar' ? 'عناصر ناقصة' : 'Items'}
          </div>
        </div>

        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            {language === 'ar' ? 'القيمة الإجمالية للمستودع' : 'Total Value'}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--copper-400)', marginTop: '8px' }}>
            {inventory.reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0).toLocaleString()} SAR
          </div>
        </div>
      </div>

      {/* Category filters selectors */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {['all', 'Electronics', 'Furniture', 'Pantry', 'Office Supplies'].map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: 'none',
                border: 'none',
                padding: '12px 4px',
                color: isActive ? 'var(--copper-400)' : 'var(--text-secondary)',
                borderBottom: isActive ? '2px solid var(--copper-400)' : 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {cat === 'all' ? (language === 'ar' ? 'الكل' : 'All') : cat}
            </button>
          );
        })}
      </div>

      {/* Inventory list Table */}
      <div style={{ background: 'var(--mars-slate)', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{language === 'ar' ? 'الاسم' : 'Item Name'}</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{language === 'ar' ? 'الفئة' : 'Category'}</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{language === 'ar' ? 'الفرع' : 'Branch'}</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{language === 'ar' ? 'التكلفة الفردية' : 'Unit Cost'}</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{language === 'ar' ? 'الكمية المتوفرة' : 'Stock level'}</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => {
              const isLow = item.quantity <= item.minStock;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{item.category}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{item.branch}</td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.cost} SAR</td>
                  <td style={{ padding: '16px 24px', fontWeight: 600 }}>
                    <span style={{
                      color: isLow ? '#FF4A4A' : '#4CAF50',
                      background: isLow ? 'rgba(255, 74, 74, 0.08)' : 'rgba(76, 175, 80, 0.08)',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}>
                      {item.quantity} units {isLow && `(${language === 'ar' ? 'ناقص' : 'Low'})`}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleEditClick(item)}
                        style={{ background: 'none', border: 'none', color: 'var(--copper-400)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        {language === 'ar' ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        style={{ background: 'none', border: 'none', color: '#FF4A4A', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Inventory Item Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              {language === 'ar' ? 'إضافة صنف جديد للمخزون' : 'Add Inventory Asset'}
            </h3>

            <form onSubmit={handleAddSubmit} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                {language === 'ar' ? 'اسم الصنف' : 'Item Name'}
                <input type="text" required placeholder="e.g. LG Monitor" value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Office Supplies">Office Supplies</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Branch Location
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Jeddah">Jeddah</option>
                    <option value="Riyadh">Riyadh</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Stock Quantity
                  <input type="number" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Minimum Warning Stock
                  <input type="number" min="0" required value={minStock} onChange={(e) => setMinStock(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
              </div>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Unit Purchase Price (SAR)
                <input type="number" min="0" required value={cost} onChange={(e) => setCost(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Inventory Item Modal */}
      {editModal && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--mars-slate)', padding: '36px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', boxSizing: 'border-box', margin: '0 20px', textAlign: 'start' }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)', marginBottom: '24px' }}>
              Edit Inventory Asset
            </h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Item Name
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Category
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Electronics">Electronics</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Office Supplies">Office Supplies</option>
                  </select>
                </label>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Branch Location
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Jeddah">Jeddah</option>
                    <option value="Riyadh">Riyadh</option>
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Stock Quantity
                  <input type="number" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>

                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                  Minimum Warning Stock
                  <input type="number" min="0" required value={minStock} onChange={(e) => setMinStock(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
                </label>
              </div>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-secondary)' }}>
                Unit Purchase Price (SAR)
                <input type="number" min="0" required value={cost} onChange={(e) => setCost(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
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

    </div>
  );
}
