import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  userRole: string | null;
  bookings: any[];
  complaints: any[];
}

export default function ChatBot({ userRole, bookings, complaints }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm AquaBot, your AquaLink assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Try server-side proxy route first
      let botResponse = '';
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            history: messages,
            userRole,
            bookings,
            complaints
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.reply) {
            botResponse = data.reply;
          }
        }
      } catch (proxyErr) {
        console.warn('Server chat endpoint unreachable, trying client fallback:', proxyErr);
      }

      // 2. Client fallback with valid model gemini-3.8-flash if server proxy didn't reply
      if (!botResponse) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const chatHistory = messages.slice(1).map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
          }));

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...chatHistory,
              { role: 'user', parts: [{ text: userMessage }] }
            ],
            config: {
              systemInstruction: `You are AquaBot, the official AI assistant for AquaLink - Mira-Bhayandar's Smart Water Management Platform.
PLATFORM INFO:
- Service Area: Mira-Bhayandar (Shanti Nagar, Mira Road East, Bhayandar West, Kashimira).
- Pricing: 1000L (₹500), 2000L (₹900), 5000L (₹2000), 10000L (₹3800).
- NEW: Priority Express Dispatch (+25% surcharge) for delivery within 2 hours.
- Features: Real-time Leaflet GPS fleet tracking, Push Notifications, Dark Mode, Digital Invoices, Support Ticketing.
- Helpline: 1800-123-4567 (Available 24/7).
- Current Role: ${userRole || 'Resident'}
- Recent Bookings: ${JSON.stringify(bookings.slice(0, 3))}
- Recent Complaints: ${JSON.stringify(complaints.slice(0, 3))}
Be professional, empathetic, friendly, and concise in Markdown.`,
              temperature: 0.7,
            }
          });

          if (response.text) {
            botResponse = response.text;
          }
        }
      }

      // 3. Smart contextual fallback if both API calls were unavailable
      if (!botResponse) {
        const lowerMsg = userMessage.toLowerCase();
        if (lowerMsg.includes('track') || lowerMsg.includes('where') || lowerMsg.includes('tanker') || lowerMsg.includes('status')) {
          const active = bookings.filter(b => b.status !== 'Delivered');
          if (active.length > 0) {
            botResponse = `📍 **Active Tanker Tracking**:\n\nYou currently have **${active.length} active delivery**:\n- **Booking ID**: \`${active[0].id}\`\n- **Status**: **${active[0].status}**\n- **Vehicle**: ${active[0].tankerId || 'Being assigned'}\n- **ETA**: ${active[0].eta || '15-20 mins'}\n\nYou can view the live moving tanker on our new **Live Fleet Tracking Leaflet Map** in your dashboard!`;
          } else {
            botResponse = `You don't have any active deliveries right now. You can tap **"Book Tanker Now"** on your dashboard to request one!`;
          }
        } else if (lowerMsg.includes('price') || lowerMsg.includes('rate') || lowerMsg.includes('cost')) {
          botResponse = `💧 **AquaLink Official Water Rates**:\n\n| Capacity | Standard Rate | Express Priority |\n|---|---|---|\n| **1,000 Liters** | ₹500 | ₹625 |\n| **2,000 Liters** | ₹900 | ₹1,125 |\n| **5,000 Liters** | ₹2,000 | ₹2,500 |\n| **10,000 Liters** | ₹3,800 | ₹4,750 |\n\n*Emergency Priority Dispatch guarantees delivery within 2 hours.*`;
        } else if (lowerMsg.includes('complaint') || lowerMsg.includes('issue') || lowerMsg.includes('help') || lowerMsg.includes('support')) {
          botResponse = `Need assistance? You can file a formal complaint under the **Help & Complaints** tab or call our 24/7 Toll-Free Helpline at **1800-123-4567**.`;
        } else if (lowerMsg.includes('book') || lowerMsg.includes('order')) {
          botResponse = `To book a tanker, go to the **Active Bookings** tab, click **"Book Tanker Now"**, choose your volume and delivery time, and tap Confirm!`;
        } else {
          botResponse = `Hello! I'm AquaBot. I can help you track your tankers, check pricing, book deliveries, or file complaints. How can I assist you with your water supply today?`;
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: botResponse }]);
    } catch (error) {
      console.warn("AquaBot Handled Error:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: "I'm currently assisting multiple residents in Mira-Bhayandar. You can reach our 24/7 Helpline at **1800-123-4567** or track active tankers on the **Live Fleet Map**!" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'model', text: "Hello! I'm AquaBot, your AquaLink assistant. How can I help you today?" }]);
  };

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="vibrant-gradient p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm">AquaBot AI</h3>
                  <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Online Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={clearChat}
                  title="Clear Chat"
                  className="hover:bg-white/20 p-2 rounded-xl transition-colors"
                >
                  <HistoryIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 p-2 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {messages.length === 1 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    "Track my tanker",
                    "Check pricing",
                    "File a complaint",
                    "How to book?"
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => { setInput(suggestion); }}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: m.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600'}`}>
                      {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm rounded-tl-none'}`}>
                      <div className="markdown-body prose prose-sm max-w-none dark:prose-invert">
                        <Markdown>{m.text}</Markdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-2 items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AquaBot is typing...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" /> Powered by Gemini 3.5 Flash
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all ${isOpen ? 'bg-slate-900 text-white' : 'vibrant-gradient text-white'}`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
