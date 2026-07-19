'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function SupportDesk() {
  const { language, t, mounted } = useLanguage();
  const [user, setUser] = useState(null);
  
  // Tickets log state
  const [tickets, setTickets] = useState([
    { id: 'MSP-2043', subject: 'Intermittent Wi-Fi issues', category: 'IT Support', priority: 'High', status: 'In Progress', lastUpdate: '15 min ago' },
    { id: 'MSP-2040', subject: 'Locker lock replacement', category: 'Maintenance', priority: 'Normal', status: 'Resolved', lastUpdate: 'Yesterday' }
  ]);

  // Modal creation states
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('IT Support');
  const [priority, setPriority] = useState('Medium');

  // Live Chat drawer states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'reception', text: 'Hello Ahmed! Nour here. How can I help you today?', time: '09:12 AM' }
  ]);
  const [typedMessage, setTypedMessage] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleCreateTicket = (e) => {
    e.preventDefault();
    if (!subject || !description) return;

    const newTicket = {
      id: `MSP-${Math.floor(1000 + Math.random() * 9000)}`,
      subject,
      category,
      priority,
      status: 'Submitted',
      lastUpdate: 'Just now'
    };

    setTickets([newTicket, ...tickets]);
    setNewTicketModal(false);
    
    // Clear inputs
    setSubject('');
    setDescription('');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg = {
      sender: 'user',
      text: typedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMsg]);
    setTypedMessage('');

    // Simulate reply after 1.5 seconds
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          sender: 'reception',
          text: 'Thank you for details. Let me check with our technicians and I will get back to you shortly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 1500);
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
            {language === 'ar' ? 'مركز الدعم الفني والمساعدة' : 'Support Desk'}
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
            {language === 'ar' ? 'يمكنك رفع تذكرة مساعدة أو بدء محادثة مباشرة لحل أي مشكلة.' : 'Submit a ticket for technical issues or start a live chat with reception.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setChatOpen(true)}
            className="btn-pill-secondary"
            style={{ padding: '10px 24px', fontSize: '13px', cursor: 'pointer' }}
          >
            {language === 'ar' ? 'محادثة مباشرة' : 'Live Chat'}
          </button>
          <button
            onClick={() => setNewTicketModal(true)}
            className="btn-pill-primary"
            style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
          >
            {language === 'ar' ? 'إنشاء تذكرة جديدة' : 'Create Ticket'}
          </button>
        </div>
      </div>

      {/* KPI Overview row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'التذاكر المفتوحة' : 'Open Tickets'}</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF', marginTop: '6px' }}>
            {tickets.filter(t => t.status !== 'Resolved').length}
          </div>
        </div>
        <div style={{ background: 'var(--mars-slate)', padding: '24px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted-dark)' }}>{language === 'ar' ? 'متوسط وقت الاستجابة' : 'Avg Response Time'}</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--copper-400)', marginTop: '6px' }}>12 mins</div>
        </div>
      </div>

      {/* Tickets List Table */}
      <div style={{ background: 'var(--mars-slate)', padding: '32px', borderRadius: '8px', border: '1px solid var(--line-dark)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 600, color: '#FFFFFF' }}>
          {language === 'ar' ? 'سجل تذاكر المساعدة' : 'Tickets Queue Log'}
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'start' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.08)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Ticket ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Subject</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Priority</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid rgba(245, 245, 245, 0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--copper-400)' }}>{t.id}</td>
                  <td style={{ padding: '12px 16px' }}>{t.subject}</td>
                  <td style={{ padding: '12px 16px' }}>{t.category}</td>
                  <td style={{ padding: '12px 16px' }}>{t.priority}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.status}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted-dark)' }}>{t.lastUpdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Ticket Modal */}
      {newTicketModal && (
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
            maxWidth: '500px',
            boxSizing: 'border-box',
            margin: '0 20px'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#FFFFFF', marginBottom: '24px' }}>
              {language === 'ar' ? 'إنشاء تذكرة دعم جديدة' : 'Submit Support Ticket'}
            </h3>

            <form onSubmit={handleCreateTicket} style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'عنوان المشكلة' : 'Subject'}
                <input type="text" required placeholder="e.g. Printer in Zone 2 is jammed" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none' }} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'فئة المشكلة' : 'Category'}
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                    <option value="IT Support">IT Support</option>
                    <option value="Maintenance">Maintenance & Repair</option>
                    <option value="Cleaning">Cleaning request</option>
                    <option value="Billing">Billing query</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                  {language === 'ar' ? 'الأولوية' : 'Priority'}
                  <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none', cursor: 'pointer' }}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: '6px', color: 'var(--text-muted-dark)' }}>
                {language === 'ar' ? 'وصف المشكلة بالتفصيل' : 'Description'}
                <textarea required rows="4" placeholder="Describe the issue in detail..." value={description} onChange={(e) => setDescription(e.target.value)} style={{ background: 'var(--mars-void)', border: '1px solid var(--line-dark)', borderRadius: '4px', padding: '10px', color: '#FFFFFF', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setNewTicketModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', cursor: 'pointer', fontWeight: 600 }}
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  style={{ padding: '10px 24px', fontSize: '13px', border: 'none', cursor: 'pointer' }}
                >
                  {language === 'ar' ? 'إرسال التذكرة' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Chat Slide-out Drawer */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: language === 'ar' ? 'auto' : 0,
          left: language === 'ar' ? 0 : 'auto',
          width: 'min(100%, 360px)',
          background: 'var(--mars-slate)',
          borderLeft: language === 'ar' ? 'none' : '1px solid var(--line-dark)',
          borderRight: language === 'ar' ? '1px solid var(--line-dark)' : 'none',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Chat Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(245,245,245,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Noura Al-Sudairi</div>
              <div style={{ fontSize: '11px', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', background: '#4CAF50', borderRadius: '50%' }} />
                Online
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted-dark)', fontSize: '20px', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Chat Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'grid',
                    gap: '4px'
                  }}
                >
                  <div style={{
                    background: isUser ? 'var(--mars-copper)' : 'var(--mars-void)',
                    color: '#FFFFFF',
                    padding: '12px 16px',
                    borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
                    fontSize: '14px',
                    lineHeight: 1.5
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted-dark)', textAlign: isUser ? 'right' : 'left' }}>
                    {msg.time}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat Input form footer */}
          <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid rgba(245,245,245,0.08)', display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              style={{
                flex: 1,
                background: 'var(--mars-void)',
                border: '1px solid var(--line-dark)',
                borderRadius: '999px',
                padding: '10px 18px',
                color: '#FFFFFF',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--mars-copper)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flex: 'none'
              }}
            >
              ➔
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
