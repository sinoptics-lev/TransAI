/**
 * TransAI API Client
 * Communicates with PHP backend for database operations.
 * Falls back to local-only mode if PHP API is unavailable.
 */

// API base path — resolved relative to current page URL
const API_BASE = './api';

let _apiAvailable: boolean | null = null;

/** Check if PHP API is available. Uses ping.php (simple health check). */
export async function isApiAvailable(): Promise<boolean> {
  if (_apiAvailable !== null) return _apiAvailable;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const response = await fetch(`${API_BASE}/ping.php`, {
      method: 'GET',
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      _apiAvailable = false;
      return false;
    }
    
    const text = await response.text();
    // Check if response is JSON (not HTML/PHP source)
    if (text.trim().startsWith('<?php') || text.trim().startsWith('<')) {
      _apiAvailable = false;
      return false;
    }
    
    try {
      const data = JSON.parse(text);
      _apiAvailable = data.ok === true;
    } catch {
      _apiAvailable = false;
    }
    return _apiAvailable;
  } catch {
    _apiAvailable = false;
    return false;
  }
}

export interface ApiProject {
  id: number;
  rmId: number;
  link: string;
  name: string;
  topic: string;
  department: string;
  startDate: string;
  endDate: string;
  effects: string;
  effectType: string;
  effectAmount: number;
  laborRelease: number;
  reductionPlan: number;
  mingos: string;
  costFOT: number;
  costDirect: number;
  costInfra: number;
  costTotal: number;
  economicEffect: number;
  delta: number;
  nonMaterialEffect: string;
  rmStatus: string;
  dbStatus: string;
  dbLeader: string;
  dbResponsible: string;
  laborClaimed: number;
  reductionActual: number;
  releaseOther: number;
  reductionDate: string;
  aiVerdict: string;
  aiReasoning: string;
  createdAt: string;
}

export interface SingleValidationResult {
  ok: boolean;
  valid: boolean;
  headers: string[];
  missing: string[];
  message: string;
  type?: string;
  error?: string;
}

export interface UploadResult {
  ok: boolean;
  batchId: number;
  inserted: number;
  previousDeleted: number;
  message: string;
  error?: string;
}

export type AIData = Record<string, string>;
export type AIAnalysisMap = Record<number, AIData>;

export interface ProjectsResult {
  ok: boolean;
  projects: ApiProject[];
  aiData: AIAnalysisMap;
  count: number;
  latestBatch: {
    id: number;
    uploadedAt: string;
    rmFilename: string;
    dbFilename: string;
    aiFilename: string;
    totalRecords: number;
  } | null;
  error?: string;
}

/**
 * Parse JSON response safely.
 */
async function safeJsonParse(response: Response): Promise<unknown | null> {
  try {
    const text = await response.text();
    if (text.trim().startsWith('<?php') || text.trim().startsWith('<')) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Validate a single XLSX file (RM or DB).
 * If PHP API is unavailable, returns valid=true as fallback.
 */
export async function validateSingleFile(file: File, type: 'rm' | 'db' | 'ai'): Promise<SingleValidationResult> {
  if (type === 'ai') {
    return { ok: true, valid: true, headers: [], missing: [], message: '✓ Загружен' };
  }

  const available = await isApiAvailable();
  if (!available) {
    return {
      ok: true,
      valid: true,
      headers: [],
      missing: [],
      message: 'PHP недоступен. Валидация пропущена.',
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const url = `${API_BASE}/validate_single.php`;

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    const data = await safeJsonParse(response);

    if (data === null) {
      return {
        ok: true,
        valid: true,
        headers: [],
        missing: [],
        message: 'Сервер не поддерживает валидацию. Пропущено.',
      };
    }

    const d = data as Record<string, unknown>;
    if (d.ok !== true) {
      return {
        ok: false,
        valid: false,
        headers: (d.headers as string[]) || [],
        missing: (d.missing as string[]) || [],
        message: (d.error as string) || (d.message as string) || 'Validation failed',
        error: d.error as string | undefined,
      };
    }

    return {
      ok: true,
      valid: (d.valid as boolean) || false,
      headers: (d.headers as string[]) || [],
      missing: (d.missing as string[]) || [],
      message: (d.message as string) || 'OK',
      type: d.type as string | undefined,
    };
  } catch {
    return {
      ok: true,
      valid: true,
      headers: [],
      missing: [],
      message: 'Ошибка сети. Валидация пропущена.',
    };
  }
}

/**
 * Upload parsed projects to the database.
 */
export async function uploadProjects(
  projects: unknown[],
  meta: { rmFilename?: string; dbFilename?: string; aiFilename?: string; notes?: string },
  aiData?: AIAnalysisMap
): Promise<UploadResult> {
  const available = await isApiAvailable();
  if (!available) {
    return {
      ok: false,
      batchId: 0,
      inserted: 0,
      previousDeleted: 0,
      message: 'PHP API недоступен. Сохранение в БД невозможно.',
      error: 'API недоступно',
    };
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 30000);
    const payload: Record<string, unknown> = { projects, meta };
    if (aiData && Object.keys(aiData).length > 0) {
      payload.aiData = aiData;
    }

    const response = await fetch(`${API_BASE}/upload.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    const data = await safeJsonParse(response);
    if (data === null) {
      return {
        ok: false,
        batchId: 0,
        inserted: 0,
        previousDeleted: 0,
        message: 'Сервер не поддерживает PHP.',
        error: 'PHP not available',
      };
    }

    const d = data as Record<string, unknown>;
    if (d.ok !== true) {
      return {
        ok: false,
        batchId: 0,
        inserted: 0,
        previousDeleted: 0,
        message: (d.error as string) || 'Upload failed',
        error: d.error as string | undefined,
      };
    }

    return {
      ok: true,
      batchId: Number(d.batchId) || 0,
      inserted: Number(d.inserted) || 0,
      previousDeleted: Number(d.previousDeleted) || 0,
      message: (d.message as string) || 'Uploaded',
    };
  } catch (err) {
    return {
      ok: false,
      batchId: 0,
      inserted: 0,
      previousDeleted: 0,
      message: 'Ошибка: ' + (err instanceof Error ? err.message : String(err)),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetch active projects from the database.
 */
export async function fetchProjects(): Promise<ProjectsResult> {
  const available = await isApiAvailable();
  if (!available) {
    return {
      ok: true,
      projects: [],
      aiData: {} as AIAnalysisMap,
      count: 0,
      latestBatch: null,
    };
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10000);
    const response = await fetch(`${API_BASE}/projects.php`, {
      method: 'GET',
      signal: ctrl.signal,
    });
    clearTimeout(timeout);

    const data = await safeJsonParse(response);
    if (data === null) {
      return {
        ok: true,
        projects: [],
        aiData: {} as AIAnalysisMap,
        count: 0,
        latestBatch: null,
      };
    }

    const d = data as Record<string, unknown>;
    if (d.ok !== true) {
      return {
        ok: false,
        projects: [],
        count: 0,
        latestBatch: null,
        error: (d.error as string) || 'Failed to fetch',
      };
    }

    return {
      ok: true,
      projects: (d.projects as ApiProject[]) || [],
      aiData: (d.aiData as AIAnalysisMap) || {},
      count: Number(d.count) || 0,
      latestBatch: d.latestBatch as ProjectsResult['latestBatch'],
    };
  } catch {
    return {
      ok: true,
      projects: [],
      aiData: {},
      count: 0,
      latestBatch: null,
    };
  }
}

/**
 * Convert API project to frontend Project format.
 * Optionally merges AI analysis data keyed by rmId.
 */
export function apiProjectToFrontend(
  apiProject: ApiProject & { aiAnalysis?: Record<string, string> }
): import('@/types/project').Project {
  return {
    id: apiProject.id,
    link: apiProject.link,
    name: apiProject.name,
    topic: apiProject.topic,
    department: apiProject.department,
    startDate: apiProject.startDate,
    endDate: apiProject.endDate,
    effects: apiProject.effects,
    effectType: apiProject.effectType,
    effectAmount: Number(apiProject.effectAmount) || 0,
    laborRelease: Number(apiProject.laborRelease) || 0,
    reductionPlan: Number(apiProject.reductionPlan) || 0,
    mingos: apiProject.mingos,
    costFOT: Number(apiProject.costFOT) || 0,
    costDirect: Number(apiProject.costDirect) || 0,
    costInfra: Number(apiProject.costInfra) || 0,
    costTotal: Number(apiProject.costTotal) || 0,
    economicEffect: Number(apiProject.economicEffect) || 0,
    delta: Number(apiProject.delta) || 0,
    nonMaterialEffect: apiProject.nonMaterialEffect || '',
    rmStatus: apiProject.rmStatus,
    dbStatus: apiProject.dbStatus,
    dbLeader: apiProject.dbLeader,
    dbResponsible: apiProject.dbResponsible,
    laborClaimed: Number(apiProject.laborClaimed) || 0,
    reductionActual: Number(apiProject.reductionActual) || 0,
    releaseOther: Number(apiProject.releaseOther) || 0,
    reductionDate: apiProject.reductionDate,
    createdDate: (apiProject as Record<string, unknown>).createdDate as string || '',
    updatedDate: (apiProject as Record<string, unknown>).updatedDate as string || '',
    aiVerdict: apiProject.aiVerdict || 'Нет данных',
    aiReasoning: apiProject.aiReasoning || '',
    aiAnalysis: apiProject.aiAnalysis,
  };
}
