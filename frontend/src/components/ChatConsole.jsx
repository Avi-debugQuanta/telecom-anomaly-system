import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { marked } from "marked";

export default function ChatConsole({ initialMessage, setInitialMessage }) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([
    { role: "assistant", content: "Hello! I am your AI agent. You can ask me about anomalies, SOPs, or request me to generate a ticket based on a customer ID." }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const userMsg = input;
    setInput("");
    setHistory((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const resp = await axios.post("/api/chat", { message: userMsg });
      const data = resp.data;
      // Format assistant message
      let assistantContent = data.answer;
      if (data.sql) assistantContent += `\n\n**Executed SQL:**\n\`\`\`sql\n${data.sql}\n\`\`\``;
      if (data.sop && data.sop.length) {
        assistantContent += "\n\n**Relevant SOPs:**\n" + data.sop.map((s, i) => `${i + 1}. ${s}`).join("\n");
      }
      if (data.ticket_md) {
        assistantContent += `\n\n---\n**Generated Ticket (Markdown):**\n\`\`\`markdown\n${data.ticket_md}\n\`\`\``;
      }
      setHistory((prev) => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (err) {
      setHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.response?.data?.detail || err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMessage) {
      const runInitial = async () => {
        setLoading(true);
        const userMsg = initialMessage;
        setInitialMessage(""); // Clear it so it only runs once
        setHistory((prev) => [...prev, { role: "user", content: userMsg }]);

        try {
          const resp = await axios.post("/api/chat", { message: userMsg });
          const data = resp.data;
          let assistantContent = data.answer;
          if (data.sql) assistantContent += `\n\n**Executed SQL:**\n\`\`\`sql\n${data.sql}\n\`\`\``;
          if (data.sop && data.sop.length) {
            assistantContent += "\n\n**Relevant SOPs:**\n" + data.sop.map((s, i) => `${i + 1}. ${s}`).join("\n");
          }
          if (data.ticket_md) {
            assistantContent += `\n\n---\n**Generated Ticket (Markdown):**\n\`\`\`markdown\n${data.ticket_md}\n\`\`\``;
          }
          setHistory((prev) => [...prev, { role: "assistant", content: assistantContent }]);
        } catch (err) {
          setHistory((prev) => [...prev, { role: "assistant", content: `❌ Error: ${err.response?.data?.detail || err.message}` }]);
        } finally {
          setLoading(false);
        }
      };
      runInitial();
    }
  }, [initialMessage, setInitialMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-h-[800px] glass-panel rounded-xl overflow-hidden shadow-2xl border border-white/10">
      {/* Chat Header */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">AI Telecom Assistant</h2>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth bg-black/20">
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mr-3 flex-shrink-0 mt-1">
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
            )}
            
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 ${
              msg.role === "user"
                ? "bg-gradient-to-br from-accent to-blue-600 text-white shadow-lg shadow-accent/20 rounded-tr-sm"
                : "bg-white/10 backdrop-blur-md border border-white/10 text-gray-100 rounded-tl-sm shadow-md"
            }`}>
              <div
                className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(msg.content),
                }}
              ></div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-in fade-in">
             <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 text-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-1.5">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about anomalies, SOPs, or request a ticket…"
            className="w-full min-h-[56px] max-h-[150px] resize-none glass-input py-3 pl-4 pr-14 text-sm leading-relaxed rounded-xl shadow-inner bg-black/40"
            disabled={loading}
            rows={1}
          ></textarea>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-accent text-white hover:bg-accent/80 transition-all disabled:opacity-50 disabled:hover:bg-accent flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
