import { CollapsibleSection } from '@/components/CollapsibleSection';
import { DepartmentBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
  defaultOpen?: boolean;
}

export function ReductionByDepartment({ data, defaultOpen = false }: Props) {
  const maxLabor = data.deptReduction.length > 0 ? data.deptReduction[0].labor : 1;
  const fmt = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <CollapsibleSection title="Высвобождение по ведомствам (чел.)" delay={0.6} defaultOpen={defaultOpen}>
      <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
        {data.deptReduction.map((dept, idx) => {
          const trackWidth = maxLabor > 0 ? (dept.labor / maxLabor) * 100 : 0;
          return (
            <DepartmentBar
              key={dept.department}
              rowNum={idx + 1}
              name={dept.department}
              total={fmt(dept.labor)}
              trackWidthPct={trackWidth}
              delay={idx * 0.03}
              segments={[
                {
                  label: 'В т.ч. план сокращения',
                  value: dept.reduction,
                  displayValue: fmt(dept.reduction),
                  pct: dept.reductionPct,
                  colorClass: 'bg-[#0e9f6e] dark:bg-[#3da885]',
                },
                {
                  label: 'Высвобождение без сокращения',
                  value: dept.labor - dept.reduction,
                  displayValue: fmt(dept.labor - dept.reduction),
                  pct: dept.laborPct,
                  colorClass: 'bg-[#3f83f8] dark:bg-[#1c64f2]',
                },
              ]}
            />
          );
        })}
      </div>

      <div className="flex gap-6 mt-3 text-[0.9rem] dept-legend-text font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0e9f6e] dark:bg-[#3da885]" />
          <span>План сокращения (чел.)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3f83f8] dark:bg-[#1c64f2]" />
          <span>Высвобождение без сокращения (чел.)</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
