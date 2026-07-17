import { CollapsibleSection } from '@/components/CollapsibleSection';
import { DepartmentBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
  defaultOpen?: boolean;
}

export function CostsByDepartment({ data, defaultOpen = false }: Props) {
  const maxTotal = data.deptCosts.length > 0 ? data.deptCosts[0].total : 1;

  // All values displayed in millions of rubles
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
                  colorClass: 'bg-[#1a56db] dark:bg-[#1e3a8a]',
                },
                {
                  label: 'Прямые затраты',
                  value: dept.direct,
                  displayValue: fmtMln(dept.direct),
                  pct: dept.directPct,
                  colorClass: 'bg-[#3f83f8] dark:bg-[#1c64f2]',
                },
                {
                  label: 'Инфраструктура',
                  value: dept.infra,
                  displayValue: fmtMln(dept.infra),
                  pct: dept.infraPct,
                  colorClass: 'bg-[#9ca3af] dark:bg-[#475569]',
                },
              ]}
            />
          );
        })}
      </div>

      <div className="flex gap-6 mt-3 text-[0.9rem] dept-legend-text font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#1a56db] dark:bg-[#1e3a8a]" />
          <span>ФОТ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3f83f8] dark:bg-[#1c64f2]" />
          <span>Прямые затраты</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#9ca3af] dark:bg-[#475569]" />
          <span>Инфраструктура</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
