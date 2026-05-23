'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  MoreVertical, 
  ChevronDown,
  Sparkles,
  Command,
  ArrowUp,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useChat } from 'ai/react';

const MODELS = [
  { id: 'dograh-tamil', name: 'Dograh (AI Telecaller)', desc: 'Elite AI Automation Agency Telecaller in Tamil/Tanglish with Google Sheets Sync' },
  { id: 'viyana-fast', name: 'Viyana Fast', desc: 'Ultra-fast instant responses (Llama 3.1 8B)' },
  { id: 'viyana-thinker', name: 'Viyana Thinker', desc: 'Deep reasoning & business intelligence (Llama 3.3 70B)' },
];

const ChatWindow = ({ chatId = 'default' }: { chatId?: string }) => {
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const body = React.useMemo(() => ({
    modelId: selectedModel.id,
    language: 'en'
  }), [selectedModel.id]);

  const { messages, input, setInput, handleInputChange, handleSubmit, append, isLoading, error } = useChat({
    id: chatId,
    api: '/api/chat',
    body,
    maxSteps: 5,
    onFinish: async (message) => {
      const text = message.content;
      const jsonMatch = text.match(/\{[\s\S]*"automation"[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          // Robust cleaning: remove anything before the first { and after the last }
          let cleanJson = jsonMatch[0].replace(/```[a-z]*|```/g, '').trim();
          
          // Remove any trailing commas before closing braces
          cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');
          
          const parsed = JSON.parse(cleanJson);
          const { action, data, reason } = parsed.automation;
          
          console.log(`[Client Trigger] Sending to Bridge: ${action}`);
          
          await fetch('/api/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action, 
              data, 
              reason, 
              timestamp: new Date().toISOString(), 
              source: 'Viyana Client Bridge' 
            })
          });
        } catch (e) {
          console.error('[Client Trigger] Failed:', e);
        }
      }
    }
  });

  if (error) {
    console.error('Chat Error:', error);
  }

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!(input || '').trim() || isLoading) return;
    
    // handleSubmit can take an optional event
    handleSubmit(e);
  };

  // Voice Recognition Logic
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser doesn't support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setInput(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input || '']);

  const [isTriggering, setIsTriggering] = useState(false);

  const handleManualTrigger = async () => {
    if (isTriggering) return;
    setIsTriggering(true);

    try {
      const response = await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'manual_test',
          reason: 'User clicked Force Trigger button'
        })
      });

      const result = await response.json();
      
      // Manually add a status message to the chat
      append({
        role: 'assistant',
        content: result.success 
          ? '⚡ Manual trigger successful! The workflow has been started in n8n.' 
          : '❌ Manual trigger failed: ' + result.error
      });

    } catch (error: any) {
      append({
        role: 'assistant',
        content: '❌ Connection error: Could not reach the trigger API.'
      });
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    
    // Force tool calling for automation chips
    const content = suggestion.toLowerCase().includes('spent') 
      ? `Please track this expense: ${suggestion}`
      : suggestion.toLowerCase().includes('lead')
      ? `Please add this lead: ${suggestion}`
      : suggestion.toLowerCase().includes('received')
      ? `Please track this income: ${suggestion}`
      : suggestion;

    append({
      role: 'user',
      content
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#171717] h-screen overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#171717]/80 backdrop-blur-md z-20">
        <div className="relative">
          <button 
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all group"
          >
            <div className="w-5 h-5 rounded bg-blue-600/20 flex items-center justify-center">
              <Sparkles size={12} className="text-blue-500" />
            </div>
            <span className="text-sm font-medium text-white/90">{selectedModel.name}</span>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isModelMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-64 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl p-1 z-30"
              >
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model);
                      setIsModelMenuOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-all group"
                  >
                    <div className="text-sm font-medium text-white mb-0.5">{model.name}</div>
                    <div className="text-[10px] text-gray-500">{model.desc}</div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-500 hover:text-white transition-colors">
            <Command size={18} />
          </button>
          <button className="p-2 text-gray-500 hover:text-white transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Message Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <>
            {/* Welcome Message */}
            <div className="max-w-3xl mx-auto mt-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-3xl font-bold text-white mx-auto mb-6 shadow-2xl shadow-blue-600/20">V</div>
              <h2 className="text-3xl font-bold text-white mb-4">Hello, BlackJokeR.</h2>
              <p className="text-gray-400 text-lg">What can I help you automate today?</p>
            </div>

            {/* Suggestion Chips */}
            <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3 mt-10">
              {[
                'வணக்கம் டோக்ரா, எங்கள் பிசினஸுக்கு வாட்ஸ்அப் போட் மற்றும் AI ஆட்டோமேஷன் தேவை',
                'Explore AI voice agents & WhatsApp lead closer bots in Tanglish',
                'Sync business leads and automation requirements to Google Sheets',
                'Build a Medical Receptionist Bot'
              ].map((suggestion) => (
                <button 
                  key={suggestion} 
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="p-4 text-left rounded-xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all text-xs text-gray-400"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 pb-20">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">V</div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/5 text-gray-200 border border-white/5'
                }`}>
                  {m.role === 'assistant' 
                    ? m.content.split(/JSON:\s*\{|\{\s*"automation"/)[0].trim() 
                    : m.content}
                  
                  {/* Render Tool Invocations */}
                  {m.toolInvocations?.map((toolInvocation) => {
                    const { toolCallId, toolName, state } = toolInvocation;

                    if (state === 'call') {
                      return (
                        <div key={toolCallId} className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2 text-[10px] text-blue-400">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <span>Triggering {toolName}...</span>
                        </div>
                      );
                    }

                    if (state === 'result') {
                      const { result } = toolInvocation;
                      return (
                        <div key={toolCallId} className={`mt-2 p-2 rounded-lg border text-[10px] flex items-center gap-2 ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                          <div className={`w-2 h-2 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span>{result.message || result.error || 'Workflow execution finished.'}</span>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 justify-start animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex-shrink-0" />
                <div className="h-10 w-20 bg-white/5 rounded-2xl" />
              </div>
            )}
            {error && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">!</div>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-red-500/10 text-red-400 border border-red-500/20">
                  {error.message || 'An error occurred while connecting to local AI.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-8 pt-0">
        <form 
          id="chat-form"
          onSubmit={handleFormSubmit}
          className="max-w-3xl mx-auto relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
          
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-2 shadow-2xl">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input || ''}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFormSubmit();
                }
              }}
              placeholder={`Message ${selectedModel.name}...`}
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-gray-600 py-3 px-4 resize-none overflow-hidden min-h-[52px]"
            />
            
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-gray-300 transition-all">
                  <Paperclip size={18} />
                </button>
                <button 
                  type="button" 
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-all ${isListening ? 'bg-blue-600/20 text-blue-500 animate-pulse' : 'hover:bg-white/5 text-gray-500 hover:text-gray-300'}`}
                >
                  <Mic size={18} />
                </button>
                <button 
                  type="button" 
                  onClick={handleManualTrigger}
                  disabled={isTriggering}
                  className={`p-2 rounded-xl transition-all ${isTriggering ? 'bg-amber-600/20 text-amber-500 animate-spin' : 'hover:bg-amber-600/10 text-gray-500 hover:text-amber-500'}`}
                  title="Force n8n Trigger"
                >
                  <Zap size={18} />
                </button>
              </div>
              
              <button 
                type="submit"
                disabled={!(input || '').trim() || isLoading}
                className={`p-2 rounded-xl transition-all ${
                  (input || '').trim() && !isLoading
                    ? 'bg-white text-black hover:bg-gray-200' 
                    : 'bg-white/5 text-gray-700'
                }`}
              >
                <ArrowUp size={20} />
              </button>
            </div>
          </div>
          
          <div className="mt-2 text-center text-[10px] text-gray-600">
            Viyana 2.0 can make mistakes. Verify important information.
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
