import React, { useState } from 'react';
import { Task, UserProfile, TaskPriority, TaskStage } from '../types';
import { Plus, CheckCircle, Clock, AlertTriangle, User, Search, Filter, Trash2, Calendar, ClipboardList, CheckSquare } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface TaskBoardProps {
  tasks: Task[];
  profiles: UserProfile[];
  currentUser: UserProfile;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'createdBy'>) => void;
  onUpdateTaskStage: (taskId: string, stage: TaskStage) => void;
  onUpdateTaskPriority: (taskId: string, priority: TaskPriority) => void;
  onDeleteTask: (taskId: string) => void;
  theme: 'Whitish Modern' | 'Black Modern';
}

export default function TaskBoard({
  tasks,
  profiles,
  currentUser,
  onAddTask,
  onUpdateTaskStage,
  onUpdateTaskPriority,
  onDeleteTask,
  theme,
}: TaskBoardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assigneeId, setAssigneeId] = useState<string>('Personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');

  const isDark = theme === 'Black Modern';

  // Check if current user has delegation permissions
  const canAssign = currentUser.permissions.canAssignTasks || currentUser.role === 'Founder / Director';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      stage: 'To-Do',
      assigneeId: assigneeId,
    });

    setTitle('');
    setDescription('');
    setPriority('Medium');
    setAssigneeId('Personal');
    setShowAddModal(false);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter;
    const matchesStage = stageFilter === 'All' || task.stage === stageFilter;

    // Employees can only see their own assigned tasks or tasks made manifest to everyone, plus public ones.
    // For convenience we let everyone view the central tasks list but highlight/filter based on scope!
    return matchesSearch && matchesPriority && matchesStage;
  });

  // Calculate task counts for charts
  const statusCounts = {
    'To-Do': tasks.filter((t) => t.stage === 'To-Do').length,
    'In-Progress': tasks.filter((t) => t.stage === 'In-Progress').length,
    'Review': tasks.filter((t) => t.stage === 'Review').length,
    'Completed': tasks.filter((t) => t.stage === 'Completed').length,
  };

  const statusData = Object.keys(statusCounts).map((key) => ({
    name: key,
    value: statusCounts[key as keyof typeof statusCounts],
  })).filter((item) => item.value > 0);

  // COLORS for status chart
  const COLORS = {
    'To-Do': '#94a3b8',       // slate-400
    'In-Progress': '#38bdf8',  // sky-400
    'Review': '#fbbf24',      // amber-400
    'Completed': '#34d399',   // emerald-400
  };

  // Recharts task priority breakdown
  const priorityCounts = {
    High: tasks.filter((t) => t.priority === 'High').length,
    Medium: tasks.filter((t) => t.priority === 'Medium').length,
    Low: tasks.filter((t) => t.priority === 'Low').length,
  };

  const priorityData = [
    { name: 'High Priority', count: priorityCounts.High, fill: '#ef4444' },
    { name: 'Medium Priority', count: priorityCounts.Medium, fill: '#f59e0b' },
    { name: 'Low Priority', count: priorityCounts.Low, fill: '#10b981' },
  ];

  const getAssigneeName = (id: string) => {
    if (id === 'Personal') return 'Personal To-Do';
    const profile = profiles.find((p) => p.id === id);
    return profile ? profile.name : 'Unknown Assignee';
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'High':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/30"><AlertTriangle className="w-3 h-3" />High</span>;
      case 'Medium':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30"><Clock className="w-3 h-3" />Medium</span>;
      case 'Low':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"><CheckCircle className="w-3 h-3" />Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Stats */}
        <div id="stat_card" className={`p-6 rounded-2xl border transition-all ${
          isDark 
            ? 'bg-[#1e293b] border-slate-800 shadow-xl' 
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            Workspace Metrics
          </h3>
          <div className="space-y-3.5">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Total Deliverables</span>
              <span className={`text-xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tasks.length}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Completed Nodes</span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{tasks.filter(t => t.stage === 'Completed').length}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>In Active Review</span>
              <span className="text-xl font-extrabold text-amber-550 dark:text-amber-400">{tasks.filter(t => t.stage === 'Review').length}</span>
            </div>
            <div className="flex justify-between items-center pt-0.5">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>Completion Efficiency</span>
              <span className={`text-xl font-extrabold ${isDark ? 'text-sky-400' : 'text-blue-650'}`}>
                {tasks.length > 0 ? Math.round((tasks.filter(t => t.stage === 'Completed').length / tasks.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Status Distribution Chart (Recharts) */}
        <div id="status_chart_card" className={`p-6 rounded-2xl border transition-all ${
          isDark 
            ? 'bg-[#1e293b] border-slate-800 shadow-xl' 
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 font-mono ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            Stage Allocation
          </h3>
          <div className="h-40 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      color: isDark ? '#ffffff' : '#1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">No Active State data</span>
            )}
          </div>
          <div className="flex gap-2 justify-center flex-wrap text-[10px] font-semibold mt-1">
            {Object.keys(statusCounts).map((key) => (
              <span key={key} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/30 px-2 py-0.5 rounded-md">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[key as keyof typeof COLORS] }} />
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{key} ({statusCounts[key as keyof typeof statusCounts]})</span>
              </span>
            ))}
          </div>
        </div>

        {/* Priority Breakdown (Recharts BarChart) */}
        <div id="priority_chart_card" className={`p-6 rounded-2xl border transition-all ${
          isDark 
            ? 'bg-[#1e293b] border-slate-800 shadow-xl' 
            : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 font-mono ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            Severity Distribution
          </h3>
          <div className="h-44">
            {tasks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" stroke={isDark ? '#475569' : '#94a3b8'} fontSize={9} tickLine={false} />
                  <YAxis stroke={isDark ? '#475569' : '#94a3b8'} fontSize={9} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1e293b' : '#ffffff', 
                      borderColor: isDark ? '#334155' : '#cbd5e1',
                      color: isDark ? '#ffffff' : '#1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">No Priority Data</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-sm rounded-xl border focus:outline-none focus:ring-1 ${
                isDark 
                ? 'bg-[#181818] border-neutral-800 text-white focus:border-neutral-700 focus:ring-neutral-700' 
                : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300 focus:ring-neutral-300'
              }`}
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`text-xs px-2 py-1.5 rounded-xl border focus:outline-none ${
              isDark ? 'bg-[#181818] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
            }`}
          >
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={`text-xs px-2 py-1.5 rounded-xl border focus:outline-none ${
              isDark ? 'bg-[#181818] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
            }`}
          >
            <option value="All">All Stages</option>
            <option value="To-Do">To-Do</option>
            <option value="In-Progress">In-Progress</option>
            <option value="Review">In Review</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Add Task Trigger */}
        <button
          onClick={() => setShowAddModal(true)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition-all cursor-pointer ${
            isDark 
              ? 'bg-white text-black hover:bg-neutral-100' 
              : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-md'
          }`}
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Task List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {(['To-Do', 'In-Progress', 'Review', 'Completed'] as TaskStage[]).map((colStage) => {
          const stageTasks = filteredTasks.filter((t) => t.stage === colStage);

          return (
            <div 
              key={colStage} 
              className={`p-5 rounded-2xl border min-h-[300px] flex flex-col ${
                isDark ? 'bg-[#1e293b] border-slate-800' : 'bg-slate-100/40 border-slate-200/50'
              }`}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/40 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[colStage] }} />
                  <h4 className={`text-xs font-bold uppercase tracking-wider font-sans ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {colStage === 'Review' ? 'In Review' : colStage}
                  </h4>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}>
                  {stageTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                {stageTasks.length > 0 ? (
                  stageTasks.map((task) => (
                    <div
                       key={task.id}
                       className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:translate-y-[-2px] ${
                        isDark 
                          ? 'bg-[#0f172a] border-slate-800 text-slate-300 hover:border-slate-700 hover:shadow-xl' 
                          : 'bg-white border-slate-150 text-slate-800 hover:border-slate-250 hover:shadow-xs shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          {getPriorityBadge(task.priority)}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete the task "${task.title}"?`)) {
                                onDeleteTask(task.id);
                              }
                            }}
                            className={`p-1 rounded-md opacity-0 hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500 ${
                              isDark ? 'text-neutral-600' : 'text-neutral-400'
                            }`}
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <h5 className={`text-sm font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-neutral-900'}`}>{task.title}</h5>
                        <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{task.description}</p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mb-2">
                          <span className="flex items-center gap-1 truncate max-w-[100px]"><User className="w-2.5 h-2.5" />{getAssigneeName(task.assigneeId)}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{task.createdAt.split('T')[0]}</span>
                        </div>

                        {/* Move Actions */}
                        <div className="flex gap-1 justify-end">
                          {colStage !== 'To-Do' && (
                            <button
                              onClick={() => {
                                const stages: TaskStage[] = ['To-Do', 'In-Progress', 'Review', 'Completed'];
                                const prevIdx = stages.indexOf(colStage) - 1;
                                onUpdateTaskStage(task.id, stages[prevIdx]);
                              }}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                                isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                              }`}
                            >
                              ← Back
                            </button>
                          )}
                          {colStage !== 'Completed' && (
                            <button
                              onClick={() => {
                                const stages: TaskStage[] = ['To-Do', 'In-Progress', 'Review', 'Completed'];
                                const nextIdx = stages.indexOf(colStage) + 1;
                                onUpdateTaskStage(task.id, stages[nextIdx]);
                              }}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                                isDark ? 'bg-neutral-700 hover:bg-neutral-600 text-white' : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                              }`}
                            >
                              Next →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <ClipboardList className={`w-8 h-8 mb-2 opacity-30 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Empty Stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div id="modal_overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md p-6 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-sky-500" />Create Workspace Task</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 opacity-70">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="Review monthly budget details..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-2.5 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#202020] border-neutral-800 text-white focus:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 opacity-70">Description</label>
                <textarea
                  rows={3}
                  placeholder="Add details regarding milestones and expectations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full p-2.5 text-sm rounded-xl border focus:outline-none ${
                    isDark ? 'bg-[#202020] border-neutral-800 text-white focus:border-neutral-700' : 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-70">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className={`w-full p-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-[#202020] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                    }`}
                  >
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 opacity-70">Assignee</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className={`w-full p-2 text-sm rounded-xl border focus:outline-none ${
                      isDark ? 'bg-[#202020] border-neutral-800 text-neutral-300' : 'bg-white border-neutral-200 text-neutral-700'
                    }`}
                    disabled={!canAssign}
                  >
                    <option value="Personal">Personal To-Do</option>
                    {profiles
                      .filter((p) => p.status !== 'Annihilated')
                      .map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name} ({profile.role})
                        </option>
                      ))}
                  </select>
                  {!canAssign && (
                    <span className="text-[9px] text-amber-500 font-mono mt-1 block">Requires authorization to delegate.</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isDark ? 'bg-[#222] hover:bg-[#333] text-neutral-400' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    isDark ? 'bg-white text-black hover:bg-neutral-100' : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  }`}
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
