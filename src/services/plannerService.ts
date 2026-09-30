import { initialTasks } from '../data/mockData';
import type { StudyTask } from '../types';

const STORAGE_KEY = 'campusai.tasks.v1';
const pause = (ms = 120) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function readTasks(): StudyTask[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return initialTasks.map((task) => ({ ...task }));
    const decoded: unknown = JSON.parse(value);
    return Array.isArray(decoded) ? decoded as StudyTask[] : initialTasks.map((task) => ({ ...task }));
  } catch {
    return initialTasks.map((task) => ({ ...task }));
  }
}
function save(tasks: StudyTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export const plannerService = {
  async list(): Promise<StudyTask[]> { await pause(); return readTasks(); },
  async add(input: Omit<StudyTask, 'id' | 'completed'>): Promise<StudyTask[]> {
    await pause();
    const tasks = readTasks();
    tasks.push({ ...input, id: `task-${Date.now()}`, completed: false });
    save(tasks);
    return tasks;
  },
  async update(id: string, patch: Partial<Omit<StudyTask, 'id'>>): Promise<StudyTask[]> {
    await pause();
    const tasks = readTasks().map((task) => task.id === id ? { ...task, ...patch } : task);
    save(tasks);
    return tasks;
  },
  async remove(id: string): Promise<StudyTask[]> {
    await pause();
    const tasks = readTasks().filter((task) => task.id !== id);
    save(tasks);
    return tasks;
  },
};
