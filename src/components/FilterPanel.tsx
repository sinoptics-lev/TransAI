import { motion } from 'framer-motion';
import { Search, RotateCcw, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';

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
  theme?: 'light' | 'dark';
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
  theme = 'light',
}: FilterPanelProps) {

  // ==================== DARK THEME LAYOUT ====================
  if (theme === 'dark') {
    return (
      <motion.div 
        className="sticky top-0 z-[100] bg-[#1a1d21]/95 backdrop-blur-md rounded-xl shadow-lg border border-[#3e4654]/65 px-4 py-3.5 mb-5"
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex flex-col gap-3">
          {/* Row 1 */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Department filter dropdown with custom arrow */}
            <div className="relative min-w-[210px] h-[36px] flex-1 sm:flex-initial">
              <select 
                className="w-full h-full pl-3 pr-8 bg-[#1e2227] text-slate-200 border border-[#3e4654] rounded-lg text-[0.82rem] font-semibold outline-none cursor-pointer appearance-none focus:border-[#ff4949]/50 focus:ring-1 focus:ring-[#ff4949]/20"
                value={deptFilter} 
                onChange={e => onDeptFilterChange(e.target.value)}
              >
                <option value="" className="bg-[#1e2227] text-slate-200">Все ведомства</option>
                {departments.map(d => (
                  <option key={d} value={d} className="bg-[#1e2227] text-slate-200">{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* AI tag filter: Все / с ИИ / без ИИ */}
            <div className="flex bg-[#1e2227] border border-[#3e4654] rounded-lg p-[3px] gap-[3px] h-[36px] items-center">
              {([
                { key: 'all' as const, label: 'Все' },
                { key: 'yes' as const, label: 'с ИИ' },
                { key: 'no' as const, label: 'без ИИ' },
              ]).map(b => {
                const active = aiTagFilter === b.key;
                return (
                  <button 
                    key={b.key} 
                    onClick={() => onAiTagFilterChange(b.key)}
                    className={`h-full px-3.5 rounded-md text-[0.8rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center ${
                      active 
                        ? 'bg-[#ff4949] text-white shadow-[0_0_12px_rgba(255,73,73,0.45)]' 
                        : 'bg-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Mingos filter: Все / С Мингос / Без Мингос */}
            <div className="flex bg-[#1e2227] border border-[#3e4654] rounded-lg p-[3px] gap-[3px] h-[36px] items-center">
              {([
                { key: 'all' as const, label: 'Все' },
                { key: 'yes' as const, label: 'С Мингос' },
                { key: 'no' as const, label: 'Без Мингос' },
              ]).map(b => {
                const active = mingosFilter === b.key;
                return (
                  <button 
                    key={b.key} 
                    onClick={() => onMingosFilterChange(b.key)}
                    className={`h-full px-3.5 rounded-md text-[0.8rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center ${
                      active 
                        ? 'bg-[#ff4949] text-white shadow-[0_0_12px_rgba(255,73,73,0.45)]' 
                        : 'bg-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Efficiency filter dropdown with custom arrow */}
            <div className="relative min-w-[190px] h-[36px] flex-1 sm:flex-initial">
              <select 
                className="w-full h-full pl-3 pr-8 bg-[#1e2227] text-slate-200 border border-[#3e4654] rounded-lg text-[0.82rem] font-semibold outline-none cursor-pointer appearance-none focus:border-[#ff4949]/50 focus:ring-1 focus:ring-[#ff4949]/20"
                value={efficiencyFilter} 
                onChange={e => onEfficiencyFilterChange(e.target.value)}
              >
                {EFFICIENCY_CATEGORIES.map(c => (
                  <option key={c.key} value={c.key} className="bg-[#1e2227] text-slate-200">{c.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Только финансы toggle with Ruble icon */}
            <button 
              onClick={() => onOnlyReductionChange(!onlyReduction)}
              className={`flex items-center gap-2 px-3.5 h-[36px] rounded-lg text-[0.8rem] font-bold border cursor-pointer transition-all ${
                onlyReduction 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                  : 'bg-[#1e2227] border-[#3e4654] text-slate-300 hover:bg-[#22272e] hover:text-white'
              }`}
            >
              <svg 
                className={`w-4 h-4 flex-shrink-0 transition-colors ${onlyReduction ? 'text-emerald-400' : 'text-slate-400'}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M8 20V4" />
                <path d="M8 4h6a4 4 0 0 1 0 8H8" />
                <path d="M5 12h10" />
                <path d="M5 16h8" />
              </svg>
              Только финансы
            </button>

          </div>

          {/* Row 2 */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Has economic effect filter: Все / С эффектом / Без эффекта */}
            <div className="flex bg-[#1e2227] border border-[#3e4654] rounded-lg p-[3px] gap-[3px] h-[36px] items-center">
              {([
                { key: 'all' as const, label: 'Все' },
                { key: 'yes' as const, label: 'С эффектом' },
                { key: 'no' as const, label: 'Без эффекта' },
              ]).map(b => {
                const active = hasEffectFilter === b.key;
                return (
                  <button 
                    key={b.key} 
                    onClick={() => onHasEffectFilterChange(b.key)}
                    className={`h-full px-3.5 rounded-md text-[0.8rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center ${
                      active 
                        ? 'bg-[#ff4949] text-white shadow-[0_0_12px_rgba(255,73,73,0.45)]' 
                        : 'bg-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] h-[36px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                className="w-full h-full pl-9 pr-3 bg-[#1e2227] text-slate-200 placeholder-slate-500 border border-[#3e4654] rounded-lg text-[0.82rem] font-medium outline-none focus:border-[#ff4949]/50 focus:ring-1 focus:ring-[#ff4949]/20 transition-all"
                placeholder="Поиск по названию проекта..." 
                value={search} 
                onChange={e => onSearchChange(e.target.value)} 
              />
            </div>

            {/* Reset Button */}
            <button 
              onClick={onReset}
              className="flex items-center gap-1.5 px-3.5 h-[36px] bg-[#1e2227] border border-[#3e4654] text-slate-300 rounded-lg text-[0.8rem] font-bold cursor-pointer hover:bg-[#22272e] hover:text-[#ff4949] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Сбросить
            </button>

            {/* Count Badge with Sparkle */}
            <div className="relative flex items-center justify-end h-[36px] pl-3 pr-4 ml-auto gap-1">
              {/* Sparkle icon from layout */}
              <svg className="absolute -top-1.5 right-0.5 w-3.5 h-3.5 text-slate-400 opacity-70 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2" />
              </svg>
              <div className="text-[0.85rem] font-bold text-white flex items-center gap-1 mt-1">
                <span>{filteredCount}</span>
                <span className="text-slate-500 font-normal">/</span>
                <span className="text-slate-400 font-medium">{totalCount}</span>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    );
  }

  // ==================== LIGHT THEME LAYOUT (ORIGINAL) ====================
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
