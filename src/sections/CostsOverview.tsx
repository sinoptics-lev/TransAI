import { motion } from 'framer-motion';
import { AnimatedBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
}

export function CostsOverview({ data }: Props) {
  const mingosCost = data.projects
    .filter(p => p.mingos === 'Да')
    .reduce((s, p) => s + p.costTotal, 0);
  const noMingosCost = data.totalCost - mingosCost;

  const mingosCostPct = data.totalCost > 0 ? (mingosCost / data.totalCost) * 100 : 0;
  const noMingosCostPct = 100 - mingosCostPct;

  const fotPct = data.totalCost > 0 ? (data.costFOT / data.totalCost) * 100 : 0;
  const directPct = data.totalCost > 0 ? (data.costDirect / data.totalCost) * 100 : 0;
  const infraPct = 100 - fotPct - directPct;

  // Convert thousands to millions
  const fmtMln = (v: number) => (v / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const segments1 = [
    {
      label: 'С участием Мингос',
      value: `${fmtMln(mingosCost)}`,
      pct: mingosCostPct,
      colorClass: 'bg-[#0e9f6e] dark:bg-[#3da885]',
    },
    {
      label: 'Без участия Мингос',
      value: `${fmtMln(noMingosCost)}`,
      pct: noMingosCostPct,
      colorClass: 'bg-[#d97706] dark:bg-[#dca725]',
    },
  ];

  const segments2 = [
    {
      label: 'ФОТ',
      value: `${fmtMln(data.costFOT)}`,
      pct: fotPct,
      colorClass: 'bg-[#1a56db] dark:bg-[#1e3a8a]',
    },
    {
      label: 'Прямые затраты',
      value: `${fmtMln(data.costDirect)}`,
      pct: directPct,
      colorClass: 'bg-[#3f83f8] dark:bg-[#1c64f2]',
    },
    {
      label: 'Инфраструктура',
      value: `${fmtMln(data.costInfra)}`,
      pct: infraPct,
      colorClass: 'bg-[#9ca3af] dark:bg-[#475569]',
    },
  ];

  return (
    <motion.section
      className="bg-white rounded-xl p-6 mb-5 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <h2 className="text-[1.1rem] font-bold text-[#2D323A] mb-4 flex items-center gap-2">
        <span className="w-1 h-[22px] bg-[#1a56db] rounded-sm" />
        Затраты (млн руб.)
      </h2>

      {/* Row 1: Мингос split */}
      <div className="flex items-center gap-5">
        <div className="flex-1">
          <AnimatedBar segments={segments1} height={56} delay={0.3} />
        </div>
        <div className="min-w-[160px]" />
      </div>
      <div className="flex gap-6 mt-3 mb-4 text-[0.9rem] dept-legend-text font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0e9f6e] dark:bg-[#3da885]" />
          <span>С участием Мингос — {mingosCostPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b] dark:bg-[#dca725]" />
          <span>Без участия Мингос — {noMingosCostPct.toFixed(1)}%</span>
        </div>
      </div>

      {/* Row 2: Cost category split */}
      <div className="flex items-center gap-5 mt-4">
        <div className="flex-1">
          <AnimatedBar segments={segments2} height={56} delay={0.5} />
        </div>
        <div className="min-w-[160px] text-right">
          <div className="text-[1.6rem] font-extrabold text-[#2D323A] leading-tight">
            {fmtMln(data.totalCost)}
          </div>
          <span className="text-[0.875rem] font-medium text-[#555E6B]">млн руб.</span>
        </div>
      </div>
      <div className="flex gap-6 mt-3 text-[0.9rem] dept-legend-text font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#1a56db] dark:bg-[#1e3a8a]" />
          <span>ФОТ — {fotPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3f83f8] dark:bg-[#1c64f2]" />
          <span>Прямые затраты — {directPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#9ca3af] dark:bg-[#475569]" />
          <span>Инфраструктура — {infraPct.toFixed(1)}%</span>
        </div>
      </div>
    </motion.section>
  );
}
