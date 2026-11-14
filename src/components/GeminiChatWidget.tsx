import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, Copy, Check, Minimize2, Maximize2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const GeminiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Hello! I am your JMC Classroom AI Assistant. Ask me anything about your curriculum—Maths, Science, English, ICT, History, or lesson planning.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('open-gemini-chat', handleOpen);
    return () => window.removeEventListener('open-gemini-chat', handleOpen);
  }, []);

  const quickPrompts = [
    "Explain Ohm's law with an example",
    'How to solve quadratic equations step-by-step',
    'Tips for O/L English formal letter writing',
    'Explain photosynthesis and cellular respiration',
    'Draft a 45-minute lesson plan outline',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/study-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          subject: 'Curriculum & Education',
          grade: 'Grade 6-11',
        }),
      });

      const data = await res.json();
      const aiText = data.text || data.error || 'Sorry, I could not generate a response at this moment.';

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: 'Network error connecting to Gemini AI assistant. Please check your connection.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Expanded Chat Drawer */}
      {isOpen && (
        <div
          className={`mb-3 w-[92vw] sm:w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col transition-all overflow-hidden ${
            isMinimized ? 'h-14' : 'h-[520px] max-h-[80vh]'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 border-b border-blue-700/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-['Plus_Jakarta_Sans']">
                  Gemini AI Tutor
                  <span className="text-[10px] font-medium text-blue-100">· Study Help</span>
                </div>
                <div className="text-[10px] text-blue-100">JMC Classroom Quick Assistant</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/15"
                title={isMinimized ? 'Maximize' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/15"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Body */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50">
                {messages.length <= 1 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Quick Questions
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {quickPrompts.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSend(q)}
                          className="text-left text-[11px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender === 'ai' && (
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-sm shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm shadow-2xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                      <div
                        className={`text-[9px] mt-1 text-right ${
                          m.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                        }`}
                      >
                        {m.timestamp}
                      </div>

                      {m.sender === 'ai' && (
                        <button
                          onClick={() => copyText(m.id, m.text)}
                          title="Copy answer"
                          className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 transition-opacity"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {m.sender === 'user' && (
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2.5 items-center">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-2 text-xs text-indigo-700 flex items-center gap-1.5 border border-slate-200">
                      <span>Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <div className="p-2.5 border-t border-slate-200 bg-white">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask any study question…"
                    disabled={loading}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors shadow-sm shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/25 hover:scale-[1.02] active:scale-95 transition-all border border-blue-500 font-['Plus_Jakarta_Sans']"
        >
          <Sparkles className="w-4 h-4 text-blue-100" />
          <span>AI Study Tutor</span>
        </button>
      )}
    </div>
  );
};
