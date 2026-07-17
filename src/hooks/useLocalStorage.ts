import { useState, useEffect, useCallback } from 'react';
import type { Project } from '@/types/project';

const STORAGE_KEY = 'dashboard_projects';
const FILENAME_KEY = 'dashboard_filename';

export function getStoredProjects(): Project[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredFilename(): string | null {
  try {
    return localStorage.getItem(FILENAME_KEY);
  } catch {
    return null;
  }
}

export function storeProjects(projects: Project[], filename: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem(FILENAME_KEY, filename);
  } catch (err) {
    console.warn('Не удалось сохранить данные в localStorage:', err);
  }
}

export function clearStoredProjects(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FILENAME_KEY);
  } catch {
    // ignore
  }
}

export function useLocalStorageProjects() {
  const [storedProjects, setStoredProjects] = useState<Project[] | null>(null);
  const [storedFilename, setStoredFilename] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setStoredProjects(getStoredProjects());
    setStoredFilename(getStoredFilename());
    setChecked(true);
  }, []);

  const save = useCallback((projects: Project[], filename: string) => {
    storeProjects(projects, filename);
    setStoredProjects(projects);
    setStoredFilename(filename);
  }, []);

  const clear = useCallback(() => {
    clearStoredProjects();
    setStoredProjects(null);
    setStoredFilename(null);
  }, []);

  return { storedProjects, storedFilename, checked, save, clear };
}
