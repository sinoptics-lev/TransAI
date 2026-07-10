import { useState } from 'react';
import { motion } from 'framer-motion';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
}

export function KPICards({ data }: Props) {
  const [showEffectTooltip, setShowEffectTooltip] = useState(false);
  const formatNum = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const fromReduction = data.totalReduction * 3.4;
  const fromLabor = (data.totalLaborClaimed - data.totalReduction) * 3.4;

  const effectByType: Record<string, { amount: number; count: number }> = {};
  let totalEffectAmount = 0;
  let totalEffectProjects = 0;
  data.projects.forEach(p => {
    if (p.effectAmount > 0) {
      totalEffectAmount += p.effectAmount;
      totalEffectProjects++;
      const type = p.effectType || 'Прочее';
      if (!effectByType[type]) {
        effectByType[type] = { amount: 0, count: 0 };
      }
      effectByType[type].amount += p.effectAmount;
      effectByType[type].count++;
    }
  });
  const effectTypesList = Object.entries(effectByType)
    .sort((a, b) => b[1].amount - a[1].amount);

  const cards = [
    {
      label: 'План сокращения',
      value: formatNum(data.totalReduction),
      delta: 'человек',
      borderColor: 'border-t-red-500',
    },
    {
      label: 'Высвобождение трудозатрат',
      value: formatNum(data.totalLaborClaimed),
      delta: 'человек (заявлено)',
      borderColor: 'border-t-amber-400',
    },
    {
      label: 'Фин. эффект от сокращения',
      value: formatNum(fromReduction),
      delta: 'млн руб. (сокр. × 3,4)',
      borderColor: 'border-t-emerald-500',
    },
    {
      label: 'Фин. эффект высвобождения',
      value: formatNum(fromLabor),
      delta: 'млн руб. (высв. × 3,4)',
      borderColor: 'border-t-blue-500',
    },
    {
      label: 'Экономический эффект',
      value: formatNum(totalEffectAmount),
      delta: `млн руб. (${totalEffectProjects} ${totalEffectProjects % 10 === 1 && totalEffectProjects % 100 !== 11 ? 'проект' : totalEffectProjects % 10 >= 2 && totalEffectProjects % 10 <= 4 && (totalEffectProjects % 100 < 10 || totalEffectProjects % 100 >= 20) ? 'проекта' : 'проектов'})`,
      borderColor: 'border-t-violet-500',
      hasTooltip: true,
      tooltipContent: effectTypesList,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className={`bg-card rounded-xl p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-default relative border border-border ${card.borderColor} border-t-4`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
          onMouseEnter={() => card.hasTooltip && setShowEffectTooltip(true)}
          onMouseLeave={() => card.hasTooltip && setShowEffectTooltip(false)}
        >
          <div className="text-[0.75rem] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
            {card.label}
          </div>
          <div className="text-[1.6rem] font-bold text-foreground leading-tight">
            {card.value}
          </div>
          <div className="text-[0.8rem] mt-1 text-muted-foreground">
            {card.delta}
          </div>

          {card.hasTooltip && showEffectTooltip && effectTypesList.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-card rounded-xl shadow-2xl border border-border z-[200] min-w-[240px]">
              <div className="text-[0.8rem] font-bold text-foreground mb-2">По типам эффектов:</div>
              {effectTypesList.map(([type, info]) => (
                <div key={type} className="flex justify-between gap-4 text-[0.8rem]">
                  <span className="text-muted-foreground">{type} ({info.count})</span>
                  <span className="font-semibold text-foreground whitespace-nowrap">{info.amount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                </div>
              ))}
              <div className="border-t border-border mt-2 pt-1 flex justify-between gap-4 text-[0.8rem]">
                <span className="font-bold text-foreground">Итого ({totalEffectProjects})</span>
                <span className="font-bold text-violet-500 whitespace-nowrap">{totalEffectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-3 h-3 bg-card border-r border-b border-border rotate-45 transform origin-top-left translate-y-[-6px]" />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
