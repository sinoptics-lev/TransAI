import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Save, FileText, Gavel, ClipboardList } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { Project } from '@/types/project';

interface Props {
  project: Project;
  activeTab?: 'ai' | 'reasoning';
}

/** Parsed analysis sections */
interface ParsedAnalysis {
  verdict: string;
  reasoning: string;
  raw: string;
}

/** Parse DeepSeek response into structured sections */
function parseAnalysisSections(text: string): ParsedAnalysis {
  // Try split by --- separator
  const parts = text.split(/\n?---\n?/);
  if (parts.length >= 2) {
    const verdictPart = parts[0];
    const reasoningPart = parts.slice(1).join('\n\n---\n\n');

    // Extract verdict: look for ## Оценка проекта then the verdict line
    const verdictLines = verdictPart.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('['));
    const verdict = verdictLines[0] || '';

    // Extract reasoning: look for ## Краткое обоснование then the text
    const reasoningLines = reasoningPart.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('['));
    const reasoning = reasoningLines.join('\n\n');

    if (verdict && reasoning) {
      return { verdict, reasoning, raw: text };
    }
  }

  // Fallback: try to find sections by headers
  const lines = text.split('\n').map(l => l.trim());
  let verdict = '';
  let reasoning = '';
  let inVerdict = false;
  let inReasoning = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('оценка проекта') && !lower.includes('обоснован')) {
      inVerdict = true;
      inReasoning = false;
      continue;
    }
    if (lower.includes('обоснован')) {
      inVerdict = false;
      inReasoning = true;
      continue;
    }
    if (line.startsWith('---')) continue;
    if (line.startsWith('##')) continue;
    if (line.startsWith('[') && line.endsWith(']')) continue;
    if (!line) { inVerdict = false; continue; }

    if (inVerdict && !verdict) {
      verdict = line;
    } else if (inReasoning) {
      reasoning += (reasoning ? '\n' : '') + line;
    }
  }

  // Last resort: scan for verdict keywords
  if (!verdict) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('не рекомендуется')) { verdict = line; break; }
      if (lower.includes('социальной направленности')) { verdict = line; break; }
      if (lower.includes('внесения изменений')) { verdict = line; break; }
      if (lower.includes('однозначно рекомендуется')) { verdict = line; break; }
    }
  }

  return { verdict, reasoning: reasoning || text, raw: text };
}

/** Parse verdict for DB storage */
function parseVerdict(text: string): string {
  const parsed = parseAnalysisSections(text);
  if (parsed.verdict) return parsed.verdict;
  // Fallback keyword scan
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('не рекомендуется')) return 'не рекомендуется';
    if (lower.includes('социальной направленности')) return 'рекомендуется с учетом социальной направленности';
    if (lower.includes('внесения изменений')) return 'рекомендуется с учетом внесения изменений';
    if (lower.includes('однозначно рекомендуется')) return 'однозначно рекомендуется';
  }
  return '';
}

/** Get display color for verdict */
function getVerdictColor(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v.includes('не рекомендован') || v.includes('не рекомендуется')) return 'text-red-600 bg-red-50 border-red-200';
  if (v.includes('однозначно')) return 'text-green-700 bg-green-50 border-green-200';
  if (v.includes('социальной') || v.includes('изменений')) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (v.includes('рекомендован') || v.includes('рекомендуется')) return 'text-green-600 bg-green-50 border-green-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

export function AIAnalysisPanel({ project, activeTab = 'reasoning' }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dbReasoning, setDbReasoning] = useState<{ verdict: string; reasoning: string } | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Load existing reasoning from DB when tab opens
  useEffect(() => {
    if (activeTab !== 'reasoning') return;
    const rmMatch = project.link.match(/\/issues\/(\d+)/);
    const rmId = rmMatch ? Number(rmMatch[1]) : 0;
    if (rmId <= 0 && project.id <= 0) return;

    setDbLoading(true);
    const url = rmId > 0
      ? `api/ai_reasoning.php?rmId=${rmId}`
      : `api/ai_reasoning.php?projectId=${project.id}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.found) {
          setDbReasoning({ verdict: data.verdict, reasoning: data.reasoning });
          setAnalysis(data.reasoning);
        }
      })
      .catch(() => {/* silent */})
      .finally(() => setDbLoading(false));
  }, [activeTab, project.id, project.link]);

  const handleAnalyze = async () => {
    setLoading(true);
    setSaved(false);
    setAnalysis(null);

    try {
      const response = await fetch('api/analyze.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name,
          department: project.department,
          topic: project.topic,
          effects: project.effects,
          effectType: project.effectType,
          effectAmount: project.effectAmount,
          laborClaimed: project.laborClaimed ?? 0,
          reductionPlan: project.reductionPlan,
          costTotal: project.costTotal,
          economicEffect: project.economicEffect,
          delta: project.delta,
          aiAnalysisData: project.aiAnalysis,
        }),
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const result = await response.json();
      if (result.analysis) {
        setAnalysis(result.analysis);
        await saveToDb(result.analysis);
      } else {
        setAnalysis('Пустой ответ от сервера.');
      }
    } catch (err) {
      setAnalysis('Ошибка при запросе AI-анализа: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const saveToDb = async (text: string) => {
    const verdict = parseVerdict(text);
    const rmMatch = project.link.match(/\/issues\/(\d+)/);
    const rmId = rmMatch ? Number(rmMatch[1]) : 0;

    setSaving(true);
    try {
      await fetch('api/ai_reasoning.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          rmId,
          verdict,
          reasoning: text,
        }),
      });
      setSaved(true);
      setDbReasoning({ verdict, reasoning: text });
    } catch {
      /* silent */
    } finally {
      setSaving(false);
    }
  };

  // ── Tab: AI Data (from XLSX file) ──
  if (activeTab === 'ai') {
    if (!project.aiAnalysis || Object.keys(project.aiAnalysis).length === 0) {
      return (
        <div className="text-center py-8 text-[#718096]">
          Нет данных ИИ-аналитики из файла
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <div className="text-[0.75rem] uppercase tracking-wider text-[#7c3aed] font-semibold">
          Данные из файла аналитики
        </div>
        {Object.entries(project.aiAnalysis).map(([colName, value]) => (
          <div key={colName}>
            <div className="text-[0.75rem] uppercase tracking-wider text-[#7c3aed] mb-1 font-semibold">
              {colName}
            </div>
            <div className="text-[0.9rem] text-[#1a202c] leading-relaxed whitespace-pre-wrap bg-[#faf5ff] p-4 rounded-lg">
              {value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Tab: Reasoning (DeepSeek analysis) ──
  return (
    <div className="space-y-4">
      {dbLoading && (
        <div className="text-center py-4 text-[0.8rem] text-[#718096]">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
          Загрузка...
        </div>
      )}

      {/* XLSX-imported verdict badge */}
      {project.aiVerdict && project.aiVerdict !== 'Нет данных' && !analysis && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-lg p-4 border ${getVerdictColor(project.aiVerdict)}`}
        >
          <div className="text-[0.75rem] uppercase tracking-wider mb-2 font-semibold flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Вердикт из файла ИИ-аналитики
          </div>
          <div className="text-[1rem] font-bold">{project.aiVerdict}</div>
          {project.aiReasoning && (
            <div className="text-[0.85rem] mt-2 leading-relaxed opacity-80">
              {project.aiReasoning.split('\n').slice(0, 3).join('\n')}
              {project.aiReasoning.split('\n').length > 3 && '...'}
            </div>
          )}
        </motion.div>
      )}

      {/* No data badge */}
      {(!project.aiVerdict || project.aiVerdict === 'Нет данных') && !dbReasoning && !analysis && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <div className="text-[0.85rem] text-[#718096]">
            Вердикт: <span className="font-semibold text-gray-600">Нет данных</span>
          </div>
          <div className="text-[0.75rem] text-[#718096] mt-1">
            Загрузите файл ИИ-аналитики или запустите анализ через DeepSeek
          </div>
        </div>
      )}

      {/* DB-saved DeepSeek reasoning */}
      {dbReasoning && !analysis && (() => {
        const parsed = parseAnalysisSections(dbReasoning.reasoning);
        const vColor = getVerdictColor(dbReasoning.verdict);

        return (
          <div className="space-y-3">
            {dbReasoning.verdict && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl p-5 border-2 ${vColor}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Save className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[0.8rem] uppercase tracking-wider font-bold">Сохраненная оценка</span>
                </div>
                <div className="text-[1.2rem] font-bold leading-tight">{dbReasoning.verdict}</div>
              </motion.div>
            )}

            {parsed.reasoning && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-[#1a56db]" />
                  <span className="text-[0.8rem] uppercase tracking-wider text-[#1a56db] font-bold">Обоснование</span>
                </div>
                <div className="text-[0.9rem] text-[#1a202c] leading-relaxed whitespace-pre-wrap">{parsed.reasoning}</div>
              </motion.div>
            )}

            {!parsed.reasoning && (
              <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-lg p-4">
                <MarkdownRenderer content={dbReasoning.reasoning} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Run analysis button */}
      <motion.button
        onClick={handleAnalyze}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl text-[0.9rem] font-semibold border-none cursor-pointer hover:from-[#6d28d9] hover:to-[#5b21b6] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Анализирую...</>
        ) : (
          <><Sparkles className="w-4 h-4" />{dbReasoning ? 'Перезапустить AI-анализ обоснованности' : 'Запустить AI-анализ обоснованности'}</>
        )}
      </motion.button>

      {/* Structured Analysis Result */}
      {analysis && (() => {
        const parsed = parseAnalysisSections(analysis);
        const verdictColor = getVerdictColor(parsed.verdict);

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* Verdict Block */}
            {parsed.verdict && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl p-5 border-2 ${verdictColor}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Gavel className="w-5 h-5 flex-shrink-0" />
                  <span className="text-[0.8rem] uppercase tracking-wider font-bold">Оценка проекта</span>
                </div>
                <div className="text-[1.2rem] font-bold leading-tight">
                  {parsed.verdict}
                </div>
              </motion.div>
            )}

            {/* Reasoning Block */}
            {parsed.reasoning && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-[#1a56db]" />
                  <span className="text-[0.8rem] uppercase tracking-wider text-[#1a56db] font-bold">Краткое обоснование оценки</span>
                </div>
                <div className="text-[0.9rem] text-[#1a202c] leading-relaxed whitespace-pre-wrap">
                  {parsed.reasoning}
                </div>
              </motion.div>
            )}

            {/* Saved indicator */}
            {saved && (
              <div className="text-[0.75rem] text-[#0e9f6e] flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                Сохранено в БД
              </div>
            )}

            {/* Raw text fallback toggle */}
            {!parsed.verdict && !parsed.reasoning && (
              <div className="text-[0.9rem] text-[#1a202c] leading-relaxed bg-[#f0fdf4] p-4 rounded-lg border border-[#bbf7d0]">
                <MarkdownRenderer content={analysis} />
              </div>
            )}
          </motion.div>
        );
      })()}

      {saving && (
        <div className="text-[0.8rem] text-[#718096] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Сохранение в БД...
        </div>
      )}
    </div>
  );
}
