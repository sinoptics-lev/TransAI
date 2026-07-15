import { motion } from 'framer-motion';
import { Search, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react';

interface FilterPanelProps {
  departments: string[];
  deptFilter: string;
  onDeptFilterChange: (v: string) => void;
  aiTagFilter: 'all' | 'yes' | 'no';
  onAiTagFilterChange: (v: 'all' | 'yes' | 'no') => void;
  mingosFilter: 'all' | 'yes' | 'no';
  onMingosFilterChange: (v: 'all' | 'yes' | 'no') => void;
  efficiencyFilter: string;
  onEfficiencyFilterChange: (v: string) => void;
  hasEffectFilter: 'all' | 'yes' | 'no';
  onHasEffectFilterChange: (v: 'all' | 'yes' | 'no') => void;
  search: string;
  onSearchChange: (v: string) => void;
  onReset: () => void;
  onlyReduction: boolean;
  onOnlyReductionChange: (v: boolean) => void;
  filteredCount: number;
  totalCount: number;
}

const EFFICIENCY_CATEGORIES = [
  { key: 'all', label: 'Все проекты' },
  { key: 'exceptional', label: 'Исключительная (> 500 млн)' },
  { key: 'very_high', label: 'Очень высокая (100…500 млн)' },
  { key: 'high', label: 'Высокая (10…100 млн)' },
  { key: 'break_even', label: 'Окупаемость (0…10 млн)' },
  { key: 'small_loss', label: 'Незнач. убыток (-10…0 млн)' },
  { key: 'loss', label: 'Убыток (-100…-10 млн)' },
  { key: 'critical_loss', label: 'Критический убыток (< -100 млн)' },
];

export function FilterPanel({
  departments, deptFilter, onDeptFilterChange,
  aiTagFilter, onAiTagFilterChange,
  mingosFilter, onMingosFilterChange,
  efficiencyFilter, onEfficiencyFilterChange,
  hasEffectFilter, onHasEffectFilterChange,
  search, onSearchChange, onReset,
  onlyReduction, onOnlyReductionChange,
  filteredCount, totalCount,
}: FilterPanelProps) {
  return (
    <motion.div className="sticky top-0 z-[100] bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-[#e2e8f0] px-4 py-3 mb-5"
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Department filter */}
        <select className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-[0.85rem] bg-white min-w-[170px] focus:outline-none focus:ring-2 focus:ring-[#1a56db]"
          value={deptFilter} onChange={e => onDeptFilterChange(e.target.value)}>
          <option value="">Все ведомства</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* AI tag filter: Все / с ИИ / без ИИ */}
        <div className="flex bg-[#eef2ff] rounded-lg p-[3px] gap-[3px]">
          {([
            { key: 'all' as const, label: 'Все' },
            { key: 'yes' as const, label: 'с ИИ' },
            { key: 'no' as const, label: 'без ИИ' },
          ]).map(b => {
            const active = aiTagFilter === b.key;
            return <button key={b.key} onClick={() => onAiTagFilterChange(b.key)}
              className={`px-3 py-1.5 rounded-md text-[0.8rem] border-none cursor-pointer transition-all ${active ? 'bg-white text-[#4338ca] font-semibold shadow-sm' : 'bg-transparent text-[#718096] hover:text-[#1a202c]'}`}>{b.label}</button>;
          })}
        </div>

        {/* Mingos toggle */}
        <div className="flex bg-[#e2e8f0] rounded-lg p-[3px] gap-[3px]">
          {([
            { key: 'all' as const, label: 'Все' },
            { key: 'yes' as const, label: 'С Мингос' },
            { key: 'no' as const, label: 'Без Мингос' },
          ]).map(b => {
            const active = mingosFilter === b.key;
            return <button key={b.key} onClick={() => onMingosFilterChange(b.key as any)}
              className={`px-3 py-1.5 rounded-md text-[0.8rem] border-none cursor-pointer transition-all ${active ? 'bg-white text-[#1a202c] font-semibold shadow-sm' : 'bg-transparent text-[#718096] hover:text-[#1a202c]'}`}>{b.label}</button>;
          })}
        </div>

        {/* Efficiency filter */}
        <select className="px-3 py-2 border border-[#e2e8f0] rounded-lg text-[0.85rem] bg-white min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[#1a56db]"
          value={efficiencyFilter} onChange={e => onEfficiencyFilterChange(e.target.value)}>
          {EFFICIENCY_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        {/* Только финансы toggle */}
        <button onClick={() => onOnlyReductionChange(!onlyReduction)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.8rem] font-semibold border-none cursor-pointer transition-all ${onlyReduction ? 'bg-[#f0fdf4] text-[#0e9f6e] ring-1 ring-[#0e9f6e]' : 'bg-[#f0f4f8] text-[#718096] hover:text-[#1a202c] hover:bg-[#e2e8f0]'}`}>
          {onlyReduction ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}Только финансы
        </button>

        {/* Экономический эффект toggle */}
        <div className="flex bg-[#f3e8ff] rounded-lg p-[3px] gap-[3px]">
          {([
            { key: 'all' as const, label: 'Все' },
            { key: 'yes' as const, label: 'С эффектом' },
            { key: 'no' as const, label: 'Без эффекта' },
          ]).map(b => {
            const active = hasEffectFilter === b.key;
            return <button key={b.key} onClick={() => onHasEffectFilterChange(b.key as any)}
              className={`px-3 py-1.5 rounded-md text-[0.8rem] border-none cursor-pointer transition-all ${active ? 'bg-white text-[#7c3aed] font-semibold shadow-sm' : 'bg-transparent text-[#718096] hover:text-[#1a202c]'}`}>{b.label}</button>;
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#718096]" />
          <input type="text" className="w-full pl-9 pr-3 py-2 border border-[#e2e8f0] rounded-lg text-[0.85rem] bg-white focus:outline-none focus:ring-2 focus:ring-[#1a56db]"
            placeholder="Поиск по названию проекта..." value={search} onChange={e => onSearchChange(e.target.value)} />
        </div>

        {/* Reset */}
        <button onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 text-[0.8rem] font-semibold text-[#718096] bg-[#f0f4f8] rounded-lg border-none cursor-pointer hover:bg-[#e2e8f0] hover:text-[#1a202c] transition-colors">
          <RotateCcw className="w-3.5 h-3.5" />Сбросить
        </button>

        {/* Count badge */}
        <div className="text-[0.8rem] text-[#718096] ml-auto">
          <span className="font-bold text-[#1a202c]">{filteredCount}</span> / {totalCount}
        </div>
      </div>
    </motion.div>
  );
}
