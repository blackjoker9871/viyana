'use client';

import React from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Settings, 
  User, 
  ChevronLeft,
  LayoutGrid,
  History,
  Workflow
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = ({ 
  activeView = 'chat', 
  onViewChange = () => {},
  onNewChat = () => {},
  chatHistory = [],
  onChatSelect = () => {}
}: { 
  activeView?: string, 
  onViewChange?: (view: string) => void,
  onNewChat?: () => void,
  chatHistory?: { id: string, title: string }[],
  onChatSelect?: (id: string) => void
}) => {
  return (
    <aside className="w-64 h-screen bg-[#0a0a0a] border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button onClick={() => onViewChange('chat')} className="flex items-center gap-2 group text-left">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white group-hover:scale-105 transition-transform">V</div>
          <span className="font-semibold text-white tracking-tight">Viyana 2.0</span>
        </button>
        <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-4 mb-4">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium text-white group"
        >
          <Plus size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-2 mb-4 space-y-1">
        <button 
          onClick={() => onViewChange('chat')} 
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all group ${activeView === 'chat' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <MessageSquare size={16} className={activeView === 'chat' ? 'text-blue-500' : 'text-gray-600 group-hover:text-blue-500'} />
          <span className="text-sm font-medium">Chat</span>
        </button>
        <button 
          onClick={() => onViewChange('workflow')} 
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all group ${activeView === 'workflow' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          <Workflow size={16} className={activeView === 'workflow' ? 'text-blue-500' : 'text-gray-600 group-hover:text-blue-500'} />
          <span className="text-sm font-medium">Workflow</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
          <input 
            type="text" 
            placeholder="Search chats..."
            className="w-full bg-white/5 border-none rounded-lg py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-white/10 transition-all placeholder:text-gray-700 text-white"
          />
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        <div>
          <div className="px-4 mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-600 font-bold">
            <History size={10} />
            <span>Recent Activity</span>
          </div>
          <div className="space-y-0.5">
            {chatHistory.length === 0 ? (
              <div className="px-4 py-2 text-[10px] text-gray-700 italic">No recent chats</div>
            ) : (
              chatHistory.map((chat) => (
                <button 
                  key={chat.id} 
                  onClick={() => onChatSelect(chat.id)}
                  className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all group text-left"
                >
                  <MessageSquare size={14} className="text-gray-700 group-hover:text-blue-500" />
                  <span className="truncate">{chat.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="px-4 mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-600 font-bold">
            <LayoutGrid size={10} />
            <span>Workspaces</span>
          </div>
          <div className="space-y-0.5">
            {['Production Store', 'Development MVP'].map((workspace) => (
              <button key={workspace} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all group text-left">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-500" />
                <span className="truncate">{workspace}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-400 hover:text-white transition-all">
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">BJ</div>
            <span className="text-sm text-white font-medium">BlackJokeR</span>
          </div>
          <User size={14} className="text-gray-600" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
