'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import RoleSwitcher, { Role } from '@/components/RoleSwitcher';
import ChatInterface from '@/components/ChatInterface';
import ChatHistory from '@/components/ChatHistory';
import { getAllSessions, deleteSession, getSession, generateId } from '@/lib/chat-history';
import type { ChatSession } from '@/lib/chat-history';
import { CalendarClock, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState('chat');
  const [activeRole, setActiveRole] = useState<Role>('sales');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0); // Force remount on new chat

  // Load sessions from localStorage
  useEffect(() => {
    setSessions(getAllSessions());
  }, []);

  const refreshSessions = useCallback(() => {
    setSessions(getAllSessions());
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setChatKey(prev => prev + 1); // Force remount ChatInterface
  }, []);

  const handleSelectSession = useCallback((id: string) => {
    const session = getSession(id);
    if (session) {
      setActiveRole(session.role);
      setActiveSessionId(id);
      setChatKey(prev => prev + 1);
    }
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    deleteSession(id);
    refreshSessions();
    if (activeSessionId === id) {
      handleNewChat();
    }
  }, [activeSessionId, refreshSessions, handleNewChat]);

  const renderTabContent = () => {
    switch (currentTab) {
      case 'chat':
        return (
          <div className="workspace-layout">
            <div className="controls-sidebar">
              <RoleSwitcher activeRole={activeRole} onChangeRole={setActiveRole} />
              
              <ChatHistory
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectSession={handleSelectSession}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
              />

              {/* Quick Tip Card */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--text-bright)' }}>
                  <HelpCircle size={16} style={{ color: '#818cf8' }} />
                  Pro Tip
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
                  Switch personas to tailor responses. Use Sales for customer engagement, Secretary for schedule management, and Fact Checker for analytical tasks.
                </span>
              </div>
            </div>
            
            <ChatInterface
              key={chatKey}
              activeRole={activeRole}
              activeSessionId={activeSessionId}
              onSessionUpdate={refreshSessions}
            />
          </div>
        );

      case 'alerts':
        return (
          <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '48px', textAlign: 'center', maxWidth: '600px', margin: '48px auto', gap: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(233,64,87,0.1)', color: 'var(--secretary-accent)', display: 'flex', justifyContent: 'center' }}>
              <CalendarClock size={36} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-bright)' }}>Personal Secretary & Alerts</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Vercel Cron runs automatically to send alerts. Set up custom prompts directly by discussing schedules with the Personal Secretary persona.
            </p>
            <button 
              onClick={() => setCurrentTab('chat')} 
              className="nav-item active"
              style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}
            >
              Enter Workspace <ArrowRight size={16} />
            </button>
          </div>
        );

      case 'privacy':
        return (
          <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '48px', textAlign: 'center', maxWidth: '600px', margin: '48px auto', gap: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(0,242,96,0.1)', color: 'var(--factcheck-accent)', display: 'flex', justifyContent: 'center' }}>
              <ShieldCheck size={36} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-bright)' }}>Privacy Vault</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              Your private analytics database is secured in compliance formats. Viyana uses sandbox parameters for user-provided secrets.
            </p>
          </div>
        );

      default:
        return (
          <div className="glass-panel flex flex-col items-center justify-center" style={{ padding: '48px', textAlign: 'center', maxWidth: '500px', margin: '48px auto' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Deployment modules loading...</span>
          </div>
        );
    }
  };

  return (
    <main className="app-container">
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
      <div className="main-content">
        {renderTabContent()}
      </div>
    </main>
  );
}
