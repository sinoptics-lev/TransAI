import { CollapsibleSection } from '@/components/CollapsibleSection';
import { DepartmentBar } from '@/components/AnimatedBar';
import type { DashboardData } from '@/types/project';

interface Props {
  data: DashboardData;
  defaultOpen?: boolean;
}

export function FinancialEffect({ data, defaultOpen = false }: Props) {
  const maxFin = data.deptFinancial.length > 0 ? data.deptFinancial[0].finEffect : 1;
  const fmt = (v: number) => v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <CollapsibleSection title="Финансовый эффект по ведомствам (млн руб.)" delay={0.7} defaultOpen={defaultOpen}>
      <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
        {data.deptFinancial.map((dept, idx) => {
          const fromLabor = dept.finEffect - dept.fromReduction;
          const trackWidth = maxFin > 0 ? (dept.finEffect / maxFin) * 100 : 0;

          return (
            <DepartmentBar
              key={dept.department}
              rowNum={idx + 1}
              name={dept.department}
              total={fmt(dept.finEffect)}
              trackWidthPct={trackWidth}
              delay={idx * 0.03}
              segments={[
                {
                  label: 'От сокращения',
                  value: dept.fromReduction,
                  displayValue: fmt(dept.fromReduction),
                  pct: dept.fromReductionPct,
                  colorClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
                },
                {
                  label: 'Высвобождение без сокр.',
                  value: fromLabor,
                  displayValue: fmt(fromLabor),
                  pct: 100 - dept.fromReductionPct,
                  colorClass: 'bg-gradient-to-r from-blue-400 to-blue-500',
                },
              ]}
            />
          );
        })}
      </div>

      <div className="flex gap-6 mt-3 text-[0.9rem] text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>От сокращения (сокр. ×3,4 млн)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span>Высвобождение без сокр. (высв. ×3,4 млн)</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
