import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, Target, Sparkles, Brain, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { useTooltip } from '@/components/TooltipContext';
import { formatDate } from '@/lib/date';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';
import type { EfficiencyData, EfficiencyCategory, Project } from '@/types/project';

interface Props {
  efficiencyData: EfficiencyData;
  allProjects: Project[];
  verdictFilter: string;
  onVerdictFilter: (verdict: string) => void;
}

function getEfficiencyBadge(delta: number) {
  if (delta > 500) return { label: 'Исключ.', color: 'bg-[#bbf7d0] text-[#15803d]' };
  if (delta > 100) return { label: 'Оч. выс.', color: 'bg-[#dcfce7] text-[#16a34a]' };
  if (delta > 10) return { label: 'Высок.', color: 'bg-[#f0fdf4] text-[#22c55e]' };
  if (delta >= 0) return { label: 'Окуп.', color: 'bg-[#eff6ff] text-[#2563eb]' };
  if (delta > -10) return { label: 'Незн.уб.', color: 'bg-[#fef2f2] text-[#f87171]' };
  if (delta > -100) return { label: 'Убыток', color: 'bg-[#fee2e2] text-[#dc2626]' };
  return { label: 'Крит.уб.', color: 'bg-[#fee2e2] text-[#7f1d1d]' };
}

function EfficiencyBar({ cat, maxPct, delay }: { cat: EfficiencyCategory; maxPct: number; delay: number }) {
  const width = maxPct > 0 ? (cat.pct / maxPct) * 100 : 0;
  const tooltip = useTooltip();

  const handleEnter = (e: React.MouseEvent) => {
    tooltip.show(
      `${cat.label}: ${cat.count} проектов (${cat.pct}%), суммарная дельта ${cat.totalDelta.toLocaleString('ru-RU')} млн руб.`,
      e.clientX,
      e.clientY
    );
  };
  const handleMove = (e: React.MouseEvent) => tooltip.move(e.clientX, e.clientY);
  const handleLeave = () => tooltip.hide();

  return (
    <motion.div
      className="flex items-center gap-3 mb-3 last:mb-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="w-[200px] text-right flex-shrink-0">
        <div className="text-[0.85rem] font-semibold text-[#1a202c]">{cat.label}</div>
        <div className="text-[0.75rem] text-[#718096]">{cat.range}</div>
      </div>
      <div className="flex-1 h-[36px] rounded-lg relative" style={{ background: cat.light }}>
        <div
          className="h-full flex items-center px-3 rounded-lg cursor-help relative"
          onMouseEnter={handleEnter}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{ background: cat.color }}
            initial={{ width: '0%' }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 1, delay: delay + 0.1, ease: [0.4, 0, 0.2, 1] }}
          />
          <span className="relative z-10 text-white font-bold text-[0.9rem] whitespace-nowrap drop-shadow-sm pointer-events-none">
            {cat.count}
          </span>
        </div>
      </div>
      <div className="w-[80px] text-right flex-shrink-0">
        <div className="text-[1rem] font-extrabold text-[#1a202c]">{cat.pct}%</div>
        <div className="text-[0.75rem] text-[#718096]">{cat.count} пр.</div>
      </div>
    </motion.div>
  );
}

export function ProjectEfficiency({ efficiencyData, allProjects, verdictFilter, onVerdictFilter }: Props) {
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [modalTab, setModalTab] = useState<'main' | 'ai' | 'reasoning'>('main');

  useEffect(() => {
    if (modalProject) setModalTab('main');
  }, [modalProject?.id]);

  const { kpi, distribution, topProfitable, topLoss } = efficiencyData;
  const maxPct = Math.max(...distribution.map(d => d.pct));

  // Verdict stats from allProjects
  const verdictStats = useMemo(() => {
    const map = new Map<string, number>();
    allProjects.forEach(p => {
      const v = p.aiVerdict || 'Нет данных';
      map.set(v, (map.get(v) || 0) + 1);
    });
    // Always ensure 'Нет данных' entry exists
    if (!map.has('Нет данных')) {
      map.set('Нет данных', 0);
    }
    console.log('[Verdict] Stats:', Object.fromEntries(map));
    return map;
  }, [allProjects]);

  const handleProjectClick = (projectName: string) => {
    const found = allProjects.find(p => p.name === projectName);
    if (found) setModalProject(found);
  };

  const kpiCards = useMemo(() => [
    { icon: <Target className="w-6 h-6 text-[#0e9f6e]" />, label: 'Окупаемые проекты', value: `${kpi.profitablePct}%`, sub: `${Math.round(kpi.profitablePct / 100 * kpi.totalProjects)} из ${kpi.totalProjects}`, border: '#0e9f6e' },
    { icon: <TrendingDown className="w-6 h-6 text-[#e02424]" />, label: 'Убыточные проекты', value: `${kpi.lossPct}%`, sub: `${Math.round(kpi.lossPct / 100 * kpi.totalProjects)} из ${kpi.totalProjects}`, border: '#e02424' },
    { icon: <BarChart3 className="w-6 h-6 text-[#1a56db]" />, label: 'Средняя эффективность', value: `${kpi.avgDelta.toLocaleString('ru-RU')}`, sub: 'млн руб.', border: '#1a56db' },
    { icon: <TrendingUp className="w-6 h-6 text-[#f59e0b]" />, label: 'Высокая эффективность', value: `${kpi.highEfficiencyPct}%`, sub: `> 100 млн руб.`, border: '#f59e0b' },
  ], [kpi]);

  return (
    <CollapsibleSection title="Эффективность проектов (млн руб.)" delay={0.75} defaultOpen={true}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpiCards.map((card, i) => (
            <motion.div key={card.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100" style={{ borderTop: `4px solid ${card.border}` }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}>
              <div className="flex items-center gap-2 mb-2">{card.icon}<span className="text-[0.75rem] uppercase tracking-wider text-[#718096] font-semibold">{card.label}</span></div>
              <div className="text-[1.5rem] font-bold text-[#1a202c]">{card.value}</div>
              <div className="text-[0.8rem] text-[#718096]">{card.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Distribution Histogram */}
        <div className="mb-6">
          <h3 className="text-[1rem] font-bold text-[#1a202c] mb-4 flex items-center gap-2">
            <span className="w-1 h-[18px] bg-[#1a56db] rounded-sm" />Распределение по эффективности
          </h3>
          {distribution.map((cat, i) => (<EfficiencyBar key={cat.key} cat={cat} maxPct={maxPct} delay={i * 0.04} />))}
        </div>

        {/* Top Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-[1rem] font-bold text-[#1a202c] mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#0e9f6e]" />Топ-5 самых эффективных</h3>
            <div className="space-y-2">
              {topProfitable.map((p, i) => (
                <motion.div key={p.name} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5" style={{ background: '#f0fdf4' }}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  onClick={() => handleProjectClick(p.name)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                  <div className="flex-1 min-w-0"><div className="text-[0.85rem] font-semibold text-[#1a202c] truncate">{p.name}</div><div className="text-[0.75rem] text-[#718096]">{p.dept}</div></div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[1rem] font-extrabold text-green-700">+{p.delta.toLocaleString('ru-RU')}</div>
                    <div className="text-[0.65rem] text-[#718096]">млн руб.</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[1rem] font-bold text-[#1a202c] mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-[#e02424]" />Топ-5 убыточных</h3>
            <div className="space-y-2">
              {topLoss.map((p, i) => (
                <motion.div key={p.name} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5" style={{ background: '#fef2f2' }}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  onClick={() => handleProjectClick(p.name)}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-100"><TrendingDown className="w-5 h-5 text-red-500" /></div>
                  <div className="flex-1 min-w-0"><div className="text-[0.85rem] font-semibold text-[#1a202c] truncate">{p.name}</div><div className="text-[0.75rem] text-[#718096]">{p.dept}</div></div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[1rem] font-extrabold text-red-600">{p.delta.toLocaleString('ru-RU')}</div>
                    <div className="text-[0.65rem] text-[#718096]">млн руб.</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Verdict Recommendations */}
        <div className="mt-6">
          <h3 className="text-[1rem] font-bold text-[#1a202c] mb-3 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-[#0e9f6e]" />
            Рекомендации ИИ по внедрению (проекты)
            {verdictFilter !== 'all' && (
              <button
                onClick={() => onVerdictFilter('all')}
                className="ml-2 text-[0.7rem] px-2 py-0.5 rounded-full bg-[#1a56db] text-white hover:bg-[#1e40af] transition-colors cursor-pointer border-none"
              >
                Сбросить фильтр ✕
              </button>
            )}
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'рекомендован к внедрению', label: 'Рекомендован', icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
              { key: 'однозначно рекомендуется', label: 'Однозначно рекомендуется', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, bg: '#ecfdf5', border: '#a7f3d0', text: '#047857' },
              { key: 'рекомендуется с учетом социальной направленности', label: 'Социальная направленность', icon: <ThumbsUp className="w-5 h-5 text-amber-600" />, bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
              { key: 'рекомендуется с учетом внесения изменений', label: 'С изменениями', icon: <AlertCircle className="w-5 h-5 text-blue-600" />, bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
              { key: 'не рекомендован к внедрению', label: 'Не рекомендован', icon: <ThumbsDown className="w-5 h-5 text-red-600" />, bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
              { key: 'не рекомендуется', label: 'Не рекомендуется', icon: <ThumbsDown className="w-5 h-5 text-red-600" />, bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
              { key: 'Нет данных', label: 'Нет данных', icon: <HelpCircle className="w-5 h-5 text-gray-500" />, bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' },
            ]
              .filter(cfg => (verdictStats.get(cfg.key) || 0) > 0)
              .map((cfg, i) => {
                const isActive = verdictFilter === cfg.key;
                return (
                  <motion.div
                    key={cfg.key}
                    className="rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md select-none flex-1 min-w-[140px]"
                    style={{
                      background: isActive ? cfg.text : cfg.bg,
                      borderColor: cfg.border,
                      transform: isActive ? 'scale(1.02)' : undefined,
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onClick={() => onVerdictFilter(isActive ? 'all' : cfg.key)}
                    title={`Фильтровать проекты: ${cfg.label}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {cfg.icon}
                      <span className="text-[0.75rem] uppercase tracking-wider font-semibold" style={{ color: isActive ? '#fff' : cfg.text }}>{cfg.label}</span>
                    </div>
                    <div className="text-[1.5rem] font-bold" style={{ color: isActive ? '#fff' : cfg.text }}>{verdictStats.get(cfg.key)}</div>
                    <div className="text-[0.8rem]" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : '#718096' }}>
                      {Math.round((verdictStats.get(cfg.key)! / allProjects.length) * 100)}% от всех
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>

        <div className="mt-4 text-[0.8rem] text-[#718096] bg-[#f8fafc] rounded-lg p-3">
          Дельта (экономическая) = Ожидаемые эффекты &minus; Затраты. Положительное значение означает окупаемость проекта.
        </div>
      </motion.div>

      {/* Detail Modal — 3 tabs, same as ProjectsTable */}
      <AnimatePresence>
        {modalProject && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => setModalProject(null)}>
            <motion.div className="bg-white rounded-2xl max-w-[700px] w-full max-h-[85vh] overflow-y-auto p-8 shadow-xl"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-5">
                <div className="pr-4">
                  <h3 className="text-[1.3rem] font-bold text-[#1a202c]">{modalProject.name}</h3>
                  {modalProject.link && (
                    <a href={modalProject.link} target="_blank" rel="noopener noreferrer" className="text-[0.8rem] text-[#1a56db] hover:underline break-all" onClick={e => e.stopPropagation()}>Открыть в РМ &rarr;</a>
                  )}
                </div>
                <button className="bg-none border-none text-[1.5rem] text-[#718096] cursor-pointer leading-none hover:text-[#1a202c] transition-colors flex-shrink-0" onClick={() => setModalProject(null)}>&times;</button>
              </div>

              {/* Tabs — always show all 3 */}
              <div className="flex gap-1 mb-5 bg-[#f0f4f8] rounded-lg p-1">
                <button onClick={() => setModalTab('main')} className={`flex-1 px-3 py-2 rounded-md text-[0.8rem] font-semibold border-none cursor-pointer transition-all ${modalTab === 'main' ? 'bg-white text-[#1a202c] shadow-sm' : 'bg-transparent text-[#718096] hover:text-[#1a202c]'}`}>Основные данные</button>
                <button onClick={() => setModalTab('ai')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.8rem] font-semibold border-none cursor-pointer transition-all ${modalTab === 'ai' ? 'bg-white text-[#7c3aed] shadow-sm' : 'bg-transparent text-[#718096] hover:text-[#7c3aed]'}`}><Sparkles className="w-3.5 h-3.5" />ИИ Анализ</button>
                <button onClick={() => setModalTab('reasoning')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[0.8rem] font-semibold border-none cursor-pointer transition-all ${modalTab === 'reasoning' ? 'bg-white text-[#0891b2] shadow-sm' : 'bg-transparent text-[#718096] hover:text-[#0891b2]'}`}><Brain className="w-3.5 h-3.5" />Доп. анализ</button>
              </div>

              {/* Main tab */}
              {modalTab === 'main' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Ведомство</div><div className="text-[1.1rem] font-semibold text-[#1a202c]">{modalProject.department}</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Участие Мингос</div><div className="text-[1.1rem] font-semibold text-[#1a202c]">{modalProject.mingos === 'Да' ? 'Да' : 'Нет'}</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Дата начала</div><div className="text-[0.95rem] text-[#1a202c]">{formatDate(modalProject.startDate)}</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Дата окончания</div><div className="text-[0.95rem] text-[#1a202c]">{formatDate(modalProject.endDate)}</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Высвобождение трудозатрат</div><div className="text-[1.1rem] font-semibold text-[#1a202c]">{modalProject.laborRelease.toLocaleString('ru-RU')} чел.</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Затраты на проект</div><div className="text-[1.1rem] font-semibold text-[#1a202c]">{(modalProject.costTotal / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} млн руб.</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Эффективность проекта</div><div className="text-[1.1rem] font-semibold text-[#0e9f6e]">{modalProject.economicEffect.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</div></div>
                    {modalProject.effectAmount > 0 && (
                      <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">{modalProject.effectType || 'Экономический эффект'}</div><div className="text-[1.1rem] font-semibold text-[#7c3aed]">{modalProject.effectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</div></div>
                    )}
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Экономическая дельта</div><div className={`text-[1.1rem] font-semibold ${modalProject.delta >= 0 ? 'text-[#0e9f6e]' : 'text-[#e02424]'}`}>{modalProject.delta > 0 ? '+' : ''}{modalProject.delta.toLocaleString('ru-RU')} млн руб.</div></div>
                    <div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Категория эффективности</div>
                      {(() => { const badge = getEfficiencyBadge(modalProject.delta); return <span className={`inline-block px-2 py-0.5 rounded-full text-[0.75rem] font-semibold ${badge.color}`}>{badge.label}</span>; })()}
                    </div>
                  </div>
                  {modalProject.effects && (<div className="mb-4"><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Эффекты проекта</div><div className="text-[0.9rem] text-[#1a202c] leading-relaxed whitespace-pre-wrap bg-[#f8fafc] p-4 rounded-lg">{modalProject.effects}</div></div>)}
                  {modalProject.nonMaterialEffect && (<div><div className="text-[0.75rem] uppercase tracking-wider text-[#718096] mb-1 font-semibold">Нематериальный эффект</div><div className="text-[0.9rem] text-[#1a202c] leading-relaxed whitespace-pre-wrap bg-[#f8fafc] p-4 rounded-lg">{modalProject.nonMaterialEffect}</div></div>)}
                </>
              )}

              {/* AI Data tab */}
              {modalTab === 'ai' && modalProject && (
                <AIAnalysisPanel project={modalProject} activeTab="ai" />
              )}

              {/* Reasoning (DeepSeek) tab */}
              {modalTab === 'reasoning' && modalProject && (
                <AIAnalysisPanel project={modalProject} activeTab="reasoning" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CollapsibleSection>
  );
}
