'use client';

import React from 'react';
import { MessageSquare, CalendarClock, Shield, Settings, Activity } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'chat', label: 'AI Workspace', icon: <MessageSquare size={18} /> },
    { id: 'alerts', label: 'Alerts & Reminders', icon: <CalendarClock size={18} /> },
    { id: 'privacy', label: 'Privacy Vault', icon: <Shield size={18} /> },
    { id: 'integrations', label: 'Integrations', icon: <Activity size={18} /> },
  ];

  return (
    <div className="glass-panel sidebar-wrapper">
      <div className="brand-section">
        <div className="brand-avatar">
          V
          <span className="online-dot" />
        </div>
        <div className="brand-text">
          <span className="brand-title">VIYANA</span>
          <span className="brand-subtitle">Aethel Solutions</span>
        </div>
      </div>

      <nav className="nav-links">
        {menuItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-item-icon">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: 'auto' }}>
        <button
          onClick={() => onTabChange('settings')}
          className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
          style={{ width: '100%' }}
        >
          <span className="nav-item-icon"><Settings size={18} /></span>
          <span>System Settings</span>
        </button>
      </div>
    </div>
  );
}
