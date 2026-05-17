'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import WorkflowBuilder from '@/components/WorkflowBuilder';

export default function Home() {
  const [activeView, setActiveView] = useState('chat');
  const [currentChatId, setCurrentChatId] = useState('session-' + Date.now());
  const [chatHistory, setChatHistory] = useState<{id: string, title: string}[]>([]);

  const handleNewChat = () => {
    // Save current session to history if it has messages (for demo, we save all)
    if (!chatHistory.find(c => c.id === currentChatId)) {
      setChatHistory(prev => [{ id: currentChatId, title: 'Session ' + (prev.length + 1) }, ...prev]);
    }
    
    // Start new session
    setCurrentChatId('session-' + Date.now());
    setActiveView('chat');
  };

  const handleChatSelect = (id: string) => {
    setCurrentChatId(id);
    setActiveView('chat');
  };

  return (
    <main className="flex min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        onChatSelect={handleChatSelect}
      />

      {/* Main Content Area */}
      <div className="flex-1 relative h-screen">
        {/* Chat Window - kept in DOM but hidden to prevent state loss */}
        <div className={activeView === 'chat' ? 'block h-full' : 'hidden h-full'}>
          <ChatWindow chatId={currentChatId} />
        </div>
        
        {/* Workflow Builder - kept in DOM but hidden to prevent iframe reload */}
        <div className={activeView === 'workflow' ? 'block h-full' : 'hidden h-full'}>
          <WorkflowBuilder />
        </div>
      </div>
    </main>
  );
}
