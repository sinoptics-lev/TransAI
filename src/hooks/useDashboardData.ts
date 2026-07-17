import { useState, useEffect, useMemo } from 'react';
import type { Project, DashboardData, DepartmentProjects, DepartmentCosts, DepartmentReduction, DepartmentFinancial, EfficiencyData } from '@/types/project';
import { fetchProjects, apiProjectToFrontend } from '@/lib/api';

function loadProjectsFromJSON(): Promise<Project[]> {
  return fetch('./projects_data.json').then(res => res.json());
}

export function computeDashboardData(projects: Project[]): DashboardData {
  const departmentSet = new Set<string>();
  projects.forEach(p => { if (p.department) departmentSet.add(p.department); });
  const departmentList = Array.from(departmentSet).sort((a, b) => a.localeCompare(b));

  const totalProjects = projects.length;
  const mingosProjects = projects.filter(p => p.mingos === 'Да').length;
  const noMingosProjects = totalProjects - mingosProjects;

  const totalCost = projects.reduce((s, p) => s + p.costTotal, 0);
  const costFOT = projects.reduce((s, p) => s + p.costFOT, 0);
  const costDirect = projects.reduce((s, p) => s + p.costDirect, 0);
  const costInfra = projects.reduce((s, p) => s + p.costInfra, 0);

  const totalLaborRelease = projects.reduce((s, p) => s + p.laborRelease, 0);
  const totalLaborClaimed = projects.reduce((s, p) => s + (p.laborClaimed ?? 0), 0);
  const totalReduction = projects.reduce((s, p) => s + p.reductionPlan, 0);
  const totalFinancialEffect = totalLaborClaimed * 3.4;
  const departmentCount = departmentList.length;

  // Department projects distribution
  const deptProjectsMap = new Map<string, { mingos: number; noMingos: number; total: number }>();
  departmentList.forEach(d => deptProjectsMap.set(d, { mingos: 0, noMingos: 0, total: 0 }));
  projects.forEach(p => {
    const entry = deptProjectsMap.get(p.department);
    if (entry) {
      entry.total++;
      if (p.mingos === 'Да') entry.mingos++;
      else entry.noMingos++;
    }
  });
  const deptProjects: DepartmentProjects[] = departmentList.map(d => {
    const e = deptProjectsMap.get(d)!;
    return {
      department: d,
      mingos: e.mingos,
      noMingos: e.noMingos,
      total: e.total,
      mingosPct: e.total > 0 ? (e.mingos / e.total) * 100 : 0,
      noMingosPct: e.total > 0 ? (e.noMingos / e.total) * 100 : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // Department costs
  const deptCostsMap = new Map<string, { fot: number; direct: number; infra: number; total: number }>();
  departmentList.forEach(d => deptCostsMap.set(d, { fot: 0, direct: 0, infra: 0, total: 0 }));
  projects.forEach(p => {
    const entry = deptCostsMap.get(p.department);
    if (entry) {
      entry.fot += p.costFOT;
      entry.direct += p.costDirect;
      entry.infra += p.costInfra;
      entry.total += p.costTotal;
    }
  });
  const deptCosts: DepartmentCosts[] = departmentList.map(d => {
    const e = deptCostsMap.get(d)!;
    return {
      department: d,
      fot: e.fot,
      direct: e.direct,
      infra: e.infra,
      total: e.total,
      fotPct: e.total > 0 ? (e.fot / e.total) * 100 : 0,
      directPct: e.total > 0 ? (e.direct / e.total) * 100 : 0,
      infraPct: e.total > 0 ? (e.infra / e.total) * 100 : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // Staff reduction & release
  const deptRedMap = new Map<string, { reduction: number; claimed: number }>();
  departmentList.forEach(d => deptRedMap.set(d, { reduction: 0, claimed: 0 }));
  projects.forEach(p => {
    const entry = deptRedMap.get(p.department);
    if (entry) {
      entry.reduction += p.reductionPlan;
      entry.claimed += (p.laborClaimed ?? 0);
    }
  });
  const deptReduction: DepartmentReduction[] = departmentList.map(d => {
    const e = deptRedMap.get(d)!;
    return {
      department: d,
      reduction: e.reduction,
      labor: e.claimed,
      total: e.claimed,
      reductionPct: e.claimed > 0 ? (e.reduction / e.claimed) * 100 : 0,
      laborPct: e.claimed > 0 ? ((e.claimed - e.reduction) / e.claimed) * 100 : 0,
    };
  }).sort((a, b) => b.labor - a.labor);

  // Financial effect by department
  const maxFin = Math.max(...deptReduction.map(d => d.labor * 3.4), 1);
  const deptFinancial: DepartmentFinancial[] = deptReduction.map(d => ({
    department: d.department,
    finEffect: d.labor * 3.4,
    fromReduction: d.reduction * 3.4,
    finPct: maxFin > 0 ? ((d.labor * 3.4) / maxFin) * 100 : 0,
    fromReductionPct: d.labor > 0 ? ((d.reduction * 3.4) / (d.labor * 3.4)) * 100 : 0,
  })).sort((a, b) => b.finEffect - a.finEffect);

  return {
    projects,
    departmentList,
    totalProjects,
    mingosProjects,
    noMingosProjects,
    totalCost,
    costFOT,
    costDirect,
    costInfra,
    totalLaborRelease,
    totalLaborClaimed,
    totalReduction,
    totalFinancialEffect,
    departmentCount,
    deptProjects,
    deptCosts,
    deptReduction,
    deptFinancial,
  };
}

export function computeEfficiencyData(projects: Project[]): EfficiencyData {
  const deltas = projects.map(p => p.delta);

  const categories = [
    { key: 'critical_loss', label: 'Критический убыток', lo: -Infinity, hi: -100, color: '#D9534F', light: '#FFEBEE', range: '< -100 млн руб.' },
    { key: 'loss', label: 'Убыток', lo: -100, hi: -10, color: '#E05A47', light: '#FFEBEE', range: '-100…-10 млн руб.' },
    { key: 'small_loss', label: 'Незнач. убыток', lo: -10, hi: 0, color: '#EF5350', light: '#FFF2F0', range: '-10…0 млн руб.' },
    { key: 'break_even', label: 'Окупаемость', lo: 0, hi: 10, color: '#2B6CB0', light: '#EBF5FB', range: '0…+10 млн руб.' },
    { key: 'high', label: 'Высокая эффективность', lo: 10, hi: 100, color: '#3CAEA3', light: '#E2F0D9', range: '+10…+100 млн руб.' },
    { key: 'very_high', label: 'Очень высокая', lo: 100, hi: 500, color: '#2E8B57', light: '#E2F0D9', range: '+100…+500 млн руб.' },
    { key: 'exceptional', label: 'Исключительная', lo: 500, hi: Infinity, color: '#1B5E20', light: '#E8F5E9', range: '> +500 млн руб.' },
  ];

  const distribution = categories.map(cat => {
    const count = deltas.filter(d => d >= cat.lo && d < cat.hi).length;
    const totalDelta = deltas.filter(d => d >= cat.lo && d < cat.hi).reduce((s, d) => s + d, 0);
    return {
      key: cat.key,
      label: cat.label,
      range: cat.range,
      count,
      pct: deltas.length > 0 ? parseFloat(((count / deltas.length) * 100).toFixed(1)) : 0,
      color: cat.color,
      light: cat.light,
      totalDelta: parseFloat(totalDelta.toFixed(1)),
    };
  });

  const sortedByDelta = [...projects].sort((a, b) => b.delta - a.delta);
  const topProfitable = sortedByDelta.slice(0, 5).map(p => ({
    name: p.name,
    dept: p.department,
    delta: p.delta,
    costs: p.costTotal,
    labor: p.laborRelease,
  }));
  const topLoss = sortedByDelta.slice(-5).reverse().map(p => ({
    name: p.name,
    dept: p.department,
    delta: p.delta,
    costs: p.costTotal,
    labor: p.laborRelease,
  }));

  return {
    kpi: {
      profitablePct: parseFloat(((deltas.filter(d => d > 0).length / deltas.length) * 100).toFixed(1)),
      lossPct: parseFloat(((deltas.filter(d => d < 0).length / deltas.length) * 100).toFixed(1)),
      avgDelta: parseFloat((deltas.reduce((s, d) => s + d, 0) / deltas.length).toFixed(1)),
      medianDelta: parseFloat((deltas.sort((a, b) => a - b)[Math.floor(deltas.length / 2)] || 0).toFixed(1)),
      highEfficiencyPct: parseFloat(((deltas.filter(d => d >= 100).length / deltas.length) * 100).toFixed(1)),
      totalProjects: projects.length,
    },
    distribution,
    topProfitable,
    topLoss,
  };
}

export function useDashboardData(externalProjects?: Project[] | null) {
  const [jsonProjects, setJsonProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState(externalProjects === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalProjects !== undefined) {
      setLoading(false);
      return;
    }

    // Try API first, fallback to JSON
    fetchProjects()
      .then(result => {
        if (result.ok && result.projects.length > 0) {
          // Merge AI analysis data into projects
          const rawProjects = result.projects as any[];
          if (result.aiData && Object.keys(result.aiData).length > 0) {
            rawProjects.forEach((p: any) => {
              const rmId = Number(p.rmId || 0);
              if (rmId > 0 && result.aiData[rmId]) {
                p.aiAnalysis = result.aiData[rmId];
              }
            });
          }
          const projects = rawProjects.map(apiProjectToFrontend);
          setJsonProjects(projects);
          setLoading(false);
        } else {
          // Fallback to JSON file
          return loadProjectsFromJSON()
            .then(projects => {
              setJsonProjects(projects);
              setLoading(false);
            });
        }
      })
      .catch(() => {
        // Fallback to JSON file on network error
        loadProjectsFromJSON()
          .then(projects => {
            setJsonProjects(projects);
            setLoading(false);
          })
          .catch(err => {
            setError(err.message);
            setLoading(false);
          });
      });
  }, [externalProjects]);

  const projects = externalProjects !== undefined && externalProjects !== null
    ? externalProjects
    : jsonProjects;

  const data = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return computeDashboardData(projects);
  }, [projects]);

  return { data, loading, error };
}
