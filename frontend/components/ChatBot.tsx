"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Bot, User, AlertCircle } from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "bot";
  content: string;
}

const QUICK_BUTTONS = [
  { label: "Check Bill", message: "When is my next bill due and how much is it?" },
  { label: "My Plan", message: "What is my current internet plan?" },
  { label: "No Internet", message: "I have no internet connection, what should I do?" },
  { label: "Upgrade Plan", message: "I want to upgrade my internet plan. What are my options?" },
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      setError("");
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setLoading(true);

      try {
        const res = await sendChatMessage(trimmed);
        setMessages((prev) => [...prev, { role: "bot", content: res.data.reply }]);
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-slate-800 hover:bg-slate-700 rotate-0"
            : "bg-[#C41230] hover:bg-[#a30f28] animate-bounce-subtle"
        )}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[520px] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4 flex items-center gap-3">
            <div className="bg-[#C41230] rounded-full p-1.5">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AmberIT Assistant</p>
              <p className="text-slate-400 text-xs">Ask about billing, plans, or support</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[280px] max-h-[340px]">
            {messages.length === 0 && !loading && (
              <div className="text-center space-y-4 py-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <Bot size={24} className="text-[#C41230]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">Hi! How can I help?</p>
                  <p className="text-xs text-slate-400 mt-1">Choose a topic or type your question</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_BUTTONS.map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => send(btn.message)}
                      className="px-3 py-1.5 text-xs font-medium rounded-full border border-slate-200 text-slate-600 hover:bg-[#C41230] hover:text-white hover:border-[#C41230] transition-colors"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-slate-500" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-[#C41230] text-white rounded-br-md"
                      : "bg-slate-100 text-slate-700 rounded-bl-md"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-[#C41230]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User size={14} className="text-[#C41230]" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <Bot size={14} className="text-slate-500" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg text-xs text-red-600">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
          </div>

          {/* Quick buttons when conversation started */}
          {messages.length > 0 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => send(btn.message)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-slate-200 text-slate-500 hover:bg-[#C41230] hover:text-white hover:border-[#C41230] transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 px-3 py-3 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={loading}
              className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full outline-none focus:border-[#C41230] focus:ring-1 focus:ring-[#C41230]/20 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#C41230] text-white disabled:opacity-40 hover:bg-[#a30f28] transition-colors shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
