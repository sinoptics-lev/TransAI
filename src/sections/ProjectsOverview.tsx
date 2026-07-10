import { motion } from 'framer-motion';
import { AnimatedBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
}

export function ProjectsOverview({ data }: Props) {
  const mingosPct = data.totalProjects > 0 ? (data.mingosProjects / data.totalProjects) * 100 : 0;
  const noMingosPct = 100 - mingosPct;

  const segments = [
    {
      label: 'С участием Мингос',
      value: `${data.mingosProjects}`,
      pct: mingosPct,
      colorClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
    },
    {
      label: 'Без участия Мингос',
      value: `${data.noMingosProjects}`,
      pct: noMingosPct,
      colorClass: 'bg-gradient-to-r from-amber-400 to-amber-500',
    },
  ];

  return (
    <motion.section
      className="bg-card rounded-xl p-6 mb-5 shadow-sm border border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h2 className="text-[1.1rem] font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1 h-[22px] bg-mingos-red rounded-sm" />
        Проекты
      </h2>

      <div className="flex items-center gap-5">
        <div className="flex-1">
          <AnimatedBar segments={segments} height={56} delay={0.2} />
        </div>
        <div className="min-w-[160px] text-right">
          <div className="text-[2rem] font-extrabold text-foreground leading-tight">
            {data.totalProjects.toLocaleString('ru-RU')}
          </div>
          <span className="text-[0.875rem] font-medium text-muted-foreground">проекта</span>
        </div>
      </div>

      <div className="flex gap-6 mt-3 text-[0.9rem] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>С участием Мингос — {mingosPct.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span>Без участия Мингос — {noMingosPct.toFixed(1)}%</span>
        </div>
      </div>
    </motion.section>
  );
}
