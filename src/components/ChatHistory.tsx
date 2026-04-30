'use client';

import React from 'react';
import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';
import { ChatSession, formatTimestamp } from '@/lib/chat-history';
import { Role } from './RoleSwitcher';

interface ChatHistoryProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

const roleColors: Record<Role, string> = {
  sales: 'var(--sales-accent)',
  secretary: 'var(--secretary-accent)',
  factchecker: 'var(--factcheck-accent)',
};

const roleLabels: Record<Role, string> = {
  sales: 'Sales',
  secretary: 'Secretary',
  factchecker: 'Fact Check',
};

export default function ChatHistory({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatHistoryProps) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0', overflow: 'hidden', maxHeight: '400px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          Chat History
        </div>
        <button
          onClick={onNewChat}
          title="New Chat"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(138,43,226,0.15)', border: '1px solid rgba(138,43,226,0.3)',
            color: '#a855f7', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Session List */}
      <div style={{ flex: '1', overflowY: 'auto', padding: '6px' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            No conversations yet. Start chatting!
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                  background: isActive ? 'rgba(138,43,226,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(138,43,226,0.2)' : '1px solid transparent',
                  transition: 'all 0.2s', marginBottom: '2px',
                }}
              >
                <MessageSquare size={14} style={{ color: roleColors[session.role], flexShrink: 0 }} />
                <div style={{ flex: '1', minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', fontWeight: '500', color: 'var(--text-bright)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {session.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '600', color: roleColors[session.role],
                      background: `${roleColors[session.role]}15`, padding: '1px 6px',
                      borderRadius: '4px',
                    }}>
                      {roleLabels[session.role]}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      {formatTimestamp(session.updatedAt)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  title="Delete"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '6px',
                    background: 'transparent', border: 'none',
                    color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.5,
                    transition: 'all 0.2s', flexShrink: 0,
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
