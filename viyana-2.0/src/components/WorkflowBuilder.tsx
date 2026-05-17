'use client';

import React from 'react';
import { ExternalLink, Maximize2, RefreshCw } from 'lucide-react';

export default function WorkflowBuilder() {
  const n8nUrl = process.env.NEXT_PUBLIC_N8N_URL || 'http://localhost:5678';

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#171717]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Maximize2 size={16} className="text-blue-500" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">n8n Workflow Builder</h1>
            <p className="text-[10px] text-gray-500 font-medium">Automate your AI store workflows</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const iframe = document.getElementById('n8n-builder-iframe') as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
            }}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Refresh Builder"
          >
            <RefreshCw size={18} />
          </button>
          <a 
            href={n8nUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <ExternalLink size={14} />
            <span>Open in New Tab</span>
          </a>
        </div>
      </header>

      {/* Builder Container */}
      <div className="flex-1 relative bg-[#0a0a0a]">
        <div className="absolute inset-0 flex items-center justify-center z-0">
           <div className="flex flex-col items-center gap-4 text-center px-6">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Connecting to n8n engine...</p>
           </div>
        </div>
        
        <iframe 
          id="n8n-builder-iframe"
          src={n8nUrl}
          className="absolute inset-0 w-full h-full border-none z-10"
          title="n8n Workflow Builder"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
