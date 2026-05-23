'use client';

import React, { useState } from 'react';
import { ExternalLink, Maximize2, RefreshCw, PhoneCall, Play, Volume2, ShieldCheck, Sparkles, X } from 'lucide-react';

export default function TelecallerEngine() {
  const voiceUrl = process.env.NEXT_PUBLIC_VOICE_URL || 'https://voice.aethelsolutions.in';
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testPrompt, setTestPrompt] = useState('Vanakkam sir! Neenga Aethel Solutions la enquire panni irunthinga. Unga uniform requirement pathi pesalama?');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'loading' | null, text: string }>({ type: null, text: '' });

  const handleTriggerTestCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid phone number' });
      return;
    }

    setStatusMsg({ type: 'loading', text: 'Initiating AI voice channel via Dograh SIP Gateway...' });
    
    try {
      // Hit local triage/trigger API or direct webhook
      const res = await fetch('/api/telecaller/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          prompt: testPrompt,
          campaign: 'Viyana Direct Outbound Test'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '🎉 Outbound call dispatched successfully to Android SIP Gateway!' });
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to dispatch call' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Failed to connect to telecaller API: ' + err.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#171717]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center">
            <PhoneCall size={16} className="text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white">AI Telecaller Control Room</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                GROQ + DEEPGRAM
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium">Dograh SIP Voice Engine & Real-time WebRTC Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all shadow-lg shadow-emerald-600/10"
          >
            <Play size={14} className="fill-current" />
            <span>Test Outbound Call</span>
          </button>

          <button 
            onClick={() => {
              const iframe = document.getElementById('voice-engine-iframe') as HTMLIFrameElement;
              if (iframe) iframe.src = iframe.src;
            }}
            className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Refresh Dashboard"
          >
            <RefreshCw size={18} />
          </button>

          <a 
            href={voiceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-emerald-600/20"
          >
            <ExternalLink size={14} />
            <span>Open Dashboard</span>
          </a>
        </div>
      </header>

      {/* Test Outbound Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Volume2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Trigger Test Voice Call</h3>
                  <p className="text-xs text-gray-400">Instantly call a lead with a custom AI prompt</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTestModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriggerTestCall} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Lead Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 919944772702"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
                <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-emerald-500" /> Ensure phone is accessible via Jio Gateway.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Initial AI System Prompt / Opening Line
                </label>
                <textarea
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none"
                />
              </div>

              {statusMsg.type && (
                <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  statusMsg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                  statusMsg.type === 'error' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' :
                  'bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse'
                }`}>
                  <Sparkles size={16} className="shrink-0" />
                  <span>{statusMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusMsg.type === 'loading'}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Play size={14} className="fill-current" />
                  <span>Dispatch Call Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard Iframe */}
      <div className="flex-1 relative bg-[#0a0a0a]">
        <div className="absolute inset-0 flex items-center justify-center z-0">
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <div className="w-12 h-12 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Connecting to Dograh Voice Engine securely at voice.aethelsolutions.in...</p>
          </div>
        </div>
        
        <iframe 
          id="voice-engine-iframe"
          src={voiceUrl}
          className="absolute inset-0 w-full h-full border-none z-10"
          title="AI Telecaller Control Room"
          allow="microphone; camera; clipboard-read; clipboard-write; autoplay"
        />
      </div>
    </div>
  );
}
