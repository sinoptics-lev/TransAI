import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/date';
import { AIAnalysisPanel } from '@/components/AIAnalysisPanel';
import type { Project } from '@/types/project';

interface Props {
  projects: Project[];
}

const PAGE_SIZE = 20;

type SortKey = 'name' | 'department' | 'mingos' | 'laborRelease' | 'economicEffect' | 'costTotal' | 'delta';

interface SortState {
  key: SortKey;
  asc: boolean;
}

function Pagination({ totalPages, currentPage, onPageChange }: { totalPages: number; currentPage: number; onPageChange: (p: number) => void }) {
  const siblings = 2;
  const range = [] as (number | '...')[];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - siblings && i <= currentPage + siblings)) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }

  return (
    <div className="flex gap-1.5 justify-center mt-4 flex-wrap">
      {currentPage > 1 && (
        <button
          className="px-3 py-1.5 rounded-md text-[0.85rem] border bg-card text-foreground border-border cursor-pointer hover:bg-muted transition-colors"
          onClick={() => onPageChange(currentPage - 1)}
        >
          ←
        </button>
      )}
      {range.map((item, i) =>
        item === '...' ? (
          <span key={`dots-${i}`} className="px-2 py-1.5 text-[0.85rem] text-muted-foreground">...</span>
        ) : (
          <button
            key={item}
            className={`px-3 py-1.5 rounded-md text-[0.85rem] border cursor-pointer transition-colors ${
              item === currentPage
                ? 'bg-mingos-red text-white border-mingos-red'
                : 'bg-card text-foreground border-border hover:bg-muted'
            }`}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        )
      )}
      {currentPage < totalPages && (
        <button
          className="px-3 py-1.5 rounded-md text-[0.85rem] border bg-card text-foreground border-border cursor-pointer hover:bg-muted transition-colors"
          onClick={() => onPageChange(currentPage + 1)}
        >
          →
        </button>
      )}
    </div>
  );
}

export function ProjectsTable({ projects }: Props) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ key: 'name', asc: true });
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [modalTab, setModalTab] = useState<'main' | 'ai'>('main');

  useEffect(() => {
    if (modalProject) setModalTab('main');
  }, [modalProject?.id]);

  const handleSort = useCallback((key: SortKey) => {
    setSort(prev => ({ key, asc: prev.key === key ? !prev.asc : true }));
    setPage(1);
  }, []);

  const sorted = useMemo(() => {
    const result = [...projects];
    result.sort((a, b) => {
      const { key, asc } = sort;
      let va: string | number;
      let vb: string | number;
      switch (key) {
        case 'name': va = a.name; vb = b.name; break;
        case 'department': va = a.department; vb = b.department; break;
        case 'mingos': va = a.mingos; vb = b.mingos; break;
        case 'laborRelease': va = a.laborRelease; vb = b.laborRelease; break;
        case 'economicEffect': va = a.effectAmount; vb = b.effectAmount; break;
        case 'costTotal': va = a.costTotal; vb = b.costTotal; break;
        case 'delta': va = a.delta; vb = b.delta; break;
        default: va = a.name; vb = b.name;
      }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase(); }
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
    return result;
  }, [projects, sort]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortIcon = ({ colKey }: { colKey: SortKey }) => (
    <span className={`ml-1 text-[0.7rem] opacity-50 ${sort.key === colKey ? 'opacity-100 text-mingos-red' : ''}`}>
      {sort.key === colKey ? (sort.asc ? '\u2191' : '\u2193') : '\u2195'}
    </span>
  );

  const getEfficiencyBadge = (delta: number) => {
    if (delta > 500) return { label: 'Исключ.', color: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300' };
    if (delta > 100) return { label: 'Оч. выс.', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' };
    if (delta > 10) return { label: 'Высок.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' };
    if (delta >= 0) return { label: 'Окуп.', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' };
    if (delta > -10) return { label: 'Незн.уб.', color: 'bg-red-50 text-red-400 dark:bg-red-950/30 dark:text-red-400' };
    if (delta > -100) return { label: 'Убыток', color: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' };
    return { label: 'Крит.уб.', color: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' };
  };

  return (
    <motion.section
      className="bg-card rounded-xl p-6 mb-5 shadow-sm border border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <h2 className="text-[1.1rem] font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-[22px] bg-mingos-red rounded-sm" />
        Проекты трансформации
        <span className="text-[0.8rem] font-normal text-muted-foreground ml-2">({projects.length} проектов)</span>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.85rem]">
          <thead>
            <tr>
              <th className="py-2.5 px-2 bg-muted font-semibold text-[0.75rem] uppercase text-muted-foreground tracking-wider text-center w-[40px]">#</th>
              {[
                { key: 'name' as SortKey, label: 'Проект', align: 'left' },
                { key: 'department' as SortKey, label: 'Ведомство', align: 'left' },
                { key: 'mingos' as SortKey, label: 'Мингос', align: 'center' },
                { key: 'laborRelease' as SortKey, label: 'Высвобождение (сокращение), чел.', align: 'right' },
                { key: 'economicEffect' as SortKey, label: 'Экономический эффект, млн руб.', align: 'right' },
                { key: 'costTotal' as SortKey, label: 'Затраты, млн руб.', align: 'right' },
                { key: 'delta' as SortKey, label: 'Эффективность', align: 'right' },
              ].map(col => (
                <th
                  key={col.key}
                  className={`py-2.5 px-3 bg-muted font-semibold text-[0.75rem] uppercase text-muted-foreground tracking-wider cursor-pointer select-none border-b border-border hover:bg-secondary ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} <SortIcon colKey={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {paginated.map((project, idx) => {
                const badge = getEfficiencyBadge(project.delta);
                return (
                  <motion.tr
                    key={project.id}
                    className="border-b border-border hover:bg-muted cursor-pointer transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    onClick={() => setModalProject(project)}
                  >
                    <td className="py-2.5 px-2 text-center text-[0.8rem] text-muted-foreground font-medium">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-foreground hover:text-mingos-red transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        {project.name}
                      </a>
                    </td>
                    <td className="py-2.5 px-3">{project.department}</td>
                    <td className="py-2.5 px-3 text-center">
                      {project.mingos === 'Да' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Да</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">Нет</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">{project.laborRelease.toLocaleString('ru-RU')}{(project.reductionPlan > 0 ? `(${project.reductionPlan.toLocaleString('ru-RU')})` : '')}</td>
                    <td className="py-2.5 px-3 text-right">{project.effectAmount > 0 ? project.effectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</td>
                    <td className="py-2.5 px-3 text-right">{(project.costTotal / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-semibold ${badge.color}`}>
                        {badge.label} ({project.delta > 0 ? '+' : ''}{project.delta.toLocaleString('ru-RU')})
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {paginated.length === 0 && (
        <div className="text-center text-muted-foreground py-8">Нет проектов для отображения</div>
      )}

      {totalPages > 1 && (
        <Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} />
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {modalProject && (
          <motion.div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={() => setModalProject(null)}>
            <motion.div className="bg-card rounded-2xl max-w-[700px] w-full max-h-[85vh] overflow-y-auto p-8 shadow-xl border border-border"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}>
              {/* Modal header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[1.25rem] font-bold text-foreground">{modalProject.name}</h3>
                  <p className="text-[0.85rem] text-muted-foreground mt-1">{modalProject.department}</p>
                </div>
                <button onClick={() => setModalProject(null)} className="text-muted-foreground hover:text-foreground text-[1.5rem] leading-none">&times;</button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4 border-b border-border">
                <button onClick={() => setModalTab('main')} className={`px-4 py-2 text-[0.9rem] font-medium border-b-2 transition-colors ${modalTab === 'main' ? 'border-mingos-red text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Основное</button>
                {modalProject.aiAnalysis && (
                  <button onClick={() => setModalTab('ai')} className={`px-4 py-2 text-[0.9rem] font-medium border-b-2 transition-colors flex items-center gap-1 ${modalTab === 'ai' ? 'border-mingos-red text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <Sparkles className="w-4 h-4" />ИИ-анализ
                  </button>
                )}
              </div>

              {modalTab === 'main' ? (
                <div className="space-y-3 text-[0.9rem]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Статус</div><div className="font-semibold text-foreground">{modalProject.dbStatus || '—'}</div></div>
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Руководство</div><div className="font-semibold text-foreground">{modalProject.dbLeader || '—'}</div></div>
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Мингос</div><div className={`font-semibold ${modalProject.mingos === 'Да' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{modalProject.mingos}</div></div>
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Срок</div><div className="font-semibold text-foreground">{modalProject.endDate || '—'}</div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Затраты</div><div className="font-semibold text-foreground">{(modalProject.costTotal / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</div></div>
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Дельта</div><div className={`font-semibold ${modalProject.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{modalProject.delta > 0 ? '+' : ''}{modalProject.delta.toLocaleString('ru-RU')} млн руб.</div></div>
                  </div>
                  {modalProject.effectAmount > 0 && (
                    <div className="bg-violet-50 dark:bg-violet-950/20 rounded-lg p-3 border border-violet-200 dark:border-violet-800">
                      <div className="text-[0.75rem] text-violet-600 dark:text-violet-400 uppercase tracking-wider font-semibold">Экономический эффект</div>
                      <div className="font-semibold text-foreground">{modalProject.effectType}: {modalProject.effectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</div>
                    </div>
                  )}
                  {modalProject.effects && (
                    <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Эффекты</div><div className="text-foreground whitespace-pre-line">{modalProject.effects}</div></div>
                  )}
                  {modalProject.createdDate && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Дата создания</div><div className="font-semibold text-foreground">{modalProject.createdDate}</div></div>
                      <div className="bg-muted rounded-lg p-3"><div className="text-[0.75rem] text-muted-foreground uppercase tracking-wider font-semibold">Дата изменения</div><div className="font-semibold text-foreground">{modalProject.updatedDate || '—'}</div></div>
                    </div>
                  )}
                  <a href={modalProject.link} target="_blank" rel="noopener noreferrer" className="inline-block text-mingos-red hover:underline text-[0.85rem]">Открыть в РМ →</a>
                </div>
              ) : (
                <AIAnalysisPanel analysis={modalProject.aiAnalysis!} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
