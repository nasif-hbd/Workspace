export type Role = 'Founder / Director' | 'Manager' | 'Employee';

export type UserStatus = 'Active' | 'Annihilated';

export interface CustomPermissions {
  canEditWorkflows: boolean;
  canSendEmails: boolean;
  canAssignTasks: boolean;
  canManageTeam: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  permissions: CustomPermissions;
  avatarUrl?: string;
}

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStage = 'To-Do' | 'In-Progress' | 'Review' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  stage: TaskStage;
  assigneeId: string; // "Personal" or user profile id
  createdBy: string; // Name of creator
  createdAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: Role;
  text: string;
  createdAt: string;
  flaggedByAI?: boolean;
  aiExplanation?: string;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  logs: string[];
}

export interface OrganizationInfo {
  orgName: string;
  teamCapacity: number;
  mergeCode: string;
}

export interface JarvisMemoryEntry {
  id: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
  actions?: JarvisAction[];
}

export type JarvisActionName = 'create_task' | 'update_task_stage' | 'draft_email' | 'flag_alert';

export interface JarvisAction {
  name: JarvisActionName;
  args: Record<string, any>;
  status: 'applied' | 'failed';
  resultSummary: string;
}

export type AlertSeverity = 'Critical' | 'Warning' | 'Info';

export interface JarvisAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  createdAt: string;
  dismissed: boolean;
}

export interface WorkspaceData {
  organization: OrganizationInfo | null;
  profiles: UserProfile[];
  tasks: Task[];
  messages: ChatMessage[];
  workflows: Workflow[];
  aiTrainingDoc: string;
  jarvisMemory: JarvisMemoryEntry[];
  jarvisAlerts: JarvisAlert[];
}

export type UITheme = 'Whitish Modern' | 'Black Modern';
