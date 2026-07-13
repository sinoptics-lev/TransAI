import { useState, useCallback, useMemo } from 'react';
import { useDashboardData, computeDashboardData, computeEfficiencyData } from '@/hooks/useDashboardData';
import { parseTwoXLSX, exportEnrichedRM, setRMHeaders, exportFullReport, parseAIFile } from '@/hooks/useXLSXParser';

import { useLocalStorageProjects } from '@/hooks/useLocalStorage';
import { TooltipProvider } from '@/components/TooltipContext';
import { FileUploader } from '@/components/FileUploader';
import { FilterPanel } from '@/components/FilterPanel';
import { Header } from '@/sections/Header';
import { ProjectsOverview } from '@/sections/ProjectsOverview';
import { DepartmentDistribution } from '@/sections/DepartmentDistribution';
import { CostsOverview } from '@/sections/CostsOverview';
import { CostsByDepartment } from '@/sections/CostsByDepartment';
import { KPICards } from '@/sections/KPICards';
import { ReductionByDepartment } from '@/sections/ReductionByDepartment';
import { FinancialEffect } from '@/sections/FinancialEffect';
import { ProjectEfficiency } from '@/sections/ProjectEfficiency';
import { ProjectsTable } from '@/sections/ProjectsTable';
import type { Project, EfficiencyData } from '@/types/project';
import './App.css';

function getEfficiencyCategory(delta: number): string {
  if (delta > 500) return 'exceptional';
  if (delta > 100) return 'very_high';
  if (delta > 10) return 'high';
  if (delta >= 0) return 'break_even';
  if (delta > -10) return 'small_loss';
  if (delta > -100) return 'loss';
  return 'critical_loss';
}

function App() {
  // ===== File upload state =====
  const { storedProjects, storedFilename, checked, save: saveToStorage, clear: clearStorage } = useLocalStorageProjects();
  const [sessionProjects, setSessionProjects] = useState<Project[] | null>(null);
  const [sessionFileNames, setSessionFileNames] = useState<{ rm: string; db: string; ai?: string } | null>(null);
  const [jsonDownloadUrl, setJsonDownloadUrl] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiFileName, setAiFileName] = useState<string | null>(null);

  const effectiveProjects = sessionProjects ?? storedProjects;
  const { data: jsonData, loading: jsonLoading } = useDashboardData(effectiveProjects ?? undefined);
  const data = jsonData ?? null;

  // ===== Global filter state =====
  const [deptFilter, setDeptFilter] = useState('');
  const [mingosFilter, setMingosFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [efficiencyFilter, setEfficiencyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [hasEffectFilter, setHasEffectFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [verdictFilter, setVerdictFilter] = useState<string>('all');

  // ===== Global "Только финансы" toggle =====
  const [onlyReduction, setOnlyReduction] = useState(false);

  // ===== Compute adjusted projects when toggle is on =====
  const adjustedProjects = useMemo(() => {
    if (!data) return [];
    let result = [...data.projects];

    if (onlyReduction) {
      result = result.map(p => {
        const economicEffect = p.reductionPlan * 3.4 + p.effectAmount;
        const delta = economicEffect - (p.costTotal / 1000);
        return {
          ...p,
          economicEffect: Math.round(economicEffect * 10) / 10,
          delta: Math.round(delta * 10) / 10,
        };
      });
    }

    // Apply filters on top of adjusted projects
    if (deptFilter) result = result.filter(p => p.department === deptFilter);
    if (mingosFilter === 'yes') result = result.filter(p => p.mingos === 'Да');
    if (mingosFilter === 'no') result = result.filter(p => p.mingos === 'Нет');
    if (efficiencyFilter !== 'all') result = result.filter(p => getEfficiencyCategory(p.delta) === efficiencyFilter);
    if (hasEffectFilter === 'yes') result = result.filter(p => p.effectAmount > 0);
    if (hasEffectFilter === 'no') result = result.filter(p => p.effectAmount === 0);
    if (verdictFilter !== 'all') {
      result = result.filter(p => {
        const v = (p.aiVerdict || 'Нет данных').toLowerCase();
        return v === verdictFilter.toLowerCase();
      });
    }
    if (search) { const q = search.toLowerCase(); result = result.filter(p => p.name.toLowerCase().includes(q)); }

    return result;
  }, [data, onlyReduction, deptFilter, mingosFilter, efficiencyFilter, hasEffectFilter, verdictFilter, search]);

  // ===== Dashboard data from adjusted (filtered) projects =====
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (adjustedProjects.length === 0) {
      return {
        projects: [], departmentList: data.departmentList,
        totalProjects: 0, mingosProjects: 0, noMingosProjects: 0,
        totalCost: 0, costFOT: 0, costDirect: 0, costInfra: 0,
        totalLaborRelease: 0, totalLaborClaimed: 0, totalReduction: 0, totalFinancialEffect: 0,
        departmentCount: data.departmentList.length,
        deptProjects: [], deptCosts: [], deptReduction: [], deptFinancial: [],
      };
    }
    const chartData = computeDashboardData(adjustedProjects);
    return { ...chartData, departmentList: data.departmentList };
  }, [data, adjustedProjects]);

  const efficiencyData: EfficiencyData | null = useMemo(() => {
    if (!data) return null;
    return computeEfficiencyData(adjustedProjects);
  }, [data, adjustedProjects]);

  // ===== File upload handler (two/three files) =====
  const handleFilesLoad = useCallback(async (rmFile: File, dbFile: File, aiFile?: File) => {
    setUploadLoading(true);
    setUploadError(null);
    const result = await parseTwoXLSX(rmFile, dbFile, aiFile);
    setUploadLoading(false);

    if (result.error) {
      setUploadError(result.error);
      return;
    }

    setSessionProjects(result.projects);
    setSessionFileNames({ rm: rmFile.name, db: dbFile.name, ai: aiFile?.name });
    if (result.rmHeaders) setRMHeaders(result.rmHeaders);
    saveToStorage(result.projects, `${rmFile.name} + ${dbFile.name}${aiFile ? ' + ' + aiFile.name : ''}`);
    // Generate downloadable JSON blob
    const jsonStr = JSON.stringify(result.projects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    setJsonDownloadUrl(url);
  }, [saveToStorage]);

  // ===== AI file standalone upload handler =====
  const handleAIFileLoad = useCallback(async (aiFile: File) => {
    if (!effectiveProjects || effectiveProjects.length === 0) return;
    setAiLoading(true);
    const aiResult = await parseAIFile(aiFile);
    setAiLoading(false);
    setAiFileName(aiFile.name);

    // Clear old AI data and attach new
    const updated = effectiveProjects.map(p => {
      const linkMatch = p.link.match(/\/issues\/(\d+)/);
      const origId = linkMatch ? Number(linkMatch[1]) : 0;
      const newAnalysis = origId > 0 ? aiResult[origId] : undefined;
      if (newAnalysis) {
        return { ...p, aiAnalysis: newAnalysis };
      }
      // Remove old analysis if project not in new AI file
      const cleaned: Project = { ...p };
      delete (cleaned as { aiAnalysis?: unknown }).aiAnalysis;
      return cleaned;
    });

    setSessionProjects(updated);
    saveToStorage(updated, sessionFileNames ? `${sessionFileNames.rm} + ${sessionFileNames.db} + ${aiFile.name}` : aiFile.name);
  }, [effectiveProjects, saveToStorage, sessionFileNames]);

  const handleClearFiles = useCallback(() => {
    setSessionProjects(null);
    setSessionFileNames(null);
    if (jsonDownloadUrl) { URL.revokeObjectURL(jsonDownloadUrl); }
    setJsonDownloadUrl(null);
    clearStorage();
  }, [clearStorage, jsonDownloadUrl]);

  const handleResetToServer = useCallback(() => {
    clearStorage();
    window.location.reload();
  }, [clearStorage]);

  const handleResetFilters = useCallback(() => {
    setDeptFilter('');
    setMingosFilter('all');
    setEfficiencyFilter('all');
    setHasEffectFilter('all');
    setVerdictFilter('all');
    setSearch('');
    setOnlyReduction(false);
  }, []);

  const handleExportXLSX = useCallback(() => {
    const source = data?.projects ?? [];
    if (source.length > 0) {
      exportEnrichedRM(source);
    }
  }, [data]);

  const handleExportFullReport = useCallback(() => {
    const source = data?.projects ?? [];
    if (source.length > 0) {
      exportFullReport(source);
    }
  }, [data]);

  // Always provide the handler so button is always visible
  const fullReportHandler = handleExportFullReport;

  // ===== Loading =====
  if (!checked || jsonLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-lg">Загрузка данных...</div>
      </div>
    );
  }

  // ===== No data =====
  if (!data) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-full max-w-[600px] px-4">
            <div className="text-foreground text-lg text-center mb-2 font-semibold">
              Загрузите данные из двух источников
            </div>
            <div className="text-muted-foreground text-[0.85rem] text-center mb-4">
              Файл РМ (issues) + Файл ДБ (Проекты 2026). Связь по ID проекта.
            </div>
            <FileUploader onFilesLoad={handleFilesLoad} onAIFileLoad={handleAIFileLoad} hasProjectData={false} isLoading={uploadLoading} aiLoading={aiLoading} fileNames={null} onClear={handleClearFiles} />
            {uploadError && <div className="mt-2 text-[0.85rem] text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</div>}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // TypeScript guard: these are non-null after the !data check above
  if (!filteredData || !efficiencyData) return null;

  const effectiveFileNames = sessionFileNames
    ? { ...sessionFileNames, ai: aiFileName || sessionFileNames.ai }
    : (storedFilename ? { rm: storedFilename, db: '', ai: aiFileName || undefined } : null);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <Header />

          {/* File Upload — two files */}
          <div className="mb-4">
            <FileUploader
              onFilesLoad={handleFilesLoad}
              onAIFileLoad={handleAIFileLoad}
              hasProjectData={true}
              isLoading={uploadLoading}
              aiLoading={aiLoading}
              fileNames={effectiveFileNames}
              onClear={handleClearFiles}
              onResetToServer={handleResetToServer}
              jsonDownloadUrl={jsonDownloadUrl}
              onExportXLSX={handleExportXLSX}
              onExportFullReport={fullReportHandler}
            />
            {uploadError && <div className="mt-2 text-[0.85rem] text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</div>}
          </div>

          {/* Sticky Filter Panel */}
          <FilterPanel
            departments={data.departmentList}
            deptFilter={deptFilter}
            onDeptFilterChange={setDeptFilter}
            mingosFilter={mingosFilter}
            onMingosFilterChange={setMingosFilter}
            efficiencyFilter={efficiencyFilter}
            onEfficiencyFilterChange={setEfficiencyFilter}
            hasEffectFilter={hasEffectFilter}
            onHasEffectFilterChange={setHasEffectFilter}
            search={search}
            onSearchChange={setSearch}
            onReset={handleResetFilters}
            onlyReduction={onlyReduction}
            onOnlyReductionChange={setOnlyReduction}
            filteredCount={adjustedProjects.length}
            totalCount={data.projects.length}
          />

          {/* Chart sections */}
          <ProjectsOverview data={filteredData} />
          <DepartmentDistribution data={filteredData} defaultOpen={false} />
          <CostsOverview data={filteredData} />
          <CostsByDepartment data={filteredData} defaultOpen={false} />
          <KPICards data={filteredData} />
          <ReductionByDepartment data={filteredData} defaultOpen={false} />
          <FinancialEffect data={filteredData} defaultOpen={false} />
          <ProjectEfficiency efficiencyData={efficiencyData} allProjects={adjustedProjects} verdictFilter={verdictFilter} onVerdictFilter={setVerdictFilter} />

          {/* Table */}
          <ProjectsTable projects={adjustedProjects} />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
