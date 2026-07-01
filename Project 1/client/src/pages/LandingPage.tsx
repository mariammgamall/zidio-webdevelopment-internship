import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Video, Zap, Cpu, BarChart3, BellRing } from 'lucide-react';

interface LandingPageProps {
  setView: (view: 'landing' | 'auth' | 'dashboard' | 'kanban' | 'analytics') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ setView }) => {
  const { tryDemoLogin, loading, error } = useAuthStore();

  const handleDemoClick = async () => {
    const success = await tryDemoLogin();
    if (success) {
      console.log('Logged in with demo credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-6 py-12 relative overflow-hidden select-none">
      
      {/* Background radial glowing circles */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main hero grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-center gap-12 z-10">
        
        {/* Left column: Text */}
        <div className="lg:col-span-7 text-left space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full text-xs font-semibold">
            <Zap size={12} className="animate-bounce" /> March 2026 Release (v2.0)
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight">
            AI-Powered <br />
            <span className="text-gradient">Enterprise Collaboration</span>
          </h1>
          
          <p className="text-lg text-slate-400 font-light max-w-xl leading-relaxed">
            Transform unproductive hybrid meetings into actionable, intelligent events. Automatically transcribe dialogues, extract tasks, and track Kanban boards with less than 200ms latency.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button
              onClick={() => setView('auth')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25"
            >
              Get Started Free
            </button>
            
            <button
              onClick={handleDemoClick}
              disabled={loading}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-cyan-400 hover:text-cyan-300 font-semibold rounded-xl border border-slate-800 hover:border-slate-700 transition"
            >
              {loading ? 'Entering Sandbox...' : 'Try Live Demo'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400 mt-2 font-medium bg-rose-500/10 border border-rose-500/30 px-3 py-2 rounded-lg max-w-xs">
              {error}
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-3 pt-6">
            <span className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono">Build: passing</span>
            <span className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono">License: MIT</span>
            <span className="text-xs px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-400 font-mono">Coverage: 42%</span>
          </div>
        </div>

        {/* Right column: Highlights Cards */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass p-5 rounded-2xl text-left space-y-2 hover:-translate-y-1 transition duration-300 border-indigo-500/10">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
              <Video size={20} />
            </div>
            <h3 className="font-semibold text-sm">Real-Time WebRTC</h3>
            <p className="text-xs text-slate-400">Mesh topology audio/video sharing with sub-200ms connection signaling.</p>
          </div>

          <div className="glass p-5 rounded-2xl text-left space-y-2 hover:-translate-y-1 transition duration-300 border-indigo-500/10">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
              <Cpu size={20} />
            </div>
            <h3 className="font-semibold text-sm">AI Transcriber</h3>
            <p className="text-xs text-slate-400">Automated transcript extraction and task mapping using NLP filters.</p>
          </div>

          <div className="glass p-5 rounded-2xl text-left space-y-2 hover:-translate-y-1 transition duration-300 border-indigo-500/10">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <h3 className="font-semibold text-sm">Rich Analytics</h3>
            <p className="text-xs text-slate-400">Exposes team meeting frequency heatmaps and CSV spreadsheet exports.</p>
          </div>

          <div className="glass p-5 rounded-2xl text-left space-y-2 hover:-translate-y-1 transition duration-300 border-indigo-500/10">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center">
              <BellRing size={20} />
            </div>
            <h3 className="font-semibold text-sm">Socket.io Notifications</h3>
            <p className="text-xs text-slate-400">Instantly relays mention alerts and summary triggers to assigned users.</p>
          </div>
        </div>

      </div>

      <footer className="relative md:absolute mt-8 md:mt-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 text-[10px] text-slate-600 font-mono tracking-wider text-center mx-auto md:mx-0">
        ZIDIO DEVELOPMENT WEB DEVELOPMENT DOMAIN © MARCH 2026
      </footer>

    </div>
  );
};

export default LandingPage;
