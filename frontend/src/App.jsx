import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import ChatConsole from "./components/ChatConsole";
import TicketCenter from "./components/TicketCenter";
import LeakageCases from "./components/LeakageCases";
import Navbar from "./components/Navbar";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [initialMessage, setInitialMessage] = useState("");

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "cases" && <LeakageCases setActiveTab={setActiveTab} setInitialMessage={setInitialMessage} />}
        {activeTab === "console" && <ChatConsole initialMessage={initialMessage} setInitialMessage={setInitialMessage} />}
        {activeTab === "tickets" && <TicketCenter />}
      </main>

      <footer className="py-6 text-center text-sm text-gray-500 border-t border-white/5 mt-auto">
        <p>© {new Date().getFullYear()} Telecom AI Lab • Powered by React, Vite & FastAPI</p>
      </footer>
    </div>
  );
}

export default App;
