import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain } from 'lucide-react';
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
          className="px-3 py-1.5 rounded-md text-[0.85rem] border bg-white text-[#1a202c] border-[#e2e8f0] cursor-pointer hover:bg-[#f0f4f8] transition-colors"
          onClick={() => onPageChange(currentPage - 1)}
        >
          ←
        </button>
      )}
      {range.map((item, i) =>
        item === '...' ? (
          <span key={`dots-${i}`} className="px-2 py-1.5 text-[0.85rem] text-[#718096]">...</span>
        ) : (
          <button
            key={item}
            className={`px-3 py-1.5 rounded-md text-[0.85rem] border cursor-pointer transition-colors ${
              item === currentPage
                ? 'bg-[#1a56db] text-white border-[#1a56db]'
                : 'bg-white text-[#1a202c] border-[#e2e8f0] hover:bg-[#f0f4f8]'
            }`}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        )
      )}
      {currentPage < totalPages && (
        <button
          className="px-3 py-1.5 rounded-md text-[0.85rem] border bg-white text-[#1a202c] border-[#e2e8f0] cursor-pointer hover:bg-[#f0f4f8] transition-colors"
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
  const [modalTab, setModalTab] = useState<'main' | 'ai' | 'reasoning'>('main');

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
    <span className={`ml-1 text-[0.7rem] opacity-50 ${sort.key === colKey ? 'opacity-100 text-[#1a56db]' : ''}`}>
      {sort.key === colKey ? (sort.asc ? '↑' : '↓') : '↕'}
    </span>
  );

  const getEfficiencyBadge = (delta: number) => {
    if (delta > 500) return { label: 'Исключ.', color: 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' };
    if (delta > 100) return { label: 'Оч. выс.', color: 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' };
    if (delta > 10) return { label: 'Высок.', color: 'bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]' };
    if (delta >= 0) return { label: 'Окуп.', color: 'bg-[#E3F2FD] text-[#0D47A1] border border-[#BBDEFB]' };
    if (delta > -10) return { label: 'Незн.уб.', color: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]' };
    if (delta > -100) return { label: 'Убыток', color: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]' };
    return { label: 'Крит.уб.', color: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]' };
  };

  return (
    <>
      <motion.section
        className="bg-white rounded-xl p-6 mb-5 shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
      <h2 className="text-[1.1rem] font-bold text-[#2D323A] mb-4 flex items-center gap-2">
        <span className="w-1 h-[22px] bg-[#1a56db] rounded-sm" />
        Проекты трансформации
        <span className="text-[0.8rem] font-normal text-[#555E6B] ml-2">({projects.length} проектов)</span>
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.85rem]">
          <thead>
            <tr>
              <th className="py-2.5 px-2 bg-[#f0f4f8] font-semibold text-[0.75rem] uppercase text-[#555E6B] tracking-wider text-center w-[40px]">#</th>
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
                  className={`py-2.5 px-3 bg-[#f0f4f8] font-semibold text-[0.75rem] uppercase text-[#555E6B] tracking-wider cursor-pointer select-none border-b border-[#e2e8f0] hover:bg-[#e2e8f0] ${
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
                    className="border-b border-[#e2e8f0] hover:bg-[#f0f4f8] cursor-pointer transition-colors"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: idx * 0.02 }}
                    onClick={() => setModalProject(project)}
                  >
                    <td className="py-2.5 px-2 text-center text-[0.8rem] text-[#555E6B] font-medium">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#2D323A] hover:text-[#1a56db] transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        {project.name}
                      </a>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#2D323A]">{project.department}</td>
                    <td className="py-2.5 px-3 text-center">
                      {project.mingos === 'Да' ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-[#E8F5E9] text-[#1B5E20] border border-[#C8E6C9]">Да</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">Нет</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#2D323A]">{project.laborRelease.toLocaleString('ru-RU')}{(project.reductionPlan > 0 ? `(${project.reductionPlan.toLocaleString('ru-RU')})` : '')}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#2D323A]">{project.effectAmount > 0 ? project.effectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-[#2D323A]">{(project.costTotal / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
        <div className="text-center py-8 text-[#718096]">Проекты не найдены</div>
      )}

      {totalPages > 1 && (
        <Pagination totalPages={totalPages} currentPage={page} onPageChange={setPage} />
      )}
    </motion.section>

    {/* Modal */}
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
