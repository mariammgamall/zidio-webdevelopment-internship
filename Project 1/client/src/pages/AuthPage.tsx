import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { getGoogleOAuthUrl } from '../lib/api';
import { ArrowLeft, User, Mail, Lock, KeyRound } from 'lucide-react';

interface AuthPageProps {
  setView: (view: 'landing' | 'auth' | 'dashboard' | 'kanban' | 'analytics' | 'teams' | 'profile') => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ setView }) => {
  const { login, registerUser, error, setError, loading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') {
      await login(email, password);
    } else {
      await registerUser(name, email, password);
    }
  };

  const toggleTab = (tab: 'login' | 'register') => {
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      
      {/* Background glow circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Back to landing link */}
      <button
        onClick={() => setView('landing')}
        className="absolute top-8 left-8 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft size={14} /> Back to Home
      </button>

      {/* Main card */}
      <div className="w-full max-w-md glass-premium rounded-2xl overflow-hidden p-8 border border-slate-800 shadow-2xl z-10">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-gradient">Welcome back</h2>
          <p className="text-xs text-slate-400">Collaborate securely under 200ms latency</p>
        </div>

        {/* Tab triggers */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => toggleTab('login')}
            className={`flex-1 pb-3 text-sm font-semibold transition ${
              activeTab === 'login'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => toggleTab('register')}
            className={`flex-1 pb-3 text-sm font-semibold transition ${
              activeTab === 'register'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            Register
          </button>
        </div>

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {activeTab === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Demo Member"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                placeholder="developer@zidio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] font-bold rounded-xl transition text-sm mt-6 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <KeyRound size={16} />
            {loading ? 'Processing...' : activeTab === 'login' ? 'Sign In' : 'Register User'}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative flex items-center justify-center my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
            <span className="relative px-3 text-[10px] text-slate-500 bg-slate-950">OR</span>
          </div>
          <a
            href={getGoogleOAuthUrl()}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </a>
        </div>

        {activeTab === 'login' && (
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Evaluating IntellMeet? Use the <strong>"Try Live Demo"</strong> button on the landing page for instant access.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthPage;
