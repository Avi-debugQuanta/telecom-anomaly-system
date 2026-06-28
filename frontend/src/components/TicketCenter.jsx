import React, { useState, useEffect } from "react";
import axios from "axios";
import { marked } from "marked";

export default function TicketCenter() {
  const [phone, setPhone] = useState("");
  const [issue, setIssue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchTickets = async () => {
    try {
      const resp = await axios.get("/api/tickets");
      setTickets(resp.data);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const generateTicket = async () => {
    if (!phone.trim() || !issue.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const resp = await axios.post(`/api/ticket/${phone.trim()}`, { message: issue.trim() });
      await fetchTickets(); // Refresh list after saving
      
      // Auto-select the newly generated ticket if it's in the list
      // Since it's sorted by created_at DESC, it should be the first one.
      setPhone("");
      setIssue("");
    } catch (err) {
      setError("Failed to generate ticket: " + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating(false);
    }
  };

  const downloadTicket = (ticketMd, customerId) => {
    if (!ticketMd) return;
    const blob = new Blob([ticketMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket_${customerId.replace(/\\s/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Input Section (Left Column) */}
      <div className="glass-panel p-6 lg:p-8 space-y-6 h-fit lg:col-span-1">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Create Ticket</h2>
          <p className="text-gray-400 text-sm">Generate an AI-assisted resolution ticket.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 animate-in fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Customer ID
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., C1023"
              className="glass-input h-12 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Issue Summary
            </label>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              rows={4}
              placeholder="Describe the suspected leakage..."
              className="glass-input resize-none w-full"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={generateTicket}
              disabled={generating || !phone.trim() || !issue.trim()}
              className="w-full h-12 flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
            >
              {generating ? "Generating..." : "Generate Ticket"}
            </button>
          </div>
        </div>
      </div>

      {/* Ticket History and Details (Right 2 Columns) */}
      <div className="glass-panel p-6 lg:p-8 flex flex-col h-[700px] lg:col-span-2">
        
        {/* Ticket List (Top Half) */}
        <div className="mb-6 flex-1 max-h-[250px] overflow-y-auto pr-2 border-b border-white/10 pb-6">
          <div className="flex items-center justify-between mb-4 sticky top-0 bg-black/80 backdrop-blur-md p-2 z-10 rounded-md">
            <h2 className="text-lg font-bold text-white">Ticket History</h2>
            <button onClick={fetchTickets} className="text-gray-400 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {loadingTickets ? (
            <p className="text-gray-400 text-sm text-center">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">No tickets raised yet.</p>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 rounded-lg cursor-pointer transition-all border ${
                    selectedTicket?.id === t.id
                      ? "bg-white/10 border-accent shadow-md shadow-accent/10"
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-white">#{t.id} - {t.customer_id}</span>
                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-1">{t.issue}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Ticket Preview (Bottom Half) */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {selectedTicket ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-semibold text-white">Viewing Ticket #{selectedTicket.id}</h3>
                <button
                  onClick={() => downloadTicket(selectedTicket.ticket_md, selectedTicket.customer_id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/10 text-xs font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .md
                </button>
              </div>
              <div className="flex-1 bg-black/40 rounded-xl border border-white/10 p-5 overflow-y-auto shadow-inner">
                <div
                  className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-white prose-a:text-accent prose-strong:text-blue-300 text-sm"
                  dangerouslySetInnerHTML={{ __html: marked.parse(selectedTicket.ticket_md) }}
                ></div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 opacity-50">
              <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Select a ticket from the history to view it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
