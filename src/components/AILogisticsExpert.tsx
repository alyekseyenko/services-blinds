"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Brain, Send, X, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { askExpertAgent, type ExpertAgentOpportunity } from '@/lib/expertAgentAction';
import { COMPANY_LABEL } from '@/lib/branding';
import type { ZoneInsight } from '@/types/admin';
import type { OptimizedRouteStop } from '@/lib/admin/routeOptimization';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  thought?: string;
  isLearning?: boolean;
}

interface AILogisticsExpertProps {
  opportunities: ExpertAgentOpportunity[];
  zoneInsights: ZoneInsight[];
  currentRoute: OptimizedRouteStop[] | null;
}

export default function AILogisticsExpert({ opportunities, zoneInsights, currentRoute }: AILogisticsExpertProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your ${COMPANY_LABEL} logistics expert. Ask about routes, zones, costs, or priorities.`,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMsg,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    }]);

    setIsLoading(true);
    try {
      const response = await askExpertAgent(userMsg, {
        opportunities,
        zoneInsights,
        currentRoute: currentRoute ?? [],
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message || '',
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        thought: response.agentThought || undefined,
        isLearning: response.isLearning || undefined
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not analyze the data. Please try again.',
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-start">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[400px] h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tighter leading-none">AI Logistics Expert</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Live CRM data</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {msg.role === 'user' ? 'Admin' : 'Logistics AI'}
                    </span>
                    <span className="text-[9px] text-slate-300">{msg.timestamp}</span>
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : msg.isLearning 
                        ? 'bg-purple-50 border-2 border-purple-200 text-purple-900 rounded-tl-none'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                  {(msg.thought || msg.isLearning) && (
                    <div className={`mt-1 flex items-center gap-1 text-[8px] font-bold uppercase italic ${msg.isLearning ? 'text-purple-600' : 'text-purple-400'}`}>
                      <Sparkles className="w-2.5 h-2.5" /> 
                      {msg.isLearning ? 'Memory updated' : `Reasoning: ${msg.thought}`}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span className="text-xs font-bold text-slate-400 uppercase animate-pulse">Analyzing live data...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              placeholder="Ask about routes, zones, or costs..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-100 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-purple-500 transition-all outline-none text-slate-700 font-medium"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 bg-slate-900 hover:bg-purple-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95 group relative ${
          isOpen ? 'bg-slate-900 text-white' : 'bg-purple-600 text-white animate-bounce-slow'
        }`}
      >
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"></div>
        {isOpen ? <X className="w-7 h-7" /> : <Brain className="w-7 h-7" />}
        {!isOpen && (
          <div className="absolute left-20 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap">
             <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Talk to Logistics AI</p>
             <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Synced with Twenty CRM</p>
          </div>
        )}
      </button>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
