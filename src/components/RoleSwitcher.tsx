'use client';

import React from 'react';
import { ShoppingBag, Calendar, ShieldCheck } from 'lucide-react';

export type Role = 'sales' | 'secretary' | 'factchecker';

interface RoleSwitcherProps {
  activeRole: Role;
  onChangeRole: (role: Role) => void;
}

export default function RoleSwitcher({ activeRole, onChangeRole }: RoleSwitcherProps) {
  const roles: { id: Role; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    {
      id: 'sales',
      label: 'Sales & Marketing',
      icon: <ShoppingBag size={20} />,
      color: 'var(--sales-accent)',
      desc: 'Automate interactions'
    },
    {
      id: 'secretary',
      label: 'Personal Secretary',
      icon: <Calendar size={20} />,
      color: 'var(--secretary-accent)',
      desc: 'Alerts & schedules'
    },
    {
      id: 'factchecker',
      label: 'Fact Checker',
      icon: <ShieldCheck size={20} />,
      color: 'var(--factcheck-accent)',
      desc: 'Verify insights'
    }
  ];

  return (
    <div className="role-switcher-container">
      <div className="role-section-title">
        Viyana Persona
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {roles.map((role) => {
          const isActive = activeRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => onChangeRole(role.id)}
              className="role-card"
              style={{
                borderColor: isActive ? role.color : 'var(--color-border)',
                borderWidth: isActive ? '1.5px' : '1px',
                boxShadow: isActive ? `0 0 15px -5px ${role.color}` : 'none'
              }}
            >
              <div 
                className="role-icon-box"
                style={{ 
                  background: isActive ? role.color : 'rgba(255,255,255,0.03)',
                  color: isActive ? '#000' : 'var(--text-bright)',
                }}
              >
                {role.icon}
              </div>
              <div className="role-text-box">
                <span className="role-label">
                  {role.label}
                </span>
                <span className="role-desc">
                  {role.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
