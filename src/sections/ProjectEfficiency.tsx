import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  theme?: 'light' | 'dark';
}

function getEfficiencyBadge(delta: number) {
  if (delta > 500) return { label: 'Исключ.', color: 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' };
  if (delta > 100) return { label: 'Оч. выс.', color: 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' };
  if (delta > 10) return { label: 'Высок.', color: 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' };
  if (delta >= 0) return { label: 'Окуп.', color: 'bg-[#E3F2FD] text-[#0D47A1] border border-[#BBDEFB]' };
  if (delta > -10) return { label: 'Незн.уб.', color: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]' };
  if (delta > -100) return { label: 'Убыток', color: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]' };
  return { label: 'Крит.уб.', color: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]' };
}

function EfficiencyBar({ cat, maxPct, delay, isDark }: { key?: string; cat: EfficiencyCategory; maxPct: number; delay: number; isDark?: boolean }) {
  const displayWidth = maxPct > 0 ? (cat.pct / maxPct) * 100 : 0;
  // Ensure the bar is visible even with very low percentages (at least 6%) so the number inside is properly placed on top of its colored segment
  const width = cat.count > 0 ? Math.max(displayWidth, 6) : 0;
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

  // Vibrant, saturated colors for Dark Theme to stand out on the dark background
  const getDarkBarColor = (key: string): string => {
    switch (key) {
      case 'critical_loss':
      case 'loss':
      case 'small_loss':
        return '#FF4949'; // Rich, saturated red
      case 'break_even':
        return '#007BFF'; // Bright, vivid corporate blue
      case 'high':
        return '#26A69A'; // Luminous teal/mint
      case 'very_high':
        return '#43A047'; // Distinct shade of emerald green
      case 'exceptional':
        return '#2E7D32'; // Distinct deeper shade of emerald green
      default:
        return cat.color;
    }
  };

  const barColor = isDark ? getDarkBarColor(cat.key) : cat.color;
  const barBg = isDark ? '#242830' : cat.light;

  return (
    <motion.div
      className="flex items-center gap-4 mb-3 last:mb-0"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="w-[200px] text-right flex-shrink-0">
        <div className={`text-[0.85rem] font-bold ${isDark ? 'text-white' : 'contrast-text-main'}`}>{cat.label}</div>
        <div className={`text-[0.75rem] font-semibold ${isDark ? 'text-[#B0B0B0]' : 'contrast-text-muted'}`}>{cat.range}</div>
      </div>
      <div className="flex-1 h-[36px] rounded-lg relative" style={{ background: barBg }}>
        <div
          className="h-full flex items-center px-3 rounded-lg cursor-help relative"
          onMouseEnter={handleEnter}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{ background: barColor }}
            initial={{ width: '0%' }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 1, delay: delay + 0.1, ease: [0.4, 0, 0.2, 1] }}
          />
          <span className="relative z-10 text-white font-bold text-[0.9rem] whitespace-nowrap drop-shadow-sm pointer-events-none">
            {cat.count}
          </span>
        </div>
      </div>
      <div className="w-[90px] text-right flex-shrink-0 pl-2">
        <div className={`text-[1.05rem] font-bold ${isDark ? 'text-white' : 'contrast-text-main'}`}>{cat.pct}%</div>
        <div className={`text-[0.75rem] font-semibold ${isDark ? 'text-[#B0B0B0]' : 'contrast-text-muted'}`}>{cat.count} пр.</div>
      </div>
    </motion.div>
  );
}

export function ProjectEfficiency({ efficiencyData, allProjects, verdictFilter, onVerdictFilter, theme }: Props) {
  const isDark = theme === 'dark';
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
    {
      icon: <Target className="w-6 h-6 text-[#1B5E20] dark:text-[#34d399]" />,
      label: 'Окупаемые проекты',
      value: `${kpi.profitablePct}%`,
      sub: `${Math.round(kpi.profitablePct / 100 * kpi.totalProjects)} из ${kpi.totalProjects}`,
      bg: '#E8F5E9',
      borderColor: '#C8E6C9',
      textColor: '#1B5E20',
      labelColor: '#1B5E20',
      subColor: '#2E7D32',
      darkBg: 'rgba(16, 185, 129, 0.12)',
      darkBorder: 'rgba(16, 185, 129, 0.35)',
      darkText: '#34d399',
      darkLabel: '#34d399',
      darkSub: '#a7f3d0'
    },
    {
      icon: <TrendingDown className="w-6 h-6 text-[#C62828] dark:text-[#ff4949]" />,
      label: 'Убыточные проекты',
      value: `${kpi.lossPct}%`,
      sub: `${Math.round(kpi.lossPct / 100 * kpi.totalProjects)} из ${kpi.totalProjects}`,
      bg: '#FFEBEE',
      borderColor: '#FFCDD2',
      textColor: '#C62828',
      labelColor: '#C62828',
      subColor: '#D32F2F',
      darkBg: 'rgba(255, 73, 73, 0.12)',
      darkBorder: 'rgba(255, 73, 73, 0.35)',
      darkText: '#ff4949',
      darkLabel: '#ff4949',
      darkSub: '#fca5a5'
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-[#0D47A1] dark:text-[#60a5fa]" />,
      label: 'Средняя эффективность',
      value: `${kpi.avgDelta.toLocaleString('ru-RU')}`,
      sub: 'млн руб.',
      bg: '#E3F2FD',
      borderColor: '#BBDEFB',
      textColor: '#0D47A1',
      labelColor: '#0D47A1',
      subColor: '#1565C0',
      darkBg: 'rgba(59, 130, 246, 0.12)',
      darkBorder: 'rgba(59, 130, 246, 0.35)',
      darkText: '#60a5fa',
      darkLabel: '#60a5fa',
      darkSub: '#93c5fd'
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-[#F57F17] dark:text-[#fbbf24]" />,
      label: 'Высокая эффективность',
      value: `${kpi.highEfficiencyPct}%`,
      sub: `> 100 млн руб.`,
      bg: '#FFF8E1',
      borderColor: '#FFE082',
      textColor: '#F57F17',
      labelColor: '#F57F17',
      subColor: '#FF8F00',
      darkBg: 'rgba(245, 158, 11, 0.12)',
      darkBorder: 'rgba(245, 158, 11, 0.35)',
      darkText: '#fbbf24',
      darkLabel: '#fbbf24',
      darkSub: '#fde68a'
    },
  ], [kpi]);

  return (
    <>
      <CollapsibleSection title="Эффективность проектов (млн руб.)" delay={0.75} defaultOpen={true}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.label}
              className="rounded-xl p-4 shadow-sm border"
              style={{
                backgroundColor: isDark ? card.darkBg : card.bg,
                borderColor: isDark ? card.darkBorder : card.borderColor,
                borderTop: `4px solid ${isDark ? card.darkText : card.textColor}`
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
            >
              <div className="flex items-center gap-2 mb-2">
                {card.icon}
                <span className="text-[0.75rem] uppercase tracking-wider font-semibold" style={{ color: isDark ? card.darkLabel : card.labelColor }}>
                  {card.label}
                </span>
              </div>
              <div className="text-[1.5rem] font-bold" style={{ color: isDark ? card.darkText : card.textColor }}>
                {card.value}
              </div>
              <div className="text-[0.8rem]" style={{ color: isDark ? card.darkSub : card.subColor }}>
                {card.sub}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Distribution Histogram */}
        <div className="mb-6">
          <h3 className="text-[1rem] font-extrabold contrast-heading dark:text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-[18px] bg-[#1a56db] rounded-sm" />Распределение по эффективности
          </h3>
          {distribution.map((cat, i) => (<EfficiencyBar key={cat.key} cat={cat} maxPct={maxPct} delay={i * 0.04} isDark={isDark} />))}
        </div>

        {/* Top Projects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-[1rem] font-extrabold contrast-heading mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#1B5E20] dark:text-[#3da885]" />
              Топ-5 самых эффективных
            </h3>
            <div className="space-y-2">
              {topProfitable.map((p, i) => (
                <motion.div
                  key={p.name}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border"
                  style={{
                    background: isDark ? '#042f2c' : '#E8F5E9',
                    borderColor: isDark ? 'rgba(14, 159, 110, 0.35)' : '#C8E6C9'
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  onClick={() => handleProjectClick(p.name)}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border"
                    style={{
                      backgroundColor: isDark ? 'rgba(61, 168, 133, 0.15)' : '#ffffff',
                      borderColor: isDark ? 'rgba(61, 168, 133, 0.35)' : '#C8E6C9'
                    }}
                  >
                    <TrendingUp 
                      className="w-5 h-5" 
                      style={{ color: isDark ? '#3da885' : '#3CAEA3' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.85rem] font-bold contrast-text-main truncate">
                      {p.name}
                    </div>
                    <div className="text-[0.75rem] font-semibold contrast-text-muted">
                      {p.dept}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[1rem] font-extrabold text-[#1B5E20] dark:text-[#10b981]">
                      +{p.delta.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-[0.65rem] font-semibold contrast-text-muted">млн руб.</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[1rem] font-extrabold contrast-heading mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#C62828] dark:text-[#ff4949]" />
              Топ-5 убыточных
            </h3>
            <div className="space-y-2">
              {topLoss.map((p, i) => (
                <motion.div
                  key={p.name}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border"
                  style={{
                    background: isDark ? '#2c0b11' : '#FFEBEE',
                    borderColor: isDark ? 'rgba(255, 73, 73, 0.35)' : '#FFCDD2'
                  }}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
                  onClick={() => handleProjectClick(p.name)}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 73, 73, 0.15)' : '#ffffff',
                      borderColor: isDark ? 'rgba(255, 73, 73, 0.35)' : '#FFCDD2'
                    }}
                  >
                    <TrendingDown 
                      className="w-5 h-5" 
                      style={{ color: isDark ? '#ff4949' : '#E05A47' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.85rem] font-bold contrast-text-main truncate">
                      {p.name}
                    </div>
                    <div className="text-[0.75rem] font-semibold contrast-text-muted">
                      {p.dept}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[1rem] font-extrabold text-[#C62828] dark:text-[#ff4949]">
                      {p.delta.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-[0.65rem] font-semibold contrast-text-muted">млн руб.</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Verdict Recommendations */}
        <div className="mt-6">
          <h3 className="text-[1rem] font-extrabold contrast-heading mb-3 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-[#0e9f6e] dark:text-[#3da885]" />
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
              { 
                key: 'рекомендован к внедрению', 
                label: 'Рекомендован', 
                icon: CheckCircle2, 
                iconLightClass: 'text-[#1B5E20]',
                iconDarkClass: 'text-[#3da885]',
                bg: isDark ? 'rgba(14, 159, 110, 0.12)' : '#E8F5E9', 
                border: isDark ? 'rgba(14, 159, 110, 0.35)' : '#C8E6C9', 
                text: isDark ? '#3da885' : '#1B5E20' 
              },
              { 
                key: 'однозначно рекомендуется', 
                label: 'Однозначно рекомендуется', 
                icon: CheckCircle2, 
                iconLightClass: 'text-[#0F5132]',
                iconDarkClass: 'text-[#10b981]',
                bg: isDark ? 'rgba(16, 185, 129, 0.12)' : '#E8F5E9', 
                border: isDark ? 'rgba(16, 185, 129, 0.35)' : '#A5D6A7', 
                text: isDark ? '#10b981' : '#0F5132' 
              },
              { 
                key: 'рекомендуется с учетом социальной направленности', 
                label: 'Социальная направленность', 
                icon: ThumbsUp, 
                iconLightClass: 'text-[#7F4F00]',
                iconDarkClass: 'text-[#dca725]',
                bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFF8E1', 
                border: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FFE082', 
                text: isDark ? '#dca725' : '#7F4F00' 
              },
              { 
                key: 'рекомендуется с учетом внесения изменений', 
                label: 'С изменениями', 
                icon: AlertCircle, 
                iconLightClass: 'text-[#0D47A1]',
                iconDarkClass: 'text-[#1c64f2]',
                bg: isDark ? 'rgba(28, 100, 242, 0.12)' : '#E3F2FD', 
                border: isDark ? 'rgba(28, 100, 242, 0.35)' : '#BBDEFB', 
                text: isDark ? '#1c64f2' : '#0D47A1' 
              },
              { 
                key: 'не рекомендован к внедрению', 
                label: 'Не рекомендован', 
                icon: ThumbsDown, 
                iconLightClass: 'text-[#C62828]',
                iconDarkClass: 'text-[#ff4949]',
                bg: isDark ? 'rgba(255, 73, 73, 0.12)' : '#FFEBEE', 
                border: isDark ? 'rgba(255, 73, 73, 0.35)' : '#FFCDD2', 
                text: isDark ? '#ff4949' : '#C62828' 
              },
              { 
                key: 'не рекомендуется', 
                label: 'Не рекомендуется', 
                icon: ThumbsDown, 
                iconLightClass: 'text-[#C62828]',
                iconDarkClass: 'text-[#ff4949]',
                bg: isDark ? 'rgba(255, 73, 73, 0.12)' : '#FFEBEE', 
                border: isDark ? 'rgba(255, 73, 73, 0.35)' : '#FFCDD2', 
                text: isDark ? '#ff4949' : '#C62828' 
              },
              { 
                key: 'Нет данных', 
                label: 'Нет данных', 
                icon: HelpCircle, 
                iconLightClass: 'text-[#2D323A]',
                iconDarkClass: 'text-[#94a3b8]',
                bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#F5F5F5', 
                border: isDark ? 'rgba(148, 163, 184, 0.25)' : '#E2E8F0', 
                text: isDark ? '#94a3b8' : '#2D323A' 
              }
            ]
              .filter(cfg => (verdictStats.get(cfg.key) || 0) > 0)
              .map((cfg, i) => {
                const isActive = verdictFilter === cfg.key;
                const IconComponent = cfg.icon;
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
                      <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : isDark ? cfg.iconDarkClass : cfg.iconLightClass}`} />
                      <span className="text-[0.75rem] uppercase tracking-wider font-semibold" style={{ color: isActive ? '#fff' : cfg.text }}>{cfg.label}</span>
                    </div>
                    <div className="text-[1.5rem] font-bold" style={{ color: isActive ? '#fff' : cfg.text }}>{verdictStats.get(cfg.key)}</div>
                    <div className="text-[0.8rem] font-semibold" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : isDark ? 'rgba(255,255,255,0.6)' : '#1e293b' }}>
                      {Math.round((verdictStats.get(cfg.key)! / allProjects.length) * 100)}% от всех
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </div>

        <div className="mt-4 text-[0.8rem] contrast-text-muted bg-[#f8fafc] dark:bg-[#1e293b]/30 rounded-lg p-3 border border-transparent dark:border-slate-800/50">
          Дельта (экономическая) = Ожидаемые эффекты &minus; Затраты. Положительное значение означает окупаемость проекта.
        </div>
      </motion.div>

    </CollapsibleSection>

    {/* Detail Modal — 3 tabs, same as ProjectsTable */}
    {createPortal(
      <AnimatePresence>
        {modalProject && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-center items-center p-4 animate-fade-in"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setModalProject(null)}
          >
            <motion.div
              className="analytics-modal bg-white dark:bg-[#1A202E] rounded-2xl max-w-[720px] w-full max-h-[88vh] overflow-y-auto p-8 shadow-2xl dark:shadow-xl border-t-4 border-t-[#ff4949] border-x border-b border-slate-200/80 dark:border-[#2D3748] relative"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close Button & Title */}
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-b-0 pb-4 dark:pb-0">
                <div className="pr-6">
                  <span className="text-[0.7rem] uppercase tracking-wider text-[#ff4949] font-bold mb-1 block dark:hidden">Паспорт проекта</span>
                  <h3 className="analytics-modal-title text-[1.35rem] font-black text-slate-900 dark:text-white leading-snug tracking-tight">{modalProject.name}</h3>
                  {modalProject.link && (
                    <a href={modalProject.link} target="_blank" rel="noopener noreferrer" className="analytics-modal-link inline-flex items-center gap-1 text-[0.8rem] text-[#1a56db] dark:text-[#3b82f6] font-semibold hover:underline mt-1.5 break-all" onClick={e => e.stopPropagation()}>
                      Открыть в Редмайн →
                    </a>
                  )}
                </div>
                <button 
                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-full w-8 h-8 flex items-center justify-center border-none cursor-pointer transition-colors flex-shrink-0 text-[1.5rem] leading-none" 
                  onClick={() => setModalProject(null)}
                  title="Закрыть"
                >
                  &times;
                </button>
              </div>

              {/* Segmented Control Tabs */}
              <div className="flex gap-1 mb-6 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl p-1 border border-slate-200/40 dark:border-none">
                <button
                  onClick={() => setModalTab('main')}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-[0.8rem] font-bold border-none cursor-pointer transition-all duration-200 ${
                    modalTab === 'main' 
                      ? 'bg-white dark:bg-slate-700/80 text-slate-900 dark:text-white shadow-sm' 
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Основные данные
                </button>
                <button
                  onClick={() => setModalTab('ai')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.8rem] font-bold border-none cursor-pointer transition-all duration-200 ${
                    modalTab === 'ai' 
                      ? 'bg-white dark:bg-slate-700/80 text-[#ff4949] dark:text-[#a78bfa] shadow-sm' 
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-[#ff4949] dark:hover:text-[#a78bfa]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#ff4949] dark:text-inherit" />
                  ИИ Анализ
                </button>
                <button
                  onClick={() => setModalTab('reasoning')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.8rem] font-bold border-none cursor-pointer transition-all duration-200 ${
                    modalTab === 'reasoning' 
                      ? 'bg-white dark:bg-slate-700/80 text-[#0891b2] dark:text-[#22d3ee] shadow-sm' 
                      : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-[#0891b2] dark:hover:text-[#22d3ee]'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5 text-[#0891b2] dark:text-inherit" />
                  Доп. анализ
                </button>
              </div>

              {/* Main tab */}
              {modalTab === 'main' && (
                <div className="space-y-6">
                  {/* Grid of details */}
                  <div className="bg-slate-50/60 dark:bg-slate-800/35 rounded-xl border border-slate-200/60 dark:border-slate-700/50 p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Ведомство</div>
                        <div className="text-[0.95rem] font-bold text-slate-800 dark:text-slate-100">{modalProject.department}</div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Участие Мингос</div>
                        <div>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold border ${
                            modalProject.mingos === 'Да' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-[#3da885] dark:border-emerald-900/40' 
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700/40'
                          }`}>
                            {modalProject.mingos === 'Да' ? 'Да' : 'Нет'}
                          </span>
                        </div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Дата начала</div>
                        <div className="text-[0.9rem] font-semibold text-slate-700 dark:text-slate-300">{formatDate(modalProject.startDate)}</div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Дата окончания</div>
                        <div className="text-[0.9rem] font-semibold text-slate-700 dark:text-slate-300">{formatDate(modalProject.endDate)}</div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Высвобождение трудозатрат</div>
                        <div className="text-[0.95rem] font-bold text-slate-800 dark:text-slate-100">{modalProject.laborRelease.toLocaleString('ru-RU')} чел.</div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Затраты на проект</div>
                        <div className="text-[0.95rem] font-bold text-slate-800 dark:text-slate-100">{(modalProject.costTotal / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} млн руб.</div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Эффективность проекта</div>
                        <div className="text-[0.95rem] font-bold text-emerald-700 dark:text-[#3da885]">{modalProject.economicEffect.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</div>
                      </div>
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">Экономическая дельта</div>
                        <div className={`text-[0.95rem] font-bold ${
                          modalProject.delta >= 0 
                            ? 'text-emerald-700 dark:text-[#3da885]' 
                            : 'text-rose-600 dark:text-[#ff4949]'
                        }`}>
                          {modalProject.delta > 0 ? '+' : ''}{modalProject.delta.toLocaleString('ru-RU')} млн руб.
                        </div>
                      </div>
                    </div>
                    
                    {modalProject.effectAmount > 0 && (
                      <div className="border-b border-slate-200/40 pb-2.5">
                        <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-extrabold">{modalProject.effectType || 'Экономический эффект'}</div>
                        <div className="text-[0.95rem] font-bold text-violet-700 dark:text-[#c084fc]">{modalProject.effectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</div>
                      </div>
                    )}

                    <div className="pt-1.5">
                      <div className="text-[0.72rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-extrabold">Категория эффективности</div>
                      {(() => { 
                        const badge = getEfficiencyBadge(modalProject.delta); 
                        return <span className={`inline-block px-3 py-1 rounded-full text-[0.75rem] font-bold border ${badge.color}`}>{badge.label}</span>; 
                      })()}
                    </div>
                  </div>

                  {/* Text descriptions */}
                  {modalProject.effects && (
                    <div className="mb-4">
                      <div className="text-[0.75rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-bold">Эффекты проекта</div>
                      <div className="text-[0.9rem] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl shadow-inner dark:shadow-none">
                        {modalProject.effects}
                      </div>
                    </div>
                  )}
                  {modalProject.nonMaterialEffect && (
                    <div>
                      <div className="text-[0.75rem] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 font-bold">Нематериальный эффект</div>
                      <div className="text-[0.9rem] text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl shadow-inner dark:shadow-none">
                        {modalProject.nonMaterialEffect}
                      </div>
                    </div>
                  )}
                </div>
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
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}
