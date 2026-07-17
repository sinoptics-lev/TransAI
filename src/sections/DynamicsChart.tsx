import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, Activity } from 'lucide-react';
import type { Project } from '@/types/project';

interface Props {
  projects: Project[];
  theme: 'light' | 'dark';
}

const RU_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const RU_MONTHS_SHORT = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

const QUARTER_NAMES = ['I', 'II', 'III', 'IV'];

// Parse RU format date "DD.MM.YYYY" to Date object
function parseRUDate(str: string | undefined): Date | null {
  if (!str) return null;
  const parts = str.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return null;
}

// Helper to format date as "DD.MM.YYYY"
function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

// Helper to format date as "DD.MM"
function formatShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Safe date extractors with fallback to startDate
function getCreatedDate(p: Project): string {
  return p.createdDate || p.startDate || '';
}

function getUpdatedDate(p: Project): string {
  return p.updatedDate || p.endDate || p.startDate || '';
}

export function DynamicsChart({ projects, theme }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date(2026, 6, 17));

  // Determine the default anchor date based on latest projects
  const defaultAnchorDate = useMemo(() => {
    let latestDate: Date | null = null;
    projects.forEach(p => {
      const d1 = parseRUDate(getCreatedDate(p));
      const d2 = parseRUDate(getUpdatedDate(p));
      if (d1 && (!latestDate || d1 > latestDate)) latestDate = d1;
      if (d2 && (!latestDate || d2 > latestDate)) latestDate = d2;
    });
    return latestDate || new Date(2026, 6, 17);
  }, [projects]);

  // Sync anchorDate with newly loaded projects if applicable
  useEffect(() => {
    if (defaultAnchorDate) {
      setAnchorDate(defaultAnchorDate);
    }
  }, [defaultAnchorDate]);

  // Monday of the week containing anchorDate
  const startOfWeek = useMemo(() => {
    const d = new Date(anchorDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }, [anchorDate]);

  // Start & End of Month containing anchorDate
  const startOfMonth = useMemo(() => {
    return new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  }, [anchorDate]);

  const endOfMonth = useMemo(() => {
    return new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  }, [anchorDate]);

  // Start & End of Quarter containing anchorDate
  const quarterIndex = useMemo(() => {
    return Math.floor(anchorDate.getMonth() / 3);
  }, [anchorDate]);

  const startOfQuarter = useMemo(() => {
    return new Date(anchorDate.getFullYear(), quarterIndex * 3, 1);
  }, [anchorDate, quarterIndex]);

  const endOfQuarter = useMemo(() => {
    return new Date(anchorDate.getFullYear(), (quarterIndex + 1) * 3, 0);
  }, [anchorDate, quarterIndex]);

  // Aggregate Data for Active Period
  const activeData = useMemo(() => {
    if (period === 'week') {
      const dataPoints = [];
      const start = new Date(startOfWeek);
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(start);
        currentDay.setDate(start.getDate() + i);
        const dayStr = formatDate(currentDay);
        const label = formatShortDate(currentDay);

        let createdCount = 0;
        let updatedCount = 0;

        projects.forEach(p => {
          const cDate = parseRUDate(getCreatedDate(p));
          const uDate = parseRUDate(getUpdatedDate(p));
          if (cDate && formatDate(cDate) === dayStr) createdCount++;
          if (uDate && formatDate(uDate) === dayStr) updatedCount++;
        });

        dataPoints.push({
          dateStr: dayStr,
          label,
          "Создано": createdCount,
          "Изменено": updatedCount,
        });
      }
      return dataPoints;
    }

    if (period === 'month') {
      const dataPoints = [];
      const daysInMonth = endOfMonth.getDate();
      const start = new Date(startOfMonth);
      for (let i = 0; i < daysInMonth; i++) {
        const currentDay = new Date(start);
        currentDay.setDate(start.getDate() + i);
        const dayStr = formatDate(currentDay);
        const label = `${currentDay.getDate()}`;

        let createdCount = 0;
        let updatedCount = 0;

        projects.forEach(p => {
          const cDate = parseRUDate(getCreatedDate(p));
          const uDate = parseRUDate(getUpdatedDate(p));
          if (cDate && formatDate(cDate) === dayStr) createdCount++;
          if (uDate && formatDate(uDate) === dayStr) updatedCount++;
        });

        dataPoints.push({
          dateStr: dayStr,
          label,
          "Создано": createdCount,
          "Изменено": updatedCount,
        });
      }
      return dataPoints;
    }

    if (period === 'quarter') {
      const dataPoints = [];
      let currentWeekStart = new Date(startOfQuarter);
      while (currentWeekStart <= endOfQuarter) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        if (weekEnd > endOfQuarter) {
          weekEnd.setTime(endOfQuarter.getTime());
        }

        const label = `${formatShortDate(currentWeekStart)}`;
        let createdCount = 0;
        let updatedCount = 0;

        projects.forEach(p => {
          const cDate = parseRUDate(getCreatedDate(p));
          const uDate = parseRUDate(getUpdatedDate(p));
          if (cDate && cDate >= currentWeekStart && cDate <= weekEnd) createdCount++;
          if (uDate && uDate >= currentWeekStart && uDate <= weekEnd) updatedCount++;
        });

        dataPoints.push({
          label,
          weekRange: `${formatShortDate(currentWeekStart)} - ${formatShortDate(weekEnd)}`,
          "Создано": createdCount,
          "Изменено": updatedCount,
        });

        const nextWeekStart = new Date(currentWeekStart);
        nextWeekStart.setDate(currentWeekStart.getDate() + 7);
        currentWeekStart = nextWeekStart;
      }
      return dataPoints;
    }

    // Default 'year'
    const dataPoints = [];
    for (let m = 0; m < 12; m++) {
      const mStart = new Date(anchorDate.getFullYear(), m, 1);
      const mEnd = new Date(anchorDate.getFullYear(), m + 1, 0);
      const label = RU_MONTHS_SHORT[m];

      let createdCount = 0;
      let updatedCount = 0;

      projects.forEach(p => {
        const cDate = parseRUDate(getCreatedDate(p));
        const uDate = parseRUDate(getUpdatedDate(p));
        if (cDate && cDate >= mStart && cDate <= mEnd) createdCount++;
        if (uDate && uDate >= mStart && uDate <= mEnd) updatedCount++;
      });

      dataPoints.push({
        label,
        fullMonthName: `${RU_MONTHS[m]} ${anchorDate.getFullYear()}`,
        "Создано": createdCount,
        "Изменено": updatedCount,
      });
    }
    return dataPoints;
  }, [period, startOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, anchorDate, projects]);

  // Navigation handlers
  const handlePrev = () => {
    setAnchorDate(prev => {
      const next = new Date(prev);
      if (period === 'week') next.setDate(prev.getDate() - 7);
      else if (period === 'month') next.setMonth(prev.getMonth() - 1);
      else if (period === 'quarter') next.setMonth(prev.getMonth() - 3);
      else next.setFullYear(prev.getFullYear() - 1);
      return next;
    });
  };

  const handleNext = () => {
    setAnchorDate(prev => {
      const next = new Date(prev);
      if (period === 'week') next.setDate(prev.getDate() + 7);
      else if (period === 'month') next.setMonth(prev.getMonth() + 1);
      else if (period === 'quarter') next.setMonth(prev.getMonth() + 3);
      else next.setFullYear(prev.getFullYear() + 1);
      return next;
    });
  };

  // Period label for navigation bar
  const getPeriodLabel = () => {
    if (period === 'week') {
      const end = new Date(startOfWeek);
      end.setDate(startOfWeek.getDate() + 6);
      return `${formatShortDate(startOfWeek)} - ${formatShortDate(end)} . ${startOfWeek.getFullYear()}`;
    }
    if (period === 'month') {
      return `${RU_MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
    }
    if (period === 'quarter') {
      return `${QUARTER_NAMES[quarterIndex]} квартал ${anchorDate.getFullYear()}`;
    }
    return `${anchorDate.getFullYear()} год`;
  };

  // Active period created/updated totals
  const summary = useMemo(() => {
    const createdSum = activeData.reduce((s, p) => s + p["Создано"], 0);
    const updatedSum = activeData.reduce((s, p) => s + p["Изменено"], 0);
    return { createdSum, updatedSum };
  }, [activeData]);

  // Recharts custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-[#1e293b]/95 border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-lg text-xs font-sans">
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
            {payload[0].payload.weekRange || payload[0].payload.fullMonthName || payload[0].payload.dateStr || label}
          </p>
          <div className="space-y-1">
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Создано: <span className="font-bold text-sm">{payload[0].value}</span>
            </p>
            {payload[1] && (
              <p className="text-indigo-600 dark:text-[#818cf8] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
                Изменено: <span className="font-bold text-sm">{payload[1].value}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.section
      className="bg-white dark:bg-[#1e293b]/70 border border-slate-100 dark:border-[#334155]/50 rounded-xl p-6 mb-5 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-[#334155]/30 pb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left cursor-pointer bg-transparent border-none p-0 focus:outline-none flex-1 group"
        >
          <h2 className="text-[1.1rem] font-bold text-[#2D323A] dark:text-slate-100 flex items-center gap-2">
            <span className="w-1 h-[22px] bg-[#ff4949] rounded-sm flex-shrink-0" />
            Динамика по трансформационным проектам
          </h2>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-250 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {/* Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                {/* Period Selectors */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 self-start">
                  {(['week', 'month', 'quarter', 'year'] as const).map((p) => {
                    const labels = {
                      week: 'Неделя',
                      month: 'Месяц',
                      quarter: 'Квартал',
                      year: 'Год'
                    };
                    return (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          period === p
                            ? 'bg-[#ff4949] text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  })}
                </div>

                {/* Left/Right Navigation */}
                <div className="flex items-center gap-3 self-start md:self-auto">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
                    title="Назад"
                  >
                    <ChevronLeft className="w-4.5 h-4.5" />
                  </button>

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 min-w-[160px] justify-center">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{getPeriodLabel()}</span>
                  </div>

                  <button
                    onClick={handleNext}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/40 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
                    title="Вперед"
                  >
                    <ChevronRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 gap-4 max-w-sm mb-6 bg-slate-50/50 dark:bg-slate-800/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <div>
                  <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Создано проектов</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{summary.createdSum}</div>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                  <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wider">Изменено проектов</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-[#818cf8] mt-0.5">{summary.updatedSum}</div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-[280px] sm:h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="Создано" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      dot={{ r: 3.5, strokeWidth: 1.5, fill: theme === 'dark' ? '#1e293b' : '#fff' }}
                      activeDot={{ r: 6 }}
                      animationDuration={350}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Изменено" 
                      stroke="#6366f1" 
                      strokeWidth={2.5}
                      dot={{ r: 3.5, strokeWidth: 1.5, fill: theme === 'dark' ? '#1e293b' : '#fff' }}
                      activeDot={{ r: 6 }}
                      animationDuration={350}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex gap-6 mt-4 justify-center text-[0.8rem] font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                  <span className="text-slate-600 dark:text-slate-400">Количество созданных</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
                  <span className="text-slate-600 dark:text-slate-400">Количество измененных</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
