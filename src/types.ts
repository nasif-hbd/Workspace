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

export interface WorkspaceData {
  organization: OrganizationInfo | null;
  profiles: UserProfile[];
  tasks: Task[];
  messages: ChatMessage[];
  workflows: Workflow[];
  aiTrainingDoc: string;
}

export type UITheme = 'Whitish Modern' | 'Black Modern';
