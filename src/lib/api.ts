import type {
  Week,
  Task,
  Category,
  RecurringTask,
  Note,
  Attachment,
  BacklogItem,
  FollowUp,
  GenerateWeekPayload,
  WeekGenerationData,
  TaskWithCategory,
} from "@/types";

const API_BASE = "/api";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Weeks API
export const weeksApi = {
  list: () => request<Week[]>("/weeks"),
  get: (id: string) => request<Week>(`/weeks/${id}`),
  create: (data: Partial<Week>) =>
    request<Week>("/weeks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/weeks/${id}`, { method: "DELETE" }),
};

// Tasks API
export const tasksApi = {
  listByWeek: (weekId: string) =>
    request<TaskWithCategory[]>(`/tasks?weekId=${weekId}`),
  get: (id: number) => request<TaskWithCategory>(`/tasks/${id}`),
  create: (data: Partial<Task>) =>
    request<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/tasks/${id}`, { method: "DELETE" }),
  toggleStatus: (id: number) =>
    request<Task>(`/tasks/${id}/toggle`, { method: "POST" }),
  moveToBacklog: (id: number) =>
    request<BacklogItem>(`/tasks/${id}/to-backlog`, { method: "POST" }),
};

// Categories API
export const categoriesApi = {
  list: () => request<Category[]>("/categories"),
  create: (data: Partial<Category>) =>
    request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Category>) =>
    request<Category>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),
};

// Recurring Tasks API
export const recurringTasksApi = {
  list: () => request<RecurringTask[]>("/recurring"),
  get: (id: number) => request<RecurringTask>(`/recurring/${id}`),
  create: (data: Partial<RecurringTask>) =>
    request<RecurringTask>("/recurring", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<RecurringTask>) =>
    request<RecurringTask>(`/recurring/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/recurring/${id}`, { method: "DELETE" }),
  toggle: (id: number) =>
    request<RecurringTask>(`/recurring/${id}/toggle`, { method: "POST" }),
};

// Notes API
export const notesApi = {
  listByTask: (taskId: number) =>
    request<Note[]>(`/notes?taskId=${taskId}`),
  listByBacklogItem: (backlogItemId: number) =>
    request<Note[]>(`/notes?backlogItemId=${backlogItemId}`),
  get: (id: number) => request<Note>(`/notes/${id}`),
  create: (data: Partial<Note>) =>
    request<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Note>) =>
    request<Note>(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/notes/${id}`, { method: "DELETE" }),
};

// Attachments API
export const attachmentsApi = {
  listByNote: (noteId: number) =>
    request<Attachment[]>(`/attachments?noteId=${noteId}`),
  upload: async (noteId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noteId", noteId.toString());

    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error);
    }

    return response.json() as Promise<Attachment>;
  },
  delete: (id: number) =>
    request<void>(`/attachments/${id}`, { method: "DELETE" }),
  getUrl: (blobKey: string) => `${API_BASE}/attachments/blob/${blobKey}`,
};

// Backlog API
export const backlogApi = {
  list: () => request<BacklogItem[]>("/backlog"),
  get: (id: number) => request<BacklogItem>(`/backlog/${id}`),
  create: (data: Partial<BacklogItem>) =>
    request<BacklogItem>("/backlog", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<BacklogItem>) =>
    request<BacklogItem>(`/backlog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/backlog/${id}`, { method: "DELETE" }),
  moveToWeek: (id: number, weekId: string) =>
    request<Task>(`/backlog/${id}/to-week`, {
      method: "POST",
      body: JSON.stringify({ weekId }),
    }),
};

// Follow-ups API
export const followUpsApi = {
  list: () => request<FollowUp[]>("/follow-ups"),
  create: (data: Partial<FollowUp>) =>
    request<FollowUp>("/follow-ups", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/follow-ups/${id}`, { method: "DELETE" }),
};

// Week Generation API
export const generateWeekApi = {
  getData: (previousWeekId: string) =>
    request<WeekGenerationData>(`/generate-week/data?previousWeekId=${previousWeekId}`),
  generate: (payload: GenerateWeekPayload) =>
    request<Week>("/generate-week", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
