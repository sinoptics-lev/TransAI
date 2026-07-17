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

  // Group effects by type: sum and project count
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
      borderColor: '#e02424',
    },
    {
      label: 'Высвобождение трудозатрат',
      value: formatNum(data.totalLaborClaimed),
      delta: 'человек (заявлено)',
      borderColor: '#f59e0b',
    },
    {
      label: 'Фин. эффект от сокращения',
      value: formatNum(fromReduction),
      delta: 'млн руб. (сокр. \u00d7 3,4)',
      borderColor: '#0e9f6e',
    },
    {
      label: 'Фин. эффект высвобождения',
      value: formatNum(fromLabor),
      delta: 'млн руб. (высв. \u00d7 3,4)',
      borderColor: '#3f83f8',
    },
    {
      label: 'Экономический эффект',
      value: formatNum(totalEffectAmount),
      delta: `млн руб. (${totalEffectProjects} ${totalEffectProjects % 10 === 1 && totalEffectProjects % 100 !== 11 ? 'проект' : totalEffectProjects % 10 >= 2 && totalEffectProjects % 10 <= 4 && (totalEffectProjects % 100 < 10 || totalEffectProjects % 100 >= 20) ? 'проекта' : 'проектов'})`,
      borderColor: '#7c3aed',
      hasTooltip: true,
      tooltipContent: effectTypesList,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          className="bg-white rounded-xl p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-default relative border border-slate-100 dark:border-slate-800/40"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
          onMouseEnter={() => card.hasTooltip && setShowEffectTooltip(true)}
          onMouseLeave={() => card.hasTooltip && setShowEffectTooltip(false)}
        >
          {/* Top colored strip */}
          <div 
            className="absolute top-0 left-0 right-0 h-[4px] rounded-t-xl" 
            style={{ backgroundColor: card.borderColor }}
          />

          <div className="text-[0.75rem] uppercase tracking-wider contrast-text-muted mb-1.5 font-bold">
            {card.label}
          </div>
          <div className="text-[1.6rem] font-extrabold contrast-heading leading-tight">
            {card.value}
          </div>
          <div className="text-[0.8rem] mt-1 contrast-text-muted font-medium">
            {card.delta}
          </div>

          {/* Tooltip for Economic Effect */}
          {card.hasTooltip && showEffectTooltip && effectTypesList.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 rounded-xl shadow-xl z-[200] min-w-[250px] kpi-tooltip border">
              <div className="text-[0.8rem] font-bold kpi-tooltip-title mb-2">По типам эффектов:</div>
              {effectTypesList.map(([type, info]) => (
                <div key={type} className="flex justify-between gap-4 text-[0.8rem] mb-1">
                  <span className="kpi-tooltip-muted">{type} ({info.count})</span>
                  <span className="font-semibold kpi-tooltip-value whitespace-nowrap">{info.amount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</span>
                </div>
              ))}
              <div className="border-t kpi-tooltip-divider mt-2 pt-1.5 flex justify-between gap-4 text-[0.8rem]">
                <span className="font-bold kpi-tooltip-title">Итого ({totalEffectProjects})</span>
                <span className="font-extrabold kpi-tooltip-total whitespace-nowrap">{totalEffectAmount.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} млн руб.</span>
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                <div className="w-3 h-3 rotate-45 transform origin-top-left translate-y-[-6px] kpi-tooltip-arrow border-r border-b" />
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
