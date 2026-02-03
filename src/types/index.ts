export type TaskStatus = "pending" | "completed";

export interface Week {
  id: string; // "2026-05" format
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
}

export interface Task {
  id: number;
  weekId: string;
  categoryId: number | null;
  title: string;
  contentMarkdown: string | null;
  contentHtml: string | null;
  status: TaskStatus;
  isRecurring: boolean;
  stalenessCount: number;
  previousVersionId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithCategory extends Task {
  category: Category | null;
}

export interface RecurringTask {
  id: number;
  categoryId: number | null;
  title: string;
  contentMarkdown: string | null;
  contentHtml: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: number;
  taskId: number | null;
  backlogItemId: number | null;
  contentMarkdown: string;
  contentHtml: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: number;
  noteId: number;
  filename: string;
  blobKey: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface BacklogItem {
  id: number;
  categoryId: number | null;
  title: string;
  contentMarkdown: string | null;
  contentHtml: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUp {
  id: number;
  sourceTaskId: number;
  categoryId: number | null;
  title: string;
  contentMarkdown: string | null;
  contentHtml: string | null;
  createdAt: string;
}

// Wizard types
export interface WizardRecurringTask extends RecurringTask {
  selected: boolean;
}

export interface WizardIncompleteTask extends Task {
  selected: boolean;
  category: Category | null;
}

export interface WizardFollowUp extends FollowUp {
  selected: boolean;
  category: Category | null;
}

export interface WizardBacklogItem extends BacklogItem {
  selected: boolean;
  category: Category | null;
}

export interface WeekGenerationData {
  recurringTasks: WizardRecurringTask[];
  incompleteTasks: WizardIncompleteTask[];
  followUps: WizardFollowUp[];
  backlogItems: WizardBacklogItem[];
}

export interface GenerateWeekPayload {
  weekId: string;
  recurringTaskIds: number[];
  incompleteTaskIds: number[];
  followUpIds: number[];
  backlogItemIds: number[];
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Score calculation
export type ScoreLevel = "red" | "yellow" | "green" | "fire";
