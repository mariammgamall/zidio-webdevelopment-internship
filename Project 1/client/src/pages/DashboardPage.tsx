import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useMeetingStore } from '../store/meetingStore';
import { Video, Plus, ArrowRight, ClipboardCheck, History, X, Sparkles, MessageSquare, Search, Download, Play } from 'lucide-react';
import { API_URL, resolveAssetUrl } from '../lib/api';

const DashboardPage: React.FC = () => {
  const { accessToken, user } = useAuthStore();
  const { setRoomId, setActiveMeetingId } = useMeetingStore();
  const queryClient = useQueryClient();

  const [joinRoomId, setJoinRoomId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);

  // Fetch meetings history
  const [searchQuery, setSearchQuery] = useState('');

  const { data: meetingsData, isLoading } = useQuery({
    queryKey: ['meetings', searchQuery],
    queryFn: async () => {
      const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`${API_URL}/meetings${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      return data.meetings || [];
    },
    enabled: !!accessToken
  });

  // Create meeting mutation
  const createMeetingMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch(`${API_URL}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      return data.meeting;
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setMeetingTitle('');
      setShowCreateModal(false);
      
      // Join room immediately
      setActiveMeetingId(meeting._id);
      setRoomId(meeting.roomId);
    }
  });

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    createMeetingMutation.mutate(meetingTitle || 'Instant Collaborative Session');
  };

  const handleJoinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    let cleanId = joinRoomId.trim().toLowerCase();
    setRoomId(cleanId);
  };

  const handleExportMeeting = async (meetingId: string) => {
    const res = await fetch(`${API_URL}/meetings/${meetingId}/export`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRecordingUrl = (url: string) => resolveAssetUrl(url);

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 text-left select-none relative">
      
      {/* Welcome header block */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-indigo-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Welcome, {user?.name}!</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Schedule a session or launch an instant WebRTC workspace to align with your remote dev team.
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
          >
            <Plus size={16} /> New Meeting
          </button>
          
          <form onSubmit={handleJoinMeeting} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="px-4 py-3 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm w-36 md:w-48"
            />
            <button
              type="submit"
              className="px-4 bg-slate-850 hover:bg-slate-800 text-cyan-400 rounded-xl border border-slate-800 transition"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      {/* Grid: Meeting history and side preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left side: History list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History size={18} className="text-indigo-400" />
              Meeting History & Archive
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 w-40 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <span className="text-xs text-slate-500">{meetingsData?.length || 0} total</span>
            </div>
          </div>

          {isLoading ? (
            <div className="glass p-8 text-center text-sm text-slate-400">Loading history...</div>
          ) : !meetingsData || meetingsData.length === 0 ? (
            <div className="glass p-12 text-center text-sm text-slate-500">
              No meetings found. Create an instant room to get started!
            </div>
          ) : (
            <div className="space-y-3">
              {meetingsData.map((m: any) => (
                <div
                  key={m._id}
                  onClick={() => setSelectedMeeting(m)}
                  className={`glass p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    selectedMeeting?._id === m._id
                      ? 'border-cyan-500/50 bg-slate-900/60 shadow-lg shadow-cyan-500/5'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold text-slate-200">{m.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="font-mono text-cyan-400 uppercase">{m.roomId}</span>
                      <span>•</span>
                      <span>{new Date(m.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>Hosted by {m.host?.name || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {m.status === 'ended' ? (
                      <span className="text-xs px-2.5 py-0.5 bg-slate-800 text-slate-400 rounded-full font-medium">Ended</span>
                    ) : (
                      <span className="text-xs px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium animate-pulse">Scheduled</span>
                    )}
                    <button className="p-1.5 text-slate-500 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side: Selected Meeting Detail Panel */}
        <div className="lg:col-span-4 glass-premium border border-slate-800 rounded-3xl p-6 min-h-[400px] flex flex-col gap-6 sticky top-28">
          {selectedMeeting ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-slate-200 text-lg leading-snug">{selectedMeeting.title}</h3>
                  <span className="text-xs font-mono text-slate-500 uppercase">{selectedMeeting.roomId}</span>
                </div>
                <button
                  onClick={() => setSelectedMeeting(null)}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* AI summary block */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-cyan-400" />
                  AI Intelligence Summary
                </h4>
                <p className="text-xs text-slate-300 bg-slate-900/40 p-3.5 border border-slate-800/80 rounded-xl leading-relaxed">
                  {selectedMeeting.summary || 'Summary unavailable. Make sure to end the meeting properly to trigger summaries.'}
                </p>
              </div>

              {/* Action items checklist */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-indigo-400" />
                  Meeting Action Deliverables
                </h4>
                {selectedMeeting.tasks && selectedMeeting.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMeeting.tasks.map((task: any) => (
                      <div key={task._id} className="flex items-center gap-2 p-2 bg-slate-900/30 rounded-lg border border-slate-900/60 text-xs">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${task.status === 'done' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-slate-300 font-medium truncate flex-1">{task.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-2 bg-slate-900/20 rounded-lg">No action items extracted.</div>
                )}
              </div>

              {/* Transcripts preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-slate-400" />
                  Dialogue Transcripts ({selectedMeeting.transcripts?.length || 0})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-2 bg-slate-900/30 p-3.5 rounded-xl border border-slate-800 text-[10px] leading-relaxed">
                  {selectedMeeting.transcripts && selectedMeeting.transcripts.length > 0 ? (
                    selectedMeeting.transcripts.map((t: any, i: number) => (
                      <div key={i} className="flex flex-col gap-0.5 text-left">
                        <span className="font-semibold text-cyan-400">{t.speakerName}:</span>
                        <span className="text-slate-300">{t.text}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic text-center">No dialogues recorded.</div>
                  )}
                </div>
              </div>

              {selectedMeeting.recordingUrl && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Play size={14} className="text-emerald-400" /> Meeting Recording
                  </h4>
                  <video controls className="w-full rounded-xl border border-slate-800" src={getRecordingUrl(selectedMeeting.recordingUrl)} />
                </div>
              )}

              <button
                onClick={() => handleExportMeeting(selectedMeeting._id)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 text-xs font-semibold rounded-xl transition"
              >
                <Download size={14} /> Export Meeting CSV
              </button>

            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-500 py-12 space-y-2">
              <Sparkles size={28} className="text-slate-700" />
              <p className="text-xs max-w-[200px]">Select a past meeting from the history log to inspect AI insights and action deliverables.</p>
            </div>
          )}
        </div>

      </div>

      {/* New Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-premium border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-xl font-bold mb-4">Start Instant Meeting</h3>
            
            <form onSubmit={handleCreateMeeting} className="space-y-4 text-left">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Meeting Title</label>
                <input
                  type="text"
                  placeholder="E.g. WebRTC Latency Review"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none transition text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={createMeetingMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                <Video size={16} />
                {createMeetingMutation.isPending ? 'Creating...' : 'Create & Join'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;
