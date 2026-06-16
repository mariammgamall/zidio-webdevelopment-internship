import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Users, Plus, X, Mail, UserPlus } from 'lucide-react';
import { getAvatarUrl } from '../utils/url';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TeamsPage: React.FC = () => {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/teams`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      return data.teams || [];
    },
    enabled: !!accessToken
  });

  const createTeamMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: teamName, description: teamDesc })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setTeamName('');
      setTeamDesc('');
      setShowCreate(false);
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ teamId, email }: { teamId: string; email: string }) => {
      const res = await fetch(`${API_URL}/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setInviteEmail('');
    }
  });

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Team Workspaces</h2>
          <p className="text-xs text-slate-400">Create workspaces and invite members for collaborative project management</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl">
          <Plus size={14} /> New Workspace
        </button>
      </div>

      {isLoading ? (
        <div className="glass p-12 text-center text-sm text-slate-400">Loading workspaces...</div>
      ) : !teams?.length ? (
        <div className="glass p-12 text-center text-sm text-slate-500">No team workspaces yet. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team: any) => (
            <div key={team._id} className="glass p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition cursor-pointer" onClick={() => setSelectedTeam(team)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">{team.name}</h3>
                  <span className="text-[10px] text-slate-500">{team.members?.length || 0} members</span>
                </div>
              </div>
              {team.description && <p className="text-xs text-slate-400 line-clamp-2">{team.description}</p>}
            </div>
          ))}
        </div>
      )}

      {selectedTeam && (
        <div className="glass-premium border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{selectedTeam.name}</h3>
            <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400">Members</h4>
            <div className="flex flex-wrap gap-2">
              {selectedTeam.members?.map((m: any) => (
                <span key={m._id} className="text-xs px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-full flex items-center gap-1.5">
                  <img src={getAvatarUrl(m.avatar)} alt="" className="w-4 h-4 rounded-full object-cover" />
                  {m.name} <span className="text-slate-500">({m.role})</span>
                </span>
              ))}
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate({ teamId: selectedTeam._id, email: inviteEmail }); }} className="flex gap-2">
            <div className="relative flex-1">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" placeholder="Invite by email..." value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50" />
            </div>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1">
              <UserPlus size={14} /> Invite
            </button>
          </form>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-premium border border-slate-800 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Create Workspace</h3>
            <form onSubmit={(e) => { e.preventDefault(); createTeamMutation.mutate(); }} className="space-y-4">
              <input type="text" required placeholder="Workspace name" value={teamName} onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none" />
              <textarea placeholder="Description (optional)" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 h-20 resize-none focus:outline-none" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsPage;
