import { motion } from 'framer-motion';
import { Search, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react';

interface FilterPanelProps {
  departments: string[];
  deptFilter: string;
  onDeptFilterChange: (v: string) => void;
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
  departments,
  deptFilter,
  onDeptFilterChange,
  mingosFilter,
  onMingosFilterChange,
  efficiencyFilter,
  onEfficiencyFilterChange,
  hasEffectFilter,
  onHasEffectFilterChange,
  search,
  onSearchChange,
  onReset,
  onlyReduction,
  onOnlyReductionChange,
  filteredCount,
  totalCount,
}: FilterPanelProps) {
  return (
    <motion.div
      className="sticky top-0 z-[100] bg-card/95 backdrop-blur-sm rounded-xl shadow-md border border-border px-4 py-3 mb-5"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Department filter */}
        <select
          className="px-3 py-2 border border-border rounded-lg text-[0.85rem] bg-background min-w-[170px] focus:outline-none focus:ring-2 focus:ring-mingos-red text-foreground"
          value={deptFilter}
          onChange={e => onDeptFilterChange(e.target.value)}
        >
          <option value="">Все ведомства</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Mingos toggle */}
        <div className="flex bg-muted rounded-lg p-[3px] gap-[3px]">
          {([
            { key: 'all' as const, label: 'Все' },
            { key: 'yes' as const, label: 'С Мингос' },
            { key: 'no' as const, label: 'Без Мингос' },
          ]).map(btn => (
            <button
              key={btn.key}
              className={`px-3 py-1.5 rounded-md text-[0.8rem] border-none cursor-pointer transition-all ${
                mingosFilter === btn.key
                  ? 'bg-background text-foreground font-semibold shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onMingosFilterChange(btn.key)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Efficiency filter */}
        <select
          className="px-3 py-2 border border-border rounded-lg text-[0.85rem] bg-background min-w-[180px] focus:outline-none focus:ring-2 focus:ring-mingos-red text-foreground"
          value={efficiencyFilter}
          onChange={e => onEfficiencyFilterChange(e.target.value)}
        >
          {EFFICIENCY_CATEGORIES.map(cat => (
            <option key={cat.key} value={cat.key}>{cat.label}</option>
          ))}
        </select>

        {/* Только финансы toggle */}
        <button
          onClick={() => onOnlyReductionChange(!onlyReduction)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.8rem] font-semibold border-none cursor-pointer transition-all ${
            onlyReduction
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-500'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
          title={onlyReduction ? 'Эффект = Сокр. × 3.4 + Эконом. эффект' : 'Эффект = Высв. × 3.4 + Эконом. эффект'}
        >
          {onlyReduction ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          Только финансы
        </button>

        {/* Экономический эффект toggle */}
        <div className="flex bg-violet-50 dark:bg-violet-950/20 rounded-lg p-[3px] gap-[3px]">
          {([
            { key: 'all' as const, label: 'Все' },
            { key: 'yes' as const, label: 'С эффектом' },
            { key: 'no' as const, label: 'Без эффекта' },
          ]).map(btn => (
            <button
              key={btn.key}
              className={`px-3 py-1.5 rounded-md text-[0.8rem] border-none cursor-pointer transition-all ${
                hasEffectFilter === btn.key
                  ? 'bg-background text-violet-600 dark:text-violet-400 font-semibold shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onHasEffectFilterChange(btn.key)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[0.85rem] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-mingos-red"
            placeholder="Поиск по названию проекта..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* Reset */}
        <button
          className="flex items-center gap-1.5 px-3 py-2 text-[0.8rem] font-semibold text-muted-foreground bg-muted rounded-lg border-none cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
          onClick={onReset}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Сбросить
        </button>

        {/* Count badge */}
        <div className="text-[0.8rem] text-muted-foreground ml-auto">
          <span className="font-bold text-foreground">{filteredCount}</span> / {totalCount}
        </div>
      </div>
    </motion.div>
  );
}
