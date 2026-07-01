import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Plus, X, ListTodo, ClipboardCopy, CheckCircle2, UserPlus, Calendar } from 'lucide-react';
import { getAvatarUrl } from '../utils/url';

const KanbanBoardPage: React.FC = () => {
  const { accessToken, user } = useAuthStore();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskStatus, setTaskStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/teams`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      return data.teams || [];
    },
    enabled: !!accessToken
  });

  // Fetch Board Tasks
  const { data: boardData, isLoading } = useQuery({
    queryKey: ['board', selectedTeamId],
    queryFn: async () => {
      const params = selectedTeamId ? `?teamId=${selectedTeamId}` : '';
      const res = await fetch(`${API_URL}/tasks/board${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      return data.board || { todo: [], in_progress: [], done: [] };
    },
    enabled: !!accessToken
  });

  // Real-time board sync via Socket.io
  useEffect(() => {
    const socket = getSocket();
    socket.emit('join-board-room', selectedTeamId || null);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['board', selectedTeamId] });
    socket.on('board-updated', refresh);
    socket.on('board-task-added', refresh);

    return () => {
      socket.off('board-updated');
      socket.off('board-task-added');
    };
  }, [selectedTeamId, queryClient]);

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
      setTaskTitle('');
      setTaskDesc('');
      setTaskDeadline('');
      setShowCreateModal(false);
    }
  });

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status })
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board'] });
    }
  });

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop target functionality
  };

  const handleDrop = (e: React.DragEvent, targetStatus: 'todo' | 'in_progress' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    
    updateTaskMutation.mutate({ id: taskId, status: targetStatus });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: taskStatus,
      deadline: taskDeadline ? new Date(taskDeadline) : null,
      assignees: [user?.id],
      teamId: selectedTeamId || null
    });
  };

  const renderColumn = (
    title: string,
    statusKey: 'todo' | 'in_progress' | 'done',
    colorClass: string,
    icon: React.ReactNode
  ) => {
    const list = boardData?.[statusKey] || [];

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, statusKey)}
        className="md:flex-1 flex flex-col h-auto md:h-[calc(100vh-220px)] bg-slate-900/30 border border-slate-900 rounded-3xl p-4 space-y-4 overflow-hidden relative"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className={colorClass}>{icon}</span>
            <h3 className="font-bold text-sm text-slate-200 capitalize">{title}</h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-full font-mono font-semibold">
            {list.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {list.map((task: any) => (
            <div
              key={task._id}
              draggable
              onDragStart={(e) => handleDragStart(e, task._id)}
              className="glass p-4 rounded-xl border border-slate-800 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition cursor-grab active:cursor-grabbing text-left space-y-3"
            >
              <h4 className="font-semibold text-xs text-slate-200 leading-snug">{task.title}</h4>
              {task.description && (
                <p className="text-[10px] text-slate-400 font-light line-clamp-2 leading-relaxed">{task.description}</p>
              )}
              
              <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                {task.deadline ? (
                  <span className="text-[9px] text-slate-500 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(task.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                ) : (
                  <span />
                )}
                
                {/* Assignee Avatar */}
                <div className="flex items-center gap-1">
                  {task.assignees && task.assignees[0] ? (
                    <img
                      src={getAvatarUrl(task.assignees[0].avatar)}
                      alt="assigned"
                      className="w-5 h-5 rounded-full border border-indigo-500/25 object-cover"
                      title={task.assignees[0].name}
                    />
                  ) : (
                    <UserPlus size={12} className="text-slate-600" />
                  )}
                </div>
              </div>
            </div>
          ))}

          {list.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-slate-600 italic py-12">
              Drop tasks here
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6 text-left select-none">
      
      {/* Header controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Kanban Board</h2>
          <p className="text-xs text-slate-400">Drag items to coordinate tasks — updates sync in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          {teamsData && teamsData.length > 0 && (
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none">
              <option value="">All Tasks</option>
              {teamsData.map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
          >
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Swimlanes */}
      {isLoading ? (
        <div className="glass p-12 text-center text-sm text-slate-400">Loading Kanban board...</div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {renderColumn('To Do', 'todo', 'text-amber-400', <ListTodo size={16} />)}
          {renderColumn('In Progress', 'in_progress', 'text-cyan-400', <ClipboardCopy size={16} />)}
          {renderColumn('Completed', 'done', 'text-emerald-400', <CheckCircle2 size={16} />)}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-premium border border-slate-800 rounded-2xl w-full max-w-md p-6 relative text-left">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <h3 className="text-lg font-bold mb-4">Add Task Card</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Description</label>
                <textarea
                  placeholder="Details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none text-xs h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Column status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Deadline</label>
                  <input
                    type="date"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl text-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createTaskMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 mt-4"
              >
                Create Task
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default KanbanBoardPage;
