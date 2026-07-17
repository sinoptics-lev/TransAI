import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Save, FileText, Gavel, ClipboardList } from 'lucide-react';
import type { Project } from '@/types/project';

interface Props {
  project: Project;
  activeTab?: 'ai' | 'reasoning';
}

interface ParsedAnalysis {
  verdict: string;
  reasoning: string;
  raw: string;
}

function parseAnalysisSections(text: string): ParsedAnalysis {
  const parts = text.split(/\n?---\n?/);
  if (parts.length >= 2) {
    const verdictLines = parts[0].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('['));
    const reasoningLines = parts.slice(1).join('\n\n---\n\n').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('['));
    if (verdictLines[0] && reasoningLines.join('\n\n')) {
      return { verdict: verdictLines[0], reasoning: reasoningLines.join('\n\n'), raw: text };
    }
  }

  const lines = text.split('\n').map(l => l.trim());
  let verdict = '', reasoning = '', inVerdict = false, inReasoning = false;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('оценка проекта') && !lower.includes('обоснован')) { inVerdict = true; inReasoning = false; continue; }
    if (lower.includes('обоснован')) { inVerdict = false; inReasoning = true; continue; }
    if (line.startsWith('---') || line.startsWith('##') || (line.startsWith('[') && line.endsWith(']'))) continue;
    if (!line) { inVerdict = false; continue; }
    if (inVerdict && !verdict) verdict = line;
    else if (inReasoning) reasoning += (reasoning ? '\n' : '') + line;
  }

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

function parseVerdict(text: string): string {
  const parsed = parseAnalysisSections(text);
  if (parsed.verdict) return parsed.verdict;
  for (const line of text.split('\n').map(l => l.trim()).filter(Boolean)) {
    const lower = line.toLowerCase();
    if (lower.includes('не рекомендуется')) return 'не рекомендуется';
    if (lower.includes('социальной направленности')) return 'рекомендуется с учетом социальной направленности';
    if (lower.includes('внесения изменений')) return 'рекомендуется с учетом внесения изменений';
    if (lower.includes('однозначно рекомендуется')) return 'однозначно рекомендуется';
  }
  return '';
}

function getVerdictColor(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v.includes('не рекомендован') || v.includes('не рекомендуется')) {
    return 'text-rose-900 bg-rose-50 border-rose-200 font-extrabold dark:text-[#ff4949] dark:bg-red-950/20 dark:border-red-900/40';
  }
  if (v.includes('однозначно')) {
    return 'text-emerald-900 bg-emerald-50 border-emerald-200 font-extrabold dark:text-[#3da885] dark:bg-emerald-950/20 dark:border-emerald-900/40';
  }
  if (v.includes('социальной') || v.includes('изменений')) {
    return 'text-amber-950 bg-amber-50 border-amber-200 font-extrabold dark:text-[#fbbf24] dark:bg-amber-950/20 dark:border-amber-900/40';
  }
  if (v.includes('рекомендован') || v.includes('рекомендуется')) {
    return 'text-emerald-900 bg-emerald-50 border-emerald-200 font-extrabold dark:text-[#3da885] dark:bg-emerald-950/20 dark:border-emerald-900/40';
  }
  return 'text-slate-800 bg-slate-50 border-slate-200 font-bold dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-700/40';
}

function renderRecommendationText(text: string) {
  const parts = text.split(/(1)/g);
  return parts.map((part, index) => {
    if (part === '1') {
      return <span key={index} className="text-[#1E293B] dark:text-white font-extrabold">1</span>;
    }
    return part;
  });
}

export function AIAnalysisPanel({ project, activeTab = 'reasoning' }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dbReasoning, setDbReasoning] = useState<{ verdict: string; reasoning: string } | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rmMatch = project.link.match(/\/issues\/(\d+)/);
  const rmId = rmMatch ? Number(rmMatch[1]) : 0;

  useEffect(() => {
    if (activeTab !== 'reasoning') return;
    if (rmId <= 0) return;
    setDbLoading(true);
    fetch(`api/ai_reasoning.php?rmId=${rmId}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.found) {
          setDbReasoning({ verdict: data.verdict, reasoning: data.reasoning });
          setAnalysis(data.reasoning);
        }
      })
      .catch(() => {})
      .finally(() => setDbLoading(false));
  }, [activeTab, rmId]);

  const handleAnalyze = async () => {
    setLoading(true); setSaved(false); setSaveError(null); setAnalysis(null);
    try {
      const resp = await fetch('api/analyze.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: project.name, department: project.department, topic: project.topic,
          effects: project.effects, effectType: project.effectType, effectAmount: project.effectAmount,
          laborClaimed: project.laborClaimed ?? 0, reductionPlan: project.reductionPlan,
          costTotal: project.costTotal, economicEffect: project.economicEffect, delta: project.delta,
          aiAnalysisData: project.aiAnalysis,
        }),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const result = await resp.json();
      if (result.analysis) { setAnalysis(result.analysis); await saveToDb(result.analysis); }
      else setAnalysis('Пустой ответ от сервера.');
    } catch (err) {
      setAnalysis('Ошибка: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setLoading(false); }
  };

  const saveToDb = async (text: string) => {
    if (rmId <= 0) { setSaveError('Нет ID проекта (rmId) — сохранение невозможно'); return; }
    const verdict = parseVerdict(text) || 'Не определён';
    setSaving(true);
    try {
      const resp = await fetch('api/ai_reasoning.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rmId, verdict, reasoning: text }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data || data.ok !== true) {
        throw new Error((data && data.error) || 'HTTP ' + resp.status);
      }
      setSaved(true); setSaveError(null); setDbReasoning({ verdict, reasoning: text });
    } catch (err) {
      setSaveError('Ошибка сохранения в БД: ' + (err instanceof Error ? err.message : String(err)));
    } finally { setSaving(false); }
  };

  // AI Data tab
  if (activeTab === 'ai') {
    if (!project.aiAnalysis || Object.keys(project.aiAnalysis).length === 0) {
      return <div className="text-center py-8 text-slate-500 font-medium dark:text-slate-400">Нет данных ИИ-аналитики из файла</div>;
    }
    return (
      <div className="space-y-4">
        <div className="text-[0.75rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold pb-1.5 border-b border-slate-100 dark:border-slate-800">Данные из файла аналитики</div>
        {Object.entries(project.aiAnalysis).map(([colName, value]) => {
          const isRecommendation = colName.toLowerCase().includes('рекомендован') || colName.toLowerCase().includes('рекомендуется');
          const isNegative = isRecommendation && (value.toLowerCase().includes('не рекомендован') || value.toLowerCase().includes('не рекомендуется') || value.toLowerCase().includes('нецелесообразно'));

          return (
            <div key={colName} className="space-y-1.5">
              <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">
                {colName}
              </div>
              <div className={`text-[0.9rem] leading-relaxed whitespace-pre-wrap rounded-xl p-4 border transition-all ${
                isRecommendation
                  ? isNegative
                    ? 'bg-rose-50 text-rose-900 border-rose-200 font-bold shadow-xs dark:bg-red-950/20 dark:text-[#ff4949] dark:border-red-900/40'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200 font-bold shadow-xs dark:bg-emerald-950/20 dark:text-[#3da885] dark:border-emerald-900/40'
                  : 'bg-slate-50 border-slate-200 text-slate-800 font-medium dark:bg-slate-800/30 dark:border-slate-700/50 dark:text-slate-200'
              }`}>
                {isRecommendation ? renderRecommendationText(value) : value}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Reasoning tab
  return (
    <div className="space-y-4">
      {dbLoading && (
        <div className="text-center py-4 text-[0.8rem] text-slate-500 dark:text-slate-400 font-medium">
          <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-violet-600 dark:text-violet-400" />
          Загрузка истории оценок...
        </div>
      )}

      {project.aiVerdict && project.aiVerdict !== 'Нет данных' && !analysis && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`rounded-xl p-5 border shadow-xs ${getVerdictColor(project.aiVerdict)}`}>
          <div className="text-[0.75rem] uppercase tracking-wider mb-2 font-black flex items-center gap-2">
            <FileText className="w-4 h-4 flex-shrink-0" />Вердикт из файла ИИ-аналитики
          </div>
          <div className="text-[1.1rem] font-extrabold leading-snug">{project.aiVerdict}</div>
          {project.aiReasoning && (
            <div className="text-[0.88rem] mt-3 leading-relaxed opacity-95 border-t border-current/10 pt-2.5 whitespace-pre-wrap font-medium">
              {project.aiReasoning.split('\n').slice(0, 4).join('\n')}
              {project.aiReasoning.split('\n').length > 4 && '...'}
            </div>
          )}
        </motion.div>
      )}

      {(!project.aiVerdict || project.aiVerdict === 'Нет данных') && !dbReasoning && !analysis && (
        <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 text-center">
          <div className="text-[0.88rem] text-slate-600 dark:text-slate-400 font-bold">
            Вердикт: <span className="font-extrabold text-slate-800 dark:text-slate-200">Нет данных</span>
          </div>
          <div className="text-[0.78rem] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Загрузите файл ИИ-аналитики или запустите анализ обоснованности через DeepSeek
          </div>
        </div>
      )}

      {dbReasoning && !analysis && (() => {
        const parsed = parseAnalysisSections(dbReasoning.reasoning);
        const vColor = getVerdictColor(dbReasoning.verdict);
        return (
          <div className="space-y-4">
            {dbReasoning.verdict && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-xl p-5 border-2 shadow-xs ${vColor}`}>
                <div className="flex items-center gap-2 mb-2 font-black">
                  <Save className="w-4.5 h-4.5 flex-shrink-0" />
                  <span className="text-[0.75rem] uppercase tracking-wider">Сохраненная оценка проекта</span>
                </div>
                <div className="text-[1.15rem] font-extrabold leading-snug">{dbReasoning.verdict}</div>
              </motion.div>
            )}
            {parsed.reasoning && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-inner dark:shadow-none"
              >
                <div className="flex items-center gap-2 mb-3 border-b border-slate-200/50 dark:border-b-slate-700/30 pb-2">
                  <ClipboardList className="w-4.5 h-4.5 text-[#0369A1] dark:text-sky-400" />
                  <span className="text-[0.75rem] uppercase tracking-wider text-[#0369A1] dark:text-sky-400 font-extrabold">Обоснование оценки</span>
                </div>
                <div className="text-[0.9rem] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                  {parsed.reasoning}
                </div>
              </motion.div>
            )}
          </div>
        );
      })()}

      <motion.button 
        onClick={handleAnalyze} 
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-[0.88rem] font-bold border-none cursor-pointer hover:from-violet-700 hover:to-indigo-700 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
        whileHover={{ scale: 1.005 }} 
        whileTap={{ scale: 0.995 }}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Анализирую проект через DeepSeek...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {dbReasoning ? 'Перезапустить AI-анализ обоснованности' : 'Запустить AI-анализ обоснованности'}
          </>
        )}
      </motion.button>

      {analysis && (() => {
        const parsed = parseAnalysisSections(analysis);
        const verdictColor = getVerdictColor(parsed.verdict);
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
            {parsed.verdict && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-xl p-5 border-2 shadow-xs ${verdictColor}`}>
                <div className="flex items-center gap-2 mb-2 font-black">
                  <Gavel className="w-4.5 h-4.5 flex-shrink-0" />
                  <span className="text-[0.75rem] uppercase tracking-wider">Полученная оценка проекта</span>
                </div>
                <div className="text-[1.15rem] font-extrabold leading-snug">{parsed.verdict}</div>
              </motion.div>
            )}
            {parsed.reasoning && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }} 
                className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-5 border border-slate-200 dark:border-slate-700/50 shadow-inner dark:shadow-none"
              >
                <div className="flex items-center gap-2 mb-3 border-b border-slate-200/50 dark:border-b-slate-700/30 pb-2">
                  <ClipboardList className="w-4.5 h-4.5 text-[#0369A1] dark:text-sky-400" />
                  <span className="text-[0.75rem] uppercase tracking-wider text-[#0369A1] dark:text-sky-400 font-extrabold">Краткое обоснование оценки</span>
                </div>
                <div className="text-[0.9rem] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                  {parsed.reasoning}
                </div>
              </motion.div>
            )}
            {saved && (
              <div className="text-[0.78rem] text-emerald-700 dark:text-[#3da885] bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-bold">
                <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-[#3da885]" />
                Результаты анализа успешно сохранены в базе данных проекта
              </div>
            )}
            {!parsed.verdict && !parsed.reasoning && (
              <div className="text-[0.9rem] text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl shadow-inner dark:shadow-none">
                <pre className="whitespace-pre-wrap font-sans font-medium">{analysis}</pre>
              </div>
            )}
          </motion.div>
        );
      })()}

      {saving && (
        <div className="text-[0.8rem] text-slate-500 dark:text-slate-400 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/20 p-2 rounded-lg border border-slate-100 dark:border-slate-700/30">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
          Сохранение результатов в базу данных...
        </div>
      )}
      {saveError && (
        <div className="text-[0.8rem] text-rose-700 dark:text-[#ff4949] bg-rose-50 dark:bg-red-950/20 border border-rose-200 dark:border-red-900/40 rounded-lg px-4 py-3 font-medium">
          {saveError}
        </div>
      )}
    </div>
  );
}
