import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, CalendarDays, Hourglass, UserCheck, CheckSquare, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AnalyticsPage: React.FC = () => {
  const { accessToken } = useAuthStore();

  // Fetch Analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/analytics`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      return data.metrics;
    },
    enabled: !!accessToken
  });

  // Export CSV Handler
  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/analytics/export`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!response.ok) throw new Error('Network error');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'intellmeet_analytics_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV export failed:', error);
    }
  };

  if (isLoading) {
    return <div className="glass p-12 text-center text-sm text-slate-400 max-w-7xl mx-auto w-full mt-8">Loading analytics reports...</div>;
  }

  const metrics = analyticsData || {
    frequency: { daily: 1, weekly: 3, monthly: 5 },
    avgDuration: 40,
    engagementRate: 90,
    completionRate: 75,
    taskOverview: { total: 4, completed: 3, inProgress: 1, todo: 0 },
    heatmap: []
  };

  // Prepare Pie Chart data for task completion
  const taskChartData = [
    { name: 'Completed', value: metrics.taskOverview.completed, color: '#10b981' },
    { name: 'In Progress', value: metrics.taskOverview.inProgress, color: '#06b6d4' },
    { name: 'To Do', value: metrics.taskOverview.todo, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  // Prepare Heatmap data from API
  const heatmapData = (metrics.heatmap && metrics.heatmap.length > 0)
    ? metrics.heatmap
    : [
        { hour: '08:00', meetings: 0 },
        { hour: '10:00', meetings: 0 },
        { hour: '12:00', meetings: 0 },
        { hour: '14:00', meetings: 0 },
        { hour: '16:00', meetings: 0 },
        { hour: '18:00', meetings: 0 }
      ];

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8 text-left select-none">
      
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Productivity Reports</h2>
          <p className="text-xs text-slate-400">Aggregated statistics mapping team meeting engagements and task deliverables</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-95 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-xl transition shadow-lg"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-5 rounded-2xl flex items-center gap-4 border-indigo-500/5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <CalendarDays size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calls Weekly / Monthly</span>
            <h3 className="text-lg font-bold text-slate-200 mt-0.5">{metrics.frequency.weekly} / {metrics.frequency.monthly}</h3>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl flex items-center gap-4 border-indigo-500/5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Hourglass size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg Call Duration</span>
            <h3 className="text-lg font-bold text-slate-200 mt-0.5">{metrics.avgDuration} min</h3>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl flex items-center gap-4 border-indigo-500/5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <UserCheck size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Speaker Engagement</span>
            <h3 className="text-lg font-bold text-slate-200 mt-0.5">{metrics.engagementRate}%</h3>
          </div>
        </div>

        <div className="glass p-5 rounded-2xl flex items-center gap-4 border-indigo-500/5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <CheckSquare size={22} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tasks Completion Rate</span>
            <h3 className="text-lg font-bold text-slate-200 mt-0.5">{metrics.completionRate}%</h3>
          </div>
        </div>
      </div>

      {/* Recharts section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left side: Task Completion Pie */}
        <div className="lg:col-span-5 glass p-6 rounded-3xl border border-slate-900 flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-300 w-full mb-6 flex items-center gap-1.5">
            <CheckSquare size={16} className="text-emerald-400" /> Action Deliverables Ratio
          </h3>
          
          <div className="w-full h-60 relative flex items-center justify-center">
            {taskChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-600">No board tasks logged</div>
            )}
            
            {/* Center percentage label */}
            {taskChartData.length > 0 && (
              <div className="absolute flex flex-col justify-center items-center">
                <span className="text-3xl font-extrabold text-slate-200">{metrics.completionRate}%</span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Completed</span>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-2 justify-center text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done ({metrics.taskOverview.completed})
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> In Progress ({metrics.taskOverview.inProgress})
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> To Do ({metrics.taskOverview.todo})
            </div>
          </div>
        </div>

        {/* Right side: Frequencies Heatmap */}
        <div className="lg:col-span-7 glass p-6 rounded-3xl border border-slate-900 flex flex-col">
          <h3 className="text-sm font-bold text-slate-300 w-full mb-6 flex items-center gap-1.5">
            <Sparkles size={16} className="text-cyan-400 animate-pulse" /> Meeting Hour Distribution
          </h3>

          <div className="flex-1 w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="meetings" fill="url(#purpleCyanGrad)" radius={[4, 4, 0, 0]}>
                  {/* Linear gradient reference definition */}
                </Bar>
                <defs>
                  <linearGradient id="purpleCyanGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AnalyticsPage;
