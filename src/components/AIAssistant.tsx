
import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Message } from '../types';

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Orchestrating AI Physics Engine. How can I assist with your simulation parameters today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const responseText = await geminiService.generateResponse(input);
    const aiMessage: Message = { role: 'assistant', content: responseText, timestamp: new Date() };
    
    setMessages(prev => [...prev, aiMessage]);
    setIsTyping(false);
  };

  return (
    <section id="ai-assistant" className="py-24 px-6 bg-slate900 relative">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-electricTeal font-mono text-xs uppercase tracking-[0.3em] mb-4">24/7 Virtual Assistant</div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight">AI-Powered Engineering Assistant</h2>
          <p className="text-white/60 text-lg">
            Optimize physics parameters and validate engineering hypotheses in real-time.
          </p>
        </div>

        <div className="bg-slate850 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
          <div className="p-4 bg-slate900 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-electricTeal flex items-center justify-center">
                <span className="text-charcoal text-[10px] font-bold">AI</span>
              </div>
              <div>
                <div className="text-xs font-bold text-white uppercase tracking-wider">Agora Engine v3.1</div>
                <div className="text-[10px] text-green-500 uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span> Active Core
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-white/40">LATENCY: 42ms</div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-xl text-sm ${m.role === 'user' ? 'bg-electricTeal text-charcoal font-medium rounded-tr-none' : 'bg-slate900 text-white/90 border border-white/10 rounded-tl-none'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate900 p-4 rounded-xl border border-white/10 flex space-x-1 items-center">
                  <div className="w-1.5 h-1.5 bg-electricTeal rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-electricTeal rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1.5 h-1.5 bg-electricTeal rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-slate900 border-t border-white/10">
            <div className="relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about Reynolds number optimization or CFD mesh refinement..."
                className="w-full bg-slate850 border border-white/10 rounded-lg py-3 px-4 pr-12 focus:outline-none focus:border-electricTeal text-sm placeholder:text-white/20"
              />
              <button 
                onClick={handleSend}
                className="absolute right-2 top-2 p-2 text-electricTeal hover:text-white transition-colors"
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
