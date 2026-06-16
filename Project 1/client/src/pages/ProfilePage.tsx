import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { User, Mail, Shield, Camera, Save } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ProfilePage: React.FC = () => {
  const { user, accessToken, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, email })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setMessage('Profile updated successfully');
      }
    } catch {
      setMessage('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await fetch(`${API_URL}/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setMessage('Avatar updated');
      }
    } catch {
      setMessage('Avatar upload failed');
    }
  };

  const avatarUrl = user?.avatar?.startsWith('/') ? `${API_BASE}${user.avatar}` : user?.avatar;

  return (
    <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Profile Settings</h2>
        <p className="text-xs text-slate-400">Manage your account details and avatar</p>
      </div>

      <div className="glass-premium border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.name} className="w-20 h-20 rounded-full border-2 border-indigo-500/30 object-cover" />
            ) : (
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">{user?.name?.charAt(0)}</div>
            )}
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-500 transition">
              <Camera size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <h3 className="font-bold text-lg">{user?.name}</h3>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Shield size={12} /> {user?.role}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1"><User size={12} /> Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1"><Mail size={12} /> Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50" />
          </div>
          {message && <p className="text-xs text-emerald-400">{message}</p>}
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
