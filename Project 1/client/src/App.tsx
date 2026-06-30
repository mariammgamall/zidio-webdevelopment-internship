import React, { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './store/notificationStore';
import { useMeetingStore } from './store/meetingStore';
import { getSocket, connectSocket, disconnectSocket } from './lib/socket';
import { getAvatarUrl } from './utils/url';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import KanbanBoardPage from './pages/KanbanBoardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TeamsPage from './pages/TeamsPage';
import ProfilePage from './pages/ProfilePage';

import { Bell, LogOut, LayoutDashboard, BarChart3, ClipboardList, Users } from 'lucide-react';

const App: React.FC = () => {
  const { user, accessToken, logout } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, addNotification, markAsRead, markAllRead } = useNotificationStore();
  const { roomId, resetMeeting } = useMeetingStore();
  
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'dashboard' | 'kanban' | 'analytics' | 'teams' | 'profile'>('landing');
  const [showNotifications, setShowNotifications] = useState(false);

  // Handle OAuth2 callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');

    if (oauthStatus === 'success' && params.get('token')) {
      const { setAccessToken, setUser, setError } = useAuthStore.getState();
      setError(null);
      setAccessToken(params.get('token'));
      setUser({
        id: params.get('id') || '',
        name: decodeURIComponent(params.get('name') || ''),
        email: decodeURIComponent(params.get('email') || ''),
        role: (params.get('role') as 'Admin' | 'Member') || 'Member',
        avatar: decodeURIComponent(params.get('avatar') || '')
      });
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauthStatus === 'failed') {
      const { setError } = useAuthStore.getState();
      setError('Google sign-in failed. Please try again or use email/password.');
      setCurrentView('auth');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Sync route views
  useEffect(() => {
    if (accessToken) {
      if (roomId) {
        // Active meeting override
        return;
      }
      setCurrentView('dashboard');
      connectSocket(user!.id);
      fetchNotifications(accessToken);

      // Listen to real-time notifications on socket
      const socket = getSocket();
      socket.on('notification', (payload: any) => {
        addNotification(payload.notification);
      });

      return () => {
        socket.off('notification');
      };
    } else {
      setCurrentView('landing');
      disconnectSocket();
    }
  }, [accessToken, roomId]);

  const handleLogout = async () => {
    resetMeeting();
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header bar (Visible when logged in or inside inner pages) */}
      {currentView !== 'landing' && (
        <header className="glass border-b border-slate-800 sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => user ? setCurrentView('dashboard') : setCurrentView('landing')}>
            <span className="text-2xl">⚛️</span>
            <h1 className="text-xl font-bold tracking-tight text-gradient">IntellMeet</h1>
            <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded-full font-mono">v2.0</span>
          </div>

          {user && !roomId && (
            <nav className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('kanban')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <ClipboardList size={16} />
                Kanban Board
              </button>
              <button
                onClick={() => setCurrentView('teams')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === 'teams' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users size={16} />
                Teams
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  currentView === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <BarChart3 size={16} />
                Analytics
              </button>
            </nav>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              {/* Notification Center Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition relative"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 glass-premium border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50">
                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                      <span className="font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllRead(accessToken!)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">No new alerts</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition hover:bg-slate-800/50 flex flex-col gap-1 ${
                              !n.read ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-slate-300">{n.message}</span>
                              {!n.read && (
                                <button
                                  onClick={() => markAsRead(accessToken!, n.id)}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-300 shrink-0 font-medium"
                                >
                                  Read
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile avatar */}
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('profile')}>
                <img src={getAvatarUrl(user.avatar, user.name)} alt={user.name} className="w-8 h-8 rounded-full border border-indigo-500/30 object-cover" />
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{user.role}</span>
                </div>
              </div>

              {/* Log Out button */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition"
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCurrentView('auth')}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition"
            >
              Sign In
            </button>
          )}
        </header>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {roomId ? (
          <MeetingRoomPage />
        ) : (
          <>
            {currentView === 'landing' && <LandingPage setView={setCurrentView} />}
            {currentView === 'auth' && <AuthPage setView={setCurrentView} />}
            {currentView === 'dashboard' && <DashboardPage />}
            {currentView === 'kanban' && <KanbanBoardPage />}
            {currentView === 'analytics' && <AnalyticsPage />}
            {currentView === 'teams' && <TeamsPage />}
            {currentView === 'profile' && <ProfilePage />}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
