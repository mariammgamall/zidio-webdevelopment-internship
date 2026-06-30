import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../lib/api';
import { User, Mail, Shield, Camera, Save, Trash2, X, Eye } from 'lucide-react';
import { getAvatarUrl } from '../utils/url';

const ProfilePage: React.FC = () => {
  const { user, accessToken, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleAvatarDelete = async () => {
    if (!user?.avatar) return;
    if (!confirm('Are you sure you want to delete your profile photo?')) return;
    try {
      const res = await fetch(`${API_URL}/auth/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setMessage('Avatar deleted successfully');
      } else {
        setMessage(data.message || 'Failed to delete avatar');
      }
    } catch {
      setMessage('Failed to delete avatar');
    }
  };

  const avatarUrl = getAvatarUrl(user?.avatar);

  return (
    <div className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">Profile Settings</h2>
        <p className="text-xs text-slate-400">Manage your account details and avatar</p>
      </div>

      <div className="glass-premium border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => setIsModalOpen(true)}>
            <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 overflow-hidden relative">
              <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition duration-200 backdrop-blur-[1px]">
                <Eye size={16} className="text-white" />
              </div>
            </div>
            {/* Small Quick-Upload Camera Indicator */}
            <label className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-500 transition shadow-lg z-10" onClick={(e) => e.stopPropagation()}>
              <Camera size={12} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              {user?.name}
              {user?.avatar && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  title="Remove Profile Photo"
                  className="p-1 text-slate-400 hover:text-rose-500 transition rounded-lg hover:bg-slate-800"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </h3>
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

      {/* Lightbox Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 transition-all duration-300">
          <div className="glass-premium border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1 bg-slate-900 border border-slate-800 rounded-lg"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-4">
              <h3 className="font-bold text-lg text-slate-200">Profile Photo</h3>
              
              <div className="w-64 h-64 mx-auto rounded-2xl overflow-hidden border-2 border-indigo-500/20 shadow-xl">
                <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition">
                  <Camera size={14} />
                  Change
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    handleAvatarUpload(e);
                    setIsModalOpen(false);
                  }} />
                </label>

                {user?.avatar && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAvatarDelete();
                      setIsModalOpen(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl transition"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
