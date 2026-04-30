import { Role } from '@/components/RoleSwitcher';

export interface ChatSession {
  id: string;
  title: string;
  role: Role;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'viyana_chat_history';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getAllSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions: ChatSession[] = JSON.parse(raw);
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getSession(id: string): ChatSession | null {
  const sessions = getAllSessions();
  return sessions.find(s => s.id === id) || null;
}

export function saveSession(session: ChatSession): void {
  if (typeof window === 'undefined') return;
  const sessions = getAllSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session);
  }
  // Keep max 50 sessions
  const trimmed = sessions.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function deleteSession(id: string): void {
  if (typeof window === 'undefined') return;
  const sessions = getAllSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deriveTitle(messages: any[]): string {
  const firstUser = messages.find((m: any) => m.role === 'user');
  if (!firstUser) return 'New Conversation';
  
  let text = '';
  if (firstUser.parts && Array.isArray(firstUser.parts)) {
    text = firstUser.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('');
  } else if (typeof firstUser.content === 'string') {
    text = firstUser.content;
  }
  
  if (!text) return 'New Conversation';
  return text.length > 50 ? text.substring(0, 50) + '...' : text;
}

export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
