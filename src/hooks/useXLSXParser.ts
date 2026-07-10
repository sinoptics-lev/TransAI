import * as XLSX from 'xlsx';
import type { Project, AIAnalysis } from '@/types/project';
import { parseEffects } from '@/lib/parseEffects';

interface ParseResult {
  projects: Project[];
  error: string | null;
  /** Raw header row from RM file for exact re-export */
  rmHeaders?: (string | number)[];
}

export type AIRecordMap = Record<number, AIAnalysis>;

/** Extract verdict from AI analysis values using pattern matching */
function extractVerdictFromAI(analysis: AIAnalysis): string {
  const positivePatterns = [
    'однозначно рекомендуется',
    'рекомендован к внедрению',
    'рекомендуется к внедрению',
    'рекомендуется',
    'рекомендован',
    'целесообразно',
    'эффективен',
    'положительная дельта',
    'окупаемость',
  ];
  const negativePatterns = [
    'не рекомендован к внедрению',
    'не рекомендуется',
    'не рекомендован',
    'нецелесообразно',
    'неэффективен',
    'отрицательная дельта',
    'не окупается',
  ];

  for (const value of Object.values(analysis)) {
    const val = String(value).toLowerCase();
    for (const pattern of negativePatterns) {
      if (val.includes(pattern)) return 'не рекомендован к внедрению';
    }
    for (const pattern of positivePatterns) {
      if (val.includes(pattern)) return 'рекомендован к внедрению';
    }
  }

  return 'Нет данных';
}

interface DBRecord {
  dbNumber: number;
  dbLeader: string;
  laborClaimed: number;
  laborRelease: number;
  reductionPlan: number;
  reductionActual: number;
  dbStatus: string;
  deadline: string;
  totalCost: number;
  department: string;
  dbResponsible: string;
  releaseOther: number;
  reductionDate: string;
}

function safeFloat(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/* ── Find column index by header name (fuzzy match) ── */
function findColIdx(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

/* ── Parse RM file with header-based column detection ── */
function parseRMFile(file: File): Promise<{ records: Project[]; headers: (string | number)[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

        if (rows.length === 0) {
          resolve({ records: [], headers: [] });
          return;
        }

        const headers = rows[0].map(h => (h === undefined || h === null ? '' : String(h).trim()));

        // Detect column indices by header names
        const colIdx = {
          id: findColIdx(headers, '#', '№', 'id'),
          name: findColIdx(headers, 'Проект'),
          tracker: findColIdx(headers, 'Трекер'),
          status: findColIdx(headers, 'Статус'),
          startDate: findColIdx(headers, 'Дата начала'),
          deadline: findColIdx(headers, 'Срок', 'Срок завершения'),
          topic: findColIdx(headers, 'Тема'),
          department: findColIdx(headers, 'ЦИО'),
          effects: findColIdx(headers, 'Эффекты'),
          laborPlan: findColIdx(headers, 'высвобожден', 'трудозатрат'),
          reductionPlan: findColIdx(headers, 'сокращение'),
          fot: findColIdx(headers, 'ФОТ', 'фонд оплаты труда'),
          infra: findColIdx(headers, 'ЦОД', 'инфра'),
          direct: findColIdx(headers, 'Прямые', 'прямые затраты'),
          totalCost: findColIdx(headers, 'Всего затраты', 'всего'),
          mingos: findColIdx(headers, 'Мингос', 'Реализовано Мингос'),
          effectType: findColIdx(headers, 'Тип эффекта'),
          effectAmount: findColIdx(headers, 'Сумма эффекта'),
        };



        const projects: Project[] = [];
        let idx = 1;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;

          const id = colIdx.id >= 0 ? safeFloat(row[colIdx.id]) : i;
          if (id <= 0) continue;

          const name = colIdx.name >= 0 ? safeStr(row[colIdx.name]) : '';
          if (!name) continue;

          const effectsText = colIdx.effects >= 0 ? safeStr(row[colIdx.effects]) : '';
          const mingosRaw = colIdx.mingos >= 0 ? safeStr(row[colIdx.mingos]).toLowerCase() : '';

          // Try read effectType/effectAmount from explicit columns (new format)
          let effectType = colIdx.effectType >= 0 ? safeStr(row[colIdx.effectType]) : '';
          let effectAmount = colIdx.effectAmount >= 0 ? safeFloat(row[colIdx.effectAmount]) : 0;

          // If no explicit columns — auto-parse from effects text
          if (!effectType && effectAmount === 0 && effectsText) {
            const parsed = parseEffects(effectsText);
            if (parsed.type && parsed.amount !== null && parsed.amount > 0) {
              effectType = parsed.type;
              effectAmount = parsed.amount;
            }
          }

          // Keep full raw row for exact re-export
          const raw: (string | number)[] = headers.map((_, c) => {
            const v = row[c];
            if (v === undefined || v === null || v === '') return '';
            if (typeof v === 'number') return v;
            return String(v);
          });

          // Cost values from RM file (in thousands)
          const fotRaw = colIdx.fot >= 0 ? safeFloat(row[colIdx.fot]) : 0;
          const infraRaw = colIdx.infra >= 0 ? safeFloat(row[colIdx.infra]) : 0;
          const directRaw = colIdx.direct >= 0 ? safeFloat(row[colIdx.direct]) : 0;
          const totalRaw = colIdx.totalCost >= 0 ? safeFloat(row[colIdx.totalCost]) : 0;

          // If total is 0 but components exist, compute total
          const costTotal = totalRaw > 0 ? totalRaw : (fotRaw + infraRaw + directRaw);

          projects.push({
            id: idx++,
            link: `https://transformation.rm.mosreg.ru/#/issues/${Math.round(id)}`,
            name,
            topic: colIdx.topic >= 0 ? safeStr(row[colIdx.topic]) : '',
            department: colIdx.department >= 0 ? safeStr(row[colIdx.department]) : '',
            startDate: colIdx.startDate >= 0 ? safeStr(row[colIdx.startDate]) : '',
            endDate: colIdx.deadline >= 0 ? safeStr(row[colIdx.deadline]) : '',
            effects: effectsText,
            effectType,
            effectAmount: Math.round(effectAmount * 10) / 10,
            laborRelease: 0, // filled from DB
            reductionPlan: 0, // filled from DB
            mingos: mingosRaw === 'да' || mingosRaw === 'yes' || mingosRaw === '1' || mingosRaw === 'true' ? 'Да' : 'Нет',
            costFOT: Math.round(fotRaw * 10) / 10,
            costDirect: Math.round(directRaw * 10) / 10,
            costInfra: Math.round(infraRaw * 10) / 10,
            costTotal: Math.round(costTotal * 10) / 10,
            economicEffect: 0, // computed after DB merge
            delta: 0, // computed after DB merge
            nonMaterialEffect: '',
            rmStatus: colIdx.status >= 0 ? safeStr(row[colIdx.status]) : '',
            _raw: raw,
          });
        }

        resolve({ records: projects, headers });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла РМ'));
    reader.readAsArrayBuffer(file);
  });
}

/* ── Parse DB file (Проекты 2026.xlsx) ── */
function parseDBFile(file: File): Promise<Record<number, DBRecord>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

        if (rows.length === 0) { resolve({}); return; }

        // DB file column layout (0-indexed):
        // A=0 Порядковый номер, B=1 Наименование, C=2 Заявлено к высвобождению,
        // D=3 Факт высвобождение трудозатрат, E=4 Физ.сокращение план,
        // F=5 Физ.сокращение факт, G=6 Срок реализации, H=7 Затраты,
        // I=8 Статус, J=9 Ответственный, K=10 Ведомство,
        // L=11 ID задачи, M=12 Руководство, N=13 Дата сокращения, O=14 Иные ЦИО
        const c = {
          number: 0,
          claimed: 2,
          laborRelease: 3,
          reductionPlan: 4,
          reductionActual: 5,
          deadline: 6,
          totalCost: 7,
          status: 8,
          responsible: 9,
          department: 10,
          linkId: 11,
          leader: 12,
          reductionDate: 13,
          releaseOther: 14,
        };

        const result: Record<number, DBRecord> = {};

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;

          const dbId = c.linkId >= 0 ? safeFloat(row[c.linkId]) : 0;
          if (dbId <= 0) continue;

          const idInt = Math.round(dbId);
          result[idInt] = {
            dbNumber: c.number >= 0 ? safeFloat(row[c.number]) : 0,
            dbLeader: c.leader >= 0 ? safeStr(row[c.leader]) : '',
            laborClaimed: c.claimed >= 0 ? safeFloat(row[c.claimed]) : 0,
            laborRelease: c.laborRelease >= 0 ? safeFloat(row[c.laborRelease]) : 0,
            reductionPlan: c.reductionPlan >= 0 ? safeFloat(row[c.reductionPlan]) : 0,
            reductionActual: c.reductionActual >= 0 ? safeFloat(row[c.reductionActual]) : 0,
            dbStatus: c.status >= 0 ? safeStr(row[c.status]) : '',
            deadline: c.deadline >= 0 ? safeStr(row[c.deadline]) : '',
            totalCost: c.totalCost >= 0 ? safeFloat(row[c.totalCost]) : 0,
            department: c.department >= 0 ? safeStr(row[c.department]) : '',
            dbResponsible: c.responsible >= 0 ? safeStr(row[c.responsible]) : '',
            releaseOther: c.releaseOther >= 0 ? safeFloat(row[c.releaseOther]) : 0,
            reductionDate: c.reductionDate >= 0 ? safeStr(row[c.reductionDate]) : '',
          };
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла ДБ'));
    reader.readAsArrayBuffer(file);
  });
}

/* ── Parse AI Analysis file (Аналитика ИИ) ── */
export function parseAIFile(file: File): Promise<AIRecordMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

        if (rows.length === 0) { resolve({}); return; }

        const headers = rows[0].map(h => (h === undefined || h === null ? '' : String(h).trim()));
        const idIdx = findColIdx(headers, 'ID проекта', 'ID', '#', '№');

        // Column names from B onwards (skip ID column)
        const colNames: string[] = [];
        for (let c = 0; c < headers.length; c++) {
          if (c === idIdx) continue;
          colNames[c] = headers[c] || `Колонка ${c + 1}`;
        }

        const result: AIRecordMap = {};

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2) continue;

          const rawId = idIdx >= 0 ? safeFloat(row[idIdx]) : 0;
          if (rawId <= 0) continue;

          const idInt = Math.round(rawId);
          const analysis: AIAnalysis = {};

          for (let c = 0; c < headers.length; c++) {
            if (c === idIdx) continue;
            const colName = colNames[c];
            if (!colName) continue;
            const val = row[c];
            if (val !== undefined && val !== null && val !== '') {
              analysis[colName] = String(val).trim();
            }
          }

          if (Object.keys(analysis).length > 0) {
            result[idInt] = analysis;
          }
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла Аналитика ИИ'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseTwoXLSX(rmFile: File, dbFile: File, aiFile?: File): Promise<ParseResult & { aiData: AIRecordMap }> {
  try {
    const [rmResult, dbData, aiData] = await Promise.all([
      parseRMFile(rmFile),
      parseDBFile(dbFile),
      aiFile ? parseAIFile(aiFile) : Promise.resolve({} as AIRecordMap),
    ]);

    if (rmResult.records.length === 0) {
      return { projects: [], error: 'Файл РМ не содержит данных', aiData: {} };
    }

    // Match RM projects with DB data by original RM ID — only keep projects present in BOTH files
    const dbKeys = new Set(Object.keys(dbData).map(Number));
    const projects = rmResult.records
      .map(rm => {
        const linkMatch = rm.link.match(/\/issues\/(\d+)/);
        const origId = linkMatch ? Number(linkMatch[1]) : 0;
        const hasDb = origId > 0 && dbKeys.has(origId);
        return { rm, origId, hasDb };
      })
      .filter(({ hasDb }) => hasDb)
      .map(({ rm, origId }, idx) => {
        if (idx === 0) console.log('[parse] After DB filter: total=', idx + 1, 'of', rmResult.records.length, 'RM records');
        const db = dbData[origId];
        const laborClaimed = db.laborClaimed;
        const reductionPlan = db.reductionPlan;
        const totalCost = db.totalCost;
        const economicEffect = laborClaimed * 3.4 + rm.effectAmount;
        const delta = economicEffect - (totalCost / 1000);

        // Attach AI analysis if exists for this project ID
        const aiAnalysis = origId > 0 ? aiData[origId] : undefined;

        // Extract verdict and reasoning from AI analysis
        let aiVerdict: string | undefined;
        let aiReasoning: string | undefined;
        if (aiAnalysis && Object.keys(aiAnalysis).length > 0) {
          aiVerdict = extractVerdictFromAI(aiAnalysis);
          if (aiVerdict !== 'Нет данных') {
            aiReasoning = Object.entries(aiAnalysis)
              .map(([colName, colValue]) => `${colName}: ${colValue}`)
              .join('\n');
          }
        }

        return {
          ...rm,
          id: idx + 1,
          laborRelease: Math.round(laborClaimed * 10) / 10,
          reductionPlan: Math.round(reductionPlan * 10) / 10,
          costTotal: Math.round(totalCost * 10) / 10,
          economicEffect: Math.round(economicEffect * 10) / 10,
          delta: Math.round(delta * 10) / 10,
          department: db.department || rm.department,
          endDate: db.deadline || rm.endDate,
          dbStatus: db.dbStatus,
          dbLeader: db.dbLeader,
          dbResponsible: db.dbResponsible,
          laborClaimed: Math.round(laborClaimed * 10) / 10,
          reductionActual: Math.round(db.reductionActual * 10) / 10,
          releaseOther: Math.round(db.releaseOther * 10) / 10,
          reductionDate: db.reductionDate,
          aiAnalysis,
          aiVerdict,
          aiReasoning,
        };
      });

    return { projects, error: null, rmHeaders: rmResult.headers, aiData };
  } catch (err) {
    return {
      projects: [],
      error: `Ошибка обработки: ${err instanceof Error ? err.message : String(err)}`,
      aiData: {},
    };
  }
}

// ════════════════ Export enriched RM data to XLSX ════════════════

/** Global store for the last RM file headers so export can use them */
let lastRMHeaders: (string | number)[] = [];

export function setRMHeaders(headers: (string | number)[]): void {
  lastRMHeaders = headers;
}

export function exportEnrichedRM(projects: Project[], filename: string = 'РМ_с_эффектами.xlsx'): void {
  // Use raw data + 2 appended columns to match original file exactly
  const hasRaw = projects.length > 0 && projects[0]._raw && projects[0]._raw!.length > 0;

  if (hasRaw) {
    const rawRows = projects.map(p => p._raw!);
    const colCount = Math.max(...rawRows.map(r => r.length), lastRMHeaders.length);

    // Header: original headers + 2 new columns
    const headerRow: (string | number)[] = [];
    for (let c = 0; c < colCount; c++) {
      headerRow.push(lastRMHeaders[c] || '');
    }
    headerRow.push('Тип эффекта', 'Сумма эффекта (млн руб.)');

    // Data rows: original raw data + 2 new columns
    const dataRows = projects.map(p => {
      const row: (string | number)[] = [];
      const raw = p._raw!;
      for (let c = 0; c < colCount; c++) {
        row.push(c < raw.length ? raw[c] : '');
      }
      row.push(p.effectType || '', p.effectAmount || 0);
      return row;
    });

    const rows: (string | number)[][] = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const totalRows = rows.length;
    const totalCols = colCount + 2;
    const endCol = XLSX.utils.encode_col(totalCols - 1);
    ws['!ref'] = `A1:${endCol}${totalRows}`;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'РМ с эффектами');
    XLSX.writeFile(wb, filename);
  } else {
    // Fallback: no raw data available
    const headers = [
      'ID', 'Проект', 'Тема', 'ЦИО', 'Дата начала', 'Срок',
      'Эффекты', 'Мингос', 'ФОТ', 'Инфра', 'Прямые',
      'Тип эффекта', 'Сумма эффекта (млн руб.)',
    ];
    const rows: (string | number)[][] = [headers];
    projects.forEach(p => {
      rows.push([
        p.id, p.name, p.topic, p.department, p.startDate, p.endDate,
        p.effects, p.mingos, p.costFOT, p.costInfra, p.costDirect,
        p.effectType || '', p.effectAmount || 0,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!ref'] = `A1:M${rows.length}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'РМ с эффектами');
    XLSX.writeFile(wb, filename);
  }
}

// ════════════════ Full report XLSX export (28 columns) ════════════════

export function exportFullReport(projects: Project[], filename: string = 'Отчет_по_проектам.xlsx'): void {
  const headers = [
    'Идентификатор проекта', 'Проект', 'Статус', 'Руководство',
    'ЦИО проекта', 'Ответственный', 'Тема',
    'Статус проекта', 'Реализовано Мингосуправления',
    'Дата начала', 'Срок завершения',
    'Эффекты', 'ФОТ разработчиков, млн руб.',
    'Затраты на ЦОД, млн руб.', 'Прямые затраты, млн руб.',
    'Затраты, млн руб.', 'Заявлено к высвобождению',
    'Факт высвобождения трудозатрат',
    'Физическое сокращение план',
    'Физическое сокращение факт',
    'Высвобождение Иные ЦИО',
    'Дата сокращения',
    'Тип эффекта',
    'Сумма эффекта, млн руб.',
    'Фин. эффект с высвоб., млн руб.',
    'Фин. эффект сокращ., млн руб.',
    'Эффективность с высвоб., млн руб.',
    'Эффективность без высвоб., млн руб.',
  ];

  const rows: (string | number)[][] = [headers];

  projects.forEach(p => {
    const laborClaimed = p.laborClaimed ?? 0;
    const laborRelease = p.laborRelease ?? 0;
    const reductionPlan = p.reductionPlan ?? 0;
    const reductionActual = p.reductionActual ?? 0;
    const releaseOther = p.releaseOther ?? 0;
    const effectAmount = p.effectAmount ?? 0;
    const costFOT = p.costFOT ?? 0;
    const costInfra = p.costInfra ?? 0;
    const costDirect = p.costDirect ?? 0;
    const costTotal = p.costTotal ?? 0;

    const finEffectRelease = laborClaimed * 3.4;
    const finEffectReduction = reductionPlan * 3.4;
    const effWithRelease = laborClaimed * 3.4 + effectAmount - (costTotal / 1000);
    const effWithoutRelease = reductionPlan * 3.4 + effectAmount - (costTotal / 1000);

    // Extract original RM ID from link
    const linkMatch = p.link.match(/\/issues\/(\d+)/);
    const origId = linkMatch ? Number(linkMatch[1]) : p.id;

    rows.push([
      origId,
      p.name,
      p.dbStatus || '',
      p.dbLeader || '',
      p.department,
      p.dbResponsible || '',
      p.topic,
      p.rmStatus || '',
      p.mingos,
      p.startDate,
      p.endDate,
      p.effects,
      Math.round((costFOT / 1000) * 100) / 100,
      Math.round((costInfra / 1000) * 100) / 100,
      Math.round((costDirect / 1000) * 100) / 100,
      Math.round((costTotal / 1000) * 100) / 100,
      laborClaimed,
      laborRelease,
      reductionPlan,
      reductionActual,
      releaseOther,
      p.reductionDate || '',
      p.effectType || '',
      effectAmount,
      Math.round(finEffectRelease * 10) / 10,
      Math.round(finEffectReduction * 10) / 10,
      Math.round(effWithRelease * 10) / 10,
      Math.round(effWithoutRelease * 10) / 10,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const endCol = XLSX.utils.encode_col(27); // AB = 28 columns
  ws['!ref'] = `A1:${endCol}${rows.length}`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Отчет по проектам');
  XLSX.writeFile(wb, filename);
}

// Legacy single-file parser (kept for backward compatibility)
export async function parseXLSX(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as (string | number)[][];

        if (rows.length < 2) {
          resolve({ projects: [], error: 'Файл пуст или не содержит данных' });
          return;
        }

        let headerRow = 0;
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const row = rows[i];
          if (row.some(cell => cell === 'Проект' || cell === '№' || cell === 'ЦИО проекта')) {
            headerRow = i;
            break;
          }
        }

        const headers = rows[headerRow].map(h => String(h).trim());
        const colMap: Record<string, number> = {};
        headers.forEach((h, i) => { colMap[h] = i; });

        const getCol = (row: (string | number)[], name: string, fallback?: string): string => {
          const idx = colMap[name];
          if (idx === undefined || idx >= row.length) return '';
          const val = row[idx];
          if (val === undefined || val === null || val === '') {
            return fallback !== undefined ? fallback : '';
          }
          return String(val).trim();
        };

        const getNum = (row: (string | number)[], name: string): number => {
          const idx = colMap[name];
          if (idx === undefined || idx >= row.length) return 0;
          const val = row[idx];
          if (val === undefined || val === null || val === '') return 0;
          const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
          return isNaN(n) ? 0 : n;
        };

        const projects: Project[] = [];
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length < 3) continue;
          const name = getCol(row, 'Проект');
          if (!name) continue;

          const effAmount = getNum(row, 'Сумма по эффекту (млн руб.)') || getNum(row, 'Сумма эффекта');
          const effType = getCol(row, 'Тип эффекта') || getCol(row, 'Признак эффекта');
          const laborRel = getNum(row, 'Высвобождение трудозатрат');
          const redPlan = getNum(row, 'План сокращение');
          const cTotal = getNum(row, 'Затраты, всего');
          const econEffect = laborRel * 3.4 + effAmount;
          const dlt = econEffect - (cTotal / 1000);

          const raw: (string | number)[] = row.map(v => v === undefined || v === null ? '' : v);

          projects.push({
            id: getNum(row, '№') || projects.length + 1,
            link: getCol(row, 'Ссылка на проект'),
            name,
            topic: getCol(row, 'Тема проекта'),
            department: getCol(row, 'ЦИО проекта'),
            startDate: getCol(row, 'Дата начала'),
            endDate: getCol(row, 'Срок завершения'),
            effects: getCol(row, 'Эффекты'),
            effectType: effType,
            effectAmount: Math.round(effAmount * 10) / 10,
            laborRelease: Math.round(laborRel * 10) / 10,
            reductionPlan: Math.round(redPlan * 10) / 10,
            mingos: getCol(row, 'Реализовано Мингос', 'Нет'),
            costFOT: getNum(row, 'Затраты ФОТ'),
            costDirect: getNum(row, 'Прямые затраты'),
            costInfra: getNum(row, 'Инфраструктура затраты'),
            costTotal: Math.round(cTotal * 10) / 10,
            economicEffect: Math.round(econEffect * 10) / 10,
            delta: Math.round(dlt * 10) / 10,
            nonMaterialEffect: getCol(row, 'Описание не материального эффекта'),
            _raw: raw,
          });
        }

        if (projects.length === 0) {
          resolve({ projects: [], error: 'Не удалось найти проекты в файле. Проверьте формат.' });
          return;
        }

        resolve({ projects, error: null });
      } catch (err) {
        resolve({ projects: [], error: `Ошибка чтения файла: ${err instanceof Error ? err.message : String(err)}` });
      }
    };

    reader.onerror = () => {
      resolve({ projects: [], error: 'Ошибка чтения файла' });
    };

    reader.readAsArrayBuffer(file);
  });
}
