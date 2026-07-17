import { CollapsibleSection } from '@/components/CollapsibleSection';
import { DepartmentBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
  defaultOpen?: boolean;
}

export function DepartmentDistribution({ data, defaultOpen = false }: Props) {
  const maxTotal = data.deptProjects.length > 0 ? data.deptProjects[0].total : 1;

  return (
    <CollapsibleSection title="Распределение проектов по ведомствам" delay={0.2} defaultOpen={defaultOpen}>
      <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
        {data.deptProjects.map((dept, idx) => {
          const trackWidth = maxTotal > 0 ? (dept.total / maxTotal) * 100 : 0;
          return (
            <DepartmentBar
              key={dept.department}
              rowNum={idx + 1}
              name={dept.department}
              total={`${dept.total}`}
              trackWidthPct={trackWidth}
              delay={idx * 0.03}
              segments={[
                {
                  label: 'С Мингос',
                  value: dept.mingos,
                  displayValue: `${dept.mingos}`,
                  pct: dept.mingosPct,
                  colorClass: 'bg-[#0e9f6e] dark:bg-[#3da885]',
                },
                {
                  label: 'Без Мингос',
                  value: dept.noMingos,
                  displayValue: `${dept.noMingos}`,
                  pct: dept.noMingosPct,
                  colorClass: 'bg-[#d97706] dark:bg-[#dca725]',
                },
              ]}
            />
          );
        })}
      </div>

      <div className="flex gap-6 mt-3 text-[0.9rem] dept-legend-text font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#0e9f6e] dark:bg-[#3da885]" />
          <span>С участием Мингос</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b] dark:bg-[#dca725]" />
          <span>Без участия Мингос</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
