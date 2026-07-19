'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function BiAiCopilot() {
  const { language, mounted } = useLanguage();
  const [user, setUser] = useState(null);

  // Chat conversation logs state
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your AI Executive Assistant. Ask me anything about financial projections, space occupancy, or operations.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('mars-user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!mounted || !user) return null;

  const handleAsk = (queryText) => {
    if (!queryText.trim()) return;

    // Add user message
    const userMsg = { sender: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    // Simulate AI thinking and response after 1.5 seconds
    setTimeout(() => {
      let replyText = '';
      const lowerQ = queryText.toLowerCase();

      if (lowerQ.includes('risk') || lowerQ.includes('overdue')) {
        replyText = `Based on financial parsing, there is 1 high-risk invoice accounts:
- INV-2026-001302 (Locker Rental, Amount: 150 SAR, Status: Unpaid, Due Date: 2026-07-26).
- Ahmed Alharbi has a pending payment notification. I recommend sending a automated SMS trigger.`;
      } else if (lowerQ.includes('project') || lowerQ.includes('forecast') || lowerQ.includes('revenue')) {
        replyText = `Q3/Q4 Financial Projections:
- Estimated Q3 Revenue: 2.45M SAR (▲ 11.2% QoQ)
- Estimated Q4 Revenue: 2.82M SAR (▲ 14.8% QoQ)
- Drivers: High renewal rate (92%) on Private Suites and growing event sponsorships.`;
      } else if (lowerQ.includes('pricing') || lowerQ.includes('adjust') || lowerQ.includes('recommend')) {
        replyText = `Suggested pricing adjustments for Jeddah branch:
1. Meeting Room Alpha: Increase hourly rate from 80 SAR to 95 SAR (utilization is at peak 98% during 10 AM - 4 PM).
2. Dedicated Desks: Maintain current pricing at 1,200 SAR (current occupancy is stable at 61%).`;
      } else {
        replyText = `I analyzed the database records. Here is a quick operations summary:
- Total active memberships: 642
- MTD revenue: 812,000 SAR
- System operations status: Normal (0 sensor alerts in workspaces).`;
      }

      setMessages(prev => [...prev, { sender: 'ai', text: replyText }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <div style={{ display: 'grid', gap: '32px' }}>
      
      {/* Back link */}
      <div>
        <a href="/erp/bi" style={{ fontSize: '14px', color: 'var(--copper-400)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          ← {language === 'ar' ? 'العودة لتحليلات الأعمال' : 'Back to BI analytics'}
        </a>
      </div>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', fontWeight: 300, margin: 0 }}>
          {language === 'ar' ? 'المساعد التنفيذي الذكي' : 'AI Executive Copilot'}
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted-dark)', fontSize: '14px' }}>
          {language === 'ar' ? 'اسأل المساعد الذكي عن توقعات الإيرادات والشركات المتعثرة ومقترحات الأسعار.' : 'Query the Mars DB in natural language to generate instant financial projections and risk reports.'}
        </p>
      </div>

      {/* Suggestion prompts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {[
          'Show high-risk accounts',
          'Generate Q3/Q4 revenue projections',
          'Recommend pricing adjustments'
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(prompt)}
            style={{
              background: 'var(--mars-slate)',
              border: '1px solid var(--line-dark)',
              borderRadius: '999px',
              padding: '8px 18px',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 120ms ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--copper-400)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--line-dark)'}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation Chat frame */}
      <div style={{
        background: 'var(--mars-slate)',
        borderRadius: '8px',
        border: '1px solid var(--line-dark)',
        height: '420px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Messages feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}>
          {messages.map((msg, idx) => {
            const isAi = msg.sender === 'ai';
            return (
              <div
                key={idx}
                style={{
                  alignSelf: isAi ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                  background: isAi ? 'var(--mars-void)' : 'var(--mars-copper)',
                  border: isAi ? '1px solid var(--line-dark)' : 'none',
                  borderRadius: isAi ? '8px 8px 8px 0' : '8px 8px 0 8px',
                  padding: '16px 20px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'start'
                }}
              >
                {msg.text}
              </div>
            );
          })}
          {loading && (
            <div style={{ alignSelf: 'flex-start', color: 'var(--copper-400)', fontSize: '13px', fontFamily: 'monospace' }}>
              AI IS PARSING DATA RECORDS...
            </div>
          )}
        </div>

        {/* Input form footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputVal);
          }}
          style={{
            padding: '20px',
            borderTop: '1px solid rgba(245,245,245,0.08)',
            display: 'flex',
            gap: '12px'
          }}
        >
          <input
            type="text"
            placeholder="Ask AI Copilot..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--mars-void)',
              border: '1px solid var(--line-dark)',
              borderRadius: '6px',
              padding: '12px 18px',
              color: '#FFFFFF',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            className="btn-pill-primary"
            style={{ padding: '12px 28px', border: 'none', cursor: 'pointer' }}
          >
            Ask
          </button>
        </form>
      </div>

    </div>
  );
}
