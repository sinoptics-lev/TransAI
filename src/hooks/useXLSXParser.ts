import * as XLSX from 'xlsx';
import type { Project, AIAnalysis } from '@/types/project';
import { parseEffects } from '@/lib/parseEffects';

interface ParseResult {
  projects: Project[];
  error: string | null;
  rmHeaders?: (string | number)[];
}

export type AIRecordMap = Record<number, AIAnalysis>;

function extractVerdictFromAI(analysis: AIAnalysis): string {
  const positivePatterns = ['однозначно рекомендуется','рекомендован к внедрению','рекомендуется к внедрению','рекомендуется','рекомендован','целесообразно','эффективен','положительная дельта','окупаемость'];
  const negativePatterns = ['не рекомендован к внедрению','не рекомендуется','не рекомендован','нецелесообразно','неэффективен','отрицательная дельта','не окупается'];
  for (const value of Object.values(analysis)) {
    const val = String(value).toLowerCase();
    for (const p of negativePatterns) { if (val.includes(p)) return 'не рекомендован к внедрению'; }
    for (const p of positivePatterns) { if (val.includes(p)) return 'рекомендован к внедрению'; }
  }
  return 'Нет данных';
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

/** Parse date from XLSX — handles Date objects, Excel serial numbers, strings */
function parseDate(val: unknown): string {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return fmtDate(val);
  }
  if (typeof val === 'number') {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + val * 86400000);
    return fmtDate(d);
  }
  const s = String(val).trim();
  const iso = s.match(/^(\d{4})[-.](\d{2})[-.](\d{2})/);
  if (iso) return `${iso[3]}.${iso[2]}.${iso[1]}`;
  const ru = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (ru) return `${ru[1]}.${ru[2]}.${ru[3]}`;
  return s;
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

interface DBRecord {
  dbNumber: number; dbLeader: string; laborClaimed: number; laborRelease: number;
  reductionPlan: number; reductionActual: number; dbStatus: string; deadline: string;
  totalCost: number; department: string; dbResponsible: string; releaseOther: number;
  reductionDate: string;
}

function findColIdx(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseRMFile(file: File): Promise<{ records: Project[]; headers: (string | number)[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
        if (rows.length === 0) { resolve({ records: [], headers: [] }); return; }

        const headers = rows[0].map(h => (h === undefined || h === null ? '' : String(h).trim()));

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
          createdDate: findColIdx(headers, 'Создано', 'создано', 'Дата создания', 'дата создания', 'created', 'Create', 'create'),
          updatedDate: findColIdx(headers, 'Обновлено', 'обновлено', 'Дата изменения', 'дата изменения', 'updated', 'Update', 'update'),
        };

        console.log('[XLSX] Date columns — createdDate idx:', colIdx.createdDate, 'updatedDate idx:', colIdx.updatedDate);
        console.log('[XLSX] Headers:', headers.slice(0, 20));

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

          let effectType = colIdx.effectType >= 0 ? safeStr(row[colIdx.effectType]) : '';
          let effectAmount = colIdx.effectAmount >= 0 ? safeFloat(row[colIdx.effectAmount]) : 0;

          if (!effectType && effectAmount === 0 && effectsText) {
            const parsed = parseEffects(effectsText);
            if (parsed.type && parsed.amount !== null && parsed.amount > 0) {
              effectType = parsed.type; effectAmount = parsed.amount;
            }
          }

          const raw: (string | number)[] = headers.map((_, c) => {
            const v = row[c];
            if (v === undefined || v === null || v === '') return '';
            if (typeof v === 'number') return v;
            return String(v);
          });

          const fotRaw = colIdx.fot >= 0 ? safeFloat(row[colIdx.fot]) : 0;
          const infraRaw = colIdx.infra >= 0 ? safeFloat(row[colIdx.infra]) : 0;
          const directRaw = colIdx.direct >= 0 ? safeFloat(row[colIdx.direct]) : 0;
          const totalRaw = colIdx.totalCost >= 0 ? safeFloat(row[colIdx.totalCost]) : 0;
          const costTotal = totalRaw > 0 ? totalRaw : (fotRaw + infraRaw + directRaw);

          if (idx <= 4) {
            const rawC = colIdx.createdDate >= 0 ? row[colIdx.createdDate] : 'N/A';
            const rawU = colIdx.updatedDate >= 0 ? row[colIdx.updatedDate] : 'N/A';
            console.log(`[XLSX] #${idx} RAW created="${rawC}"(${typeof rawC}) updated="${rawU}"(${typeof rawU})`);
          }

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
            laborRelease: 0, reductionPlan: 0,
            mingos: mingosRaw === 'да' || mingosRaw === 'yes' || mingosRaw === '1' || mingosRaw === 'true' ? 'Да' : 'Нет',
            costFOT: Math.round(fotRaw * 10) / 10,
            costDirect: Math.round(directRaw * 10) / 10,
            costInfra: Math.round(infraRaw * 10) / 10,
            costTotal: Math.round(costTotal * 10) / 10,
            economicEffect: 0, delta: 0,
            nonMaterialEffect: '',
            rmStatus: colIdx.status >= 0 ? safeStr(row[colIdx.status]) : '',
            createdDate: colIdx.createdDate >= 0 ? parseDate(row[colIdx.createdDate]) : '',
            updatedDate: colIdx.updatedDate >= 0 ? parseDate(row[colIdx.updatedDate]) : '',
            _raw: raw,
          });
        }

        resolve({ records: projects, headers });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла РМ'));
    reader.readAsArrayBuffer(file);
  });
}

function parseDBFile(file: File): Promise<Record<number, DBRecord>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as unknown[][];
        if (rows.length === 0) { resolve({}); return; }

        const c = { number:0, claimed:2, laborRelease:3, reductionPlan:4, reductionActual:5, deadline:6, totalCost:7, status:8, responsible:9, department:10, linkId:11, leader:12, reductionDate:13, releaseOther:14 };
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
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла ДБ'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseAIFile(file: File): Promise<AIRecordMap> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }) as unknown[][];
        if (rows.length === 0) { resolve({}); return; }

        const headers = rows[0].map(h => (h === undefined || h === null ? '' : String(h).trim()));
        const idIdx = findColIdx(headers, 'ID проекта', 'ID', '#', '№');
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
            if (val !== undefined && val !== null && val !== '') analysis[colName] = String(val).trim();
          }
          if (Object.keys(analysis).length > 0) result[idInt] = analysis;
        }
        resolve(result);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла Аналитика ИИ'));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseTwoXLSX(rmFile: File, dbFile: File, aiFile?: File): Promise<ParseResult & { aiData: AIRecordMap }> {
  try {
    const [rmResult, dbData, aiData] = await Promise.all([
      parseRMFile(rmFile), parseDBFile(dbFile),
      aiFile ? parseAIFile(aiFile) : Promise.resolve({} as AIRecordMap),
    ]);

    if (rmResult.records.length === 0) return { projects: [], error: 'Файл РМ не содержит данных', aiData: {} };

    const dbKeys = new Set(Object.keys(dbData).map(Number));
    const projects = rmResult.records
      .map(rm => {
        const linkMatch = rm.link.match(/\/issues\/(\d+)/);
        const origId = linkMatch ? Number(linkMatch[1]) : 0;
        return { rm, origId, hasDb: origId > 0 && dbKeys.has(origId) };
      })
      .filter(({ hasDb }) => hasDb)
      .map(({ rm, origId }, idx) => {
        const db = dbData[origId];
        const laborClaimed = db.laborClaimed;
        const reductionPlan = db.reductionPlan;
        const totalCost = db.totalCost;
        const economicEffect = laborClaimed * 3.4 + rm.effectAmount;
        const delta = economicEffect - (totalCost / 1000);
        const aiAnalysis = origId > 0 ? aiData[origId] : undefined;

        let aiVerdict: string | undefined;
        let aiReasoning: string | undefined;
        if (aiAnalysis && Object.keys(aiAnalysis).length > 0) {
          aiVerdict = extractVerdictFromAI(aiAnalysis);
          if (aiVerdict !== 'Нет данных') aiReasoning = Object.entries(aiAnalysis).map(([k,v]) => `${k}: ${v}`).join('\n');
        }

        return {
          ...rm, id: idx + 1,
          laborRelease: Math.round(laborClaimed * 10) / 10,
          reductionPlan: Math.round(reductionPlan * 10) / 10,
          costTotal: Math.round(totalCost * 10) / 10,
          economicEffect: Math.round(economicEffect * 10) / 10,
          delta: Math.round(delta * 10) / 10,
          department: db.department || rm.department,
          endDate: db.deadline || rm.endDate,
          dbStatus: db.dbStatus, dbLeader: db.dbLeader, dbResponsible: db.dbResponsible,
          laborClaimed: Math.round(laborClaimed * 10) / 10,
          reductionActual: Math.round(db.reductionActual * 10) / 10,
          releaseOther: Math.round(db.releaseOther * 10) / 10,
          reductionDate: db.reductionDate,
          aiAnalysis, aiVerdict, aiReasoning,
        };
      });

    return { projects, error: null, rmHeaders: rmResult.headers, aiData };
  } catch (err) {
    return { projects: [], error: `Ошибка: ${err instanceof Error ? err.message : String(err)}`, aiData: {} };
  }
}

let lastRMHeaders: (string | number)[] = [];
export function setRMHeaders(headers: (string | number)[]): void { lastRMHeaders = headers; }

export function exportEnrichedRM(projects: Project[], filename: string = 'РМ_с_эффектами.xlsx'): void {
  const hasRaw = projects.length > 0 && projects[0]._raw && projects[0]._raw!.length > 0;
  if (hasRaw) {
    const rawRows = projects.map(p => p._raw!);
    const colCount = Math.max(...rawRows.map(r => r.length), lastRMHeaders.length);
    const headerRow: (string | number)[] = [];
    for (let c = 0; c < colCount; c++) headerRow.push(lastRMHeaders[c] || '');
    headerRow.push('Тип эффекта', 'Сумма эффекта (млн руб.)');
    const dataRows = projects.map(p => {
      const row: (string | number)[] = [];
      const raw = p._raw!;
      for (let c = 0; c < colCount; c++) row.push(c < raw.length ? raw[c] : '');
      row.push(p.effectType || '', p.effectAmount || 0);
      return row;
    });
    const rows: (string | number)[][] = [headerRow, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const totalCols = colCount + 2;
    ws['!ref'] = `A1:${XLSX.utils.encode_col(totalCols - 1)}${rows.length}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'РМ с эффектами');
    XLSX.writeFile(wb, filename);
  } else {
    const headers = ['ID','Проект','Тема','ЦИО','Дата начала','Срок','Эффекты','Мингос','ФОТ','Инфра','Прямые','Тип эффекта','Сумма эффекта (млн руб.)'];
    const rows: (string | number)[][] = [headers];
    projects.forEach(p => rows.push([p.id,p.name,p.topic,p.department,p.startDate,p.endDate,p.effects,p.mingos,p.costFOT,p.costInfra,p.costDirect,p.effectType||'',p.effectAmount||0]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!ref'] = `A1:M${rows.length}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'РМ с эффектами');
    XLSX.writeFile(wb, filename);
  }
}

export function exportFullReport(projects: Project[], filename: string = 'Отчет_по_проектам.xlsx'): void {
  const headers = ['Идентификатор','Проект','Статус','Руководство','ЦИО','Ответственный','Тема','Статус проекта','Мингос','Дата начала','Срок','Эффекты','ФОТ млн','ЦОД млн','Прямые млн','Затраты млн','Высвоб.план','Высвоб.факт','Сокр.план','Сокр.факт','Иные ЦИО','Дата сокр.','Дата создания','Дата изменения','Тип эффекта','Сумма эффекта','Фин.эфф.высвоб.','Фин.эфф.сокр.','Эфф.с высвоб.','Эфф.без высвоб.'];
  const rows: (string | number)[][] = [headers];
  projects.forEach(p => {
    const m = p.link.match(/\/issues\/(\d+)/);
    rows.push([
      m?Number(m[1]):p.id, p.name, p.dbStatus||'', p.dbLeader||'', p.department, p.dbResponsible||'', p.topic, p.rmStatus||'', p.mingos,
      p.startDate, p.endDate, p.effects, p.costFOT/1000, p.costInfra/1000, p.costDirect/1000, p.costTotal/1000,
      p.laborClaimed||0, p.laborRelease||0, p.reductionPlan||0, p.reductionActual||0, p.releaseOther||0, p.reductionDate||'',
      p.createdDate||'', p.updatedDate||'',
      p.effectType||'', p.effectAmount||0, (p.laborClaimed||0)*3.4, (p.reductionPlan||0)*3.4,
      (p.laborClaimed||0)*3.4+(p.effectAmount||0)-p.costTotal/1000,
      (p.reductionPlan||0)*3.4+(p.effectAmount||0)-p.costTotal/1000,
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!ref'] = `A1:${XLSX.utils.encode_col(headers.length-1)}${rows.length}`;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Отчет');
  XLSX.writeFile(wb, filename);
}
