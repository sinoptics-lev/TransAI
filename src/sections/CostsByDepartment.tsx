import { CollapsibleSection } from '@/components/CollapsibleSection';
import { DepartmentBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
  defaultOpen?: boolean;
}

export function CostsByDepartment({ data, defaultOpen = false }: Props) {
  const maxTotal = data.deptCosts.length > 0 ? data.deptCosts[0].total : 1;

  const fmtMln = (v: number) => (v / 1000).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <CollapsibleSection title="Затраты по ведомствам (млн руб.)" delay={0.4} defaultOpen={defaultOpen}>
      <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
        {data.deptCosts.map((dept, idx) => {
          const trackWidth = maxTotal > 0 ? (dept.total / maxTotal) * 100 : 0;
          return (
            <DepartmentBar
              key={dept.department}
              rowNum={idx + 1}
              name={dept.department}
              total={fmtMln(dept.total)}
              trackWidthPct={trackWidth}
              delay={idx * 0.03}
              segments={[
                {
                  label: 'ФОТ',
                  value: dept.fot,
                  displayValue: fmtMln(dept.fot),
                  pct: dept.fotPct,
                  colorClass: 'bg-gradient-to-r from-blue-600 to-blue-700',
                },
                {
                  label: 'Прямые затраты',
                  value: dept.direct,
                  displayValue: fmtMln(dept.direct),
                  pct: dept.directPct,
                  colorClass: 'bg-gradient-to-r from-blue-400 to-blue-500',
                },
                {
                  label: 'Инфраструктура',
                  value: dept.infra,
                  displayValue: fmtMln(dept.infra),
                  pct: dept.infraPct,
                  colorClass: 'bg-gradient-to-r from-gray-400 to-gray-500',
                },
              ]}
            />
          );
        })}
      </div>

      <div className="flex gap-6 mt-3 text-[0.9rem] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600" />
          <span>ФОТ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span>Прямые затраты</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span>Инфраструктура</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
