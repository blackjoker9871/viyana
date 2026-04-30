'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { Send, Sparkles, User, ShieldAlert } from 'lucide-react';
import { Role } from './RoleSwitcher';
import { ChatSession, saveSession, deriveTitle, generateId } from '@/lib/chat-history';

interface ChatInterfaceProps {
  activeRole: Role;
  activeSessionId: string | null;
  onSessionUpdate: () => void;
}

export default function ChatInterface({ activeRole, activeSessionId, onSessionUpdate }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  
  const { messages, sendMessage, status, error, setMessages } = useChat({} as any) as any;

  const isLoading = status === 'submitted' || status === 'streaming';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(activeSessionId || generateId());

  // Track the active session ID
  useEffect(() => {
    if (activeSessionId) {
      sessionIdRef.current = activeSessionId;
    }
  }, [activeSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist messages to localStorage whenever they change and status is ready
  useEffect(() => {
    if (messages.length > 0 && status === 'ready') {
      const session: ChatSession = {
        id: sessionIdRef.current,
        title: deriveTitle(messages),
        role: activeRole,
        messages: messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          parts: m.parts,
          content: m.content,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      saveSession(session);
      onSessionUpdate();
    }
  }, [messages, status]);

  const getRoleAccentColor = (role: Role) => {
    switch (role) {
      case 'sales': return 'var(--sales-accent)';
      case 'secretary': return 'var(--secretary-accent)';
      case 'factchecker': return 'var(--factcheck-accent)';
    }
  };

  const getRoleBadgeLabel = (role: Role) => {
    switch (role) {
      case 'sales': return 'Sales Agent';
      case 'secretary': return 'Personal Secretary';
      case 'factchecker': return 'Fact Checker';
    }
  };

  // Extract text content from message parts (AI SDK v6 format)
  const getMessageText = (message: any): string => {
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('');
    }
    if (typeof message.content === 'string') {
      return message.content;
    }
    return '';
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    sendMessage({
      text: input,
    }, {
      body: {
        role: activeRole,
      }
    });

    setInput('');
  };

  return (
    <div className="glass-panel chat-wrapper">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-status">
          <div 
            className="status-indicator" 
            style={{ backgroundColor: getRoleAccentColor(activeRole) }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600', color: 'var(--text-bright)', fontSize: '16px' }}>
              Viyana
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              {getRoleBadgeLabel(activeRole)}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--color-border)', fontWeight: '600', letterSpacing: '0.5px' }}>
          Gemma 4
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-box">
              <Sparkles size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-bright)' }}>
              How can I assist Aethel Solutions?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
              Viyana agent workspace is ready. Select an interaction role to adjust parameters seamlessly.
            </p>
          </div>
        ) : (
          messages.map((message: any) => {
            const isAI = message.role === 'assistant';
            const text = getMessageText(message);
            if (!text && !isLoading) return null;
            return (
              <div
                key={message.id}
                className={`message-row ${isAI ? 'ai' : 'user'}`}
              >
                <div 
                  className="avatar-box"
                  style={{
                    backgroundColor: isAI ? 'rgba(0,0,0,0.4)' : 'rgba(138,43,226,0.15)',
                    borderColor: isAI ? getRoleAccentColor(activeRole) : 'rgba(138,43,226,0.3)',
                    color: isAI ? getRoleAccentColor(activeRole) : 'var(--text-bright)',
                  }}
                >
                  {isAI ? <Sparkles size={16} /> : <User size={16} />}
                </div>
                <div 
                  className="glass-card message-bubble"
                  style={{
                    borderLeft: isAI ? `3px solid ${getRoleAccentColor(activeRole)}` : '1px solid var(--color-border)',
                  }}
                >
                  {text || 'Thinking...'}
                </div>
              </div>
            );
          })
        )}

        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="message-row ai">
            <div 
              className="avatar-box"
              style={{
                borderColor: getRoleAccentColor(activeRole),
                color: getRoleAccentColor(activeRole),
              }}
            >
              <Sparkles size={16} className="status-indicator" />
            </div>
            <div className="glass-card message-bubble" style={{ color: 'var(--text-dim)' }}>
              Processing briefing request...
            </div>
          </div>
        )}

        {error && (
          <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
            <ShieldAlert size={20} />
            <span>Connection check failed: {error.message}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={onSubmit} className="message-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Instruct Viyana Persona (${getRoleBadgeLabel(activeRole)})...`}
          disabled={isLoading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="send-button"
          style={{
            backgroundColor: getRoleAccentColor(activeRole),
            opacity: isLoading || !input.trim() ? 0.6 : 1,
            color: '#000',
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
