import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardData, computeDashboardData, computeEfficiencyData } from '@/hooks/useDashboardData';
import { parseTwoXLSX, exportEnrichedRM, setRMHeaders, exportFullReport, parseAIFile } from '@/hooks/useXLSXParser';
import { useLocalStorageProjects } from '@/hooks/useLocalStorage';
import { TooltipProvider } from '@/components/TooltipContext';
import { FileUploader } from '@/components/FileUploader';
import { FilterPanel } from '@/components/FilterPanel';
import { DarkThemeBackground } from '@/components/DarkThemeBackground';
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
import { DynamicsChart } from '@/sections/DynamicsChart';
import { uploadProjects, isApiAvailable } from '@/lib/api';
import type { AIAnalysisMap } from '@/lib/api';
import type { Project, EfficiencyData } from '@/types/project';
import { ServerOff, X, Maximize2, Download, Palette, Moon, Sun } from 'lucide-react';
import brandbookImg from '@/assets/images/transai_brandbook_dashboard_1784122496011.jpg';
import brandbookLightImg from '@/assets/images/transai_brandbook_light_dashboard_1784124278831.jpg';
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
  const [saveToDbLoading, setSaveToDbLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiFileName, setAiFileName] = useState<string | null>(null);
  const [dbSaveMessage, setDbSaveMessage] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [showBrandbookModal, setShowBrandbookModal] = useState(false);
  const [brandbookVariant, setBrandbookVariant] = useState<'dark' | 'light'>('light');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('transai_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const [showUploader, setShowUploader] = useState<boolean>(() => {
    const saved = localStorage.getItem('transai_show_uploader');
    return saved !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('transai_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('transai_show_uploader', String(showUploader));
  }, [showUploader]);

  // Check PHP API availability on mount
  useEffect(() => {
    isApiAvailable().then(setApiAvailable);
  }, []);

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
  const [aiTagFilter, setAiTagFilter] = useState<'all' | 'yes' | 'no'>('all');

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
    if (aiTagFilter === 'yes') result = result.filter(p => p.tags ? p.tags.split(',').map(t => t.trim()).includes('ИИ') : false);
    if (aiTagFilter === 'no') result = result.filter(p => p.tags ? !p.tags.split(',').map(t => t.trim()).includes('ИИ') : true);
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
  }, [data, onlyReduction, deptFilter, aiTagFilter, mingosFilter, efficiencyFilter, hasEffectFilter, verdictFilter, search]);

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
    setDbSaveMessage(null);
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

    // ===== Extract AI data for DB =====
    const aiData: AIAnalysisMap = {};
    result.projects.forEach((p: Project) => {
      if (p.aiAnalysis) {
        const linkMatch = p.link.match(/\/issues\/(\d+)/);
        const rmId = linkMatch ? Number(linkMatch[1]) : 0;
        if (rmId > 0) aiData[rmId] = p.aiAnalysis;
      }
    });

    // ===== Auto-save to database =====
    if (result.projects.length > 0) {
      setSaveToDbLoading(true);
      try {
        const uploadResult = await uploadProjects(result.projects, {
          rmFilename: rmFile.name,
          dbFilename: dbFile.name,
          aiFilename: aiFile?.name,
        }, Object.keys(aiData).length > 0 ? aiData : undefined);
        if (uploadResult.ok) {
          setDbSaveMessage('\u0410\u0432\u0442\u043e\u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435 \u0432 \u0411\u0414: ' + uploadResult.message);
        } else {
          setDbSaveMessage('\u0411\u0414: ' + uploadResult.message);
        }
      } catch (err) {
        setDbSaveMessage('\u0411\u0413 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430');
      } finally {
        setSaveToDbLoading(false);
      }
    }
  }, [saveToStorage]);

  // ===== Save to Database handler =====
  const handleSaveToDatabase = useCallback(async (rmFile: File, dbFile: File, aiFile?: File) => {
    if (!effectiveProjects || effectiveProjects.length === 0) {
      setUploadError('Нет данных для сохранения. Сначала загрузите файлы.');
      return;
    }
    // Extract AI data
    const aiData: AIAnalysisMap = {};
    effectiveProjects.forEach((p: Project) => {
      if (p.aiAnalysis) {
        const linkMatch = p.link.match(/\/issues\/(\d+)/);
        const rmId = linkMatch ? Number(linkMatch[1]) : 0;
        if (rmId > 0) aiData[rmId] = p.aiAnalysis;
      }
    });
    setSaveToDbLoading(true);
    setUploadError(null);
    setDbSaveMessage(null);
    try {
      const result = await uploadProjects(effectiveProjects, {
        rmFilename: rmFile.name,
        dbFilename: dbFile.name,
        aiFilename: aiFile?.name,
      }, Object.keys(aiData).length > 0 ? aiData : undefined);
      if (result.ok) {
        setDbSaveMessage(result.message);
      } else {
        setUploadError(result.error || 'Ошибка сохранения в базу данных');
      }
    } catch (err) {
      setUploadError('Ошибка сохранения: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaveToDbLoading(false);
    }
  }, [effectiveProjects]);

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
      const cleaned: Project = { ...p };
      delete (cleaned as { aiAnalysis?: unknown }).aiAnalysis;
      return cleaned;
    });

    setSessionProjects(updated);
    saveToStorage(updated, sessionFileNames ? `${sessionFileNames.rm} + ${sessionFileNames.db} + ${aiFile.name}` : aiFile.name);

    // ===== Auto-save AI analysis to DB =====
    const aiData: AIAnalysisMap = {};
    updated.forEach((p: Project) => {
      if (p.aiAnalysis) {
        const linkMatch = p.link.match(/\/issues\/(\d+)/);
        const rmId = linkMatch ? Number(linkMatch[1]) : 0;
        if (rmId > 0) aiData[rmId] = p.aiAnalysis;
      }
    });

    if (Object.keys(aiData).length > 0) {
      setSaveToDbLoading(true);
      try {
        const uploadResult = await uploadProjects(updated, {
          rmFilename: sessionFileNames?.rm || '',
          dbFilename: sessionFileNames?.db || '',
          aiFilename: aiFile.name,
        }, aiData);
        if (uploadResult.ok) {
          setDbSaveMessage('\u0418\u0418-\u0430\u043d\u0430\u043b\u0438\u0437 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d: ' + uploadResult.message);
        }
      } catch {
        /* silent fail for AI-only save */
      } finally {
        setSaveToDbLoading(false);
      }
    }
  }, [effectiveProjects, saveToStorage, sessionFileNames]);

  const handleClearFiles = useCallback(() => {
    setSessionProjects(null);
    setSessionFileNames(null);
    if (jsonDownloadUrl) { URL.revokeObjectURL(jsonDownloadUrl); }
    setJsonDownloadUrl(null);
    setDbSaveMessage(null);
    clearStorage();
  }, [clearStorage, jsonDownloadUrl]);

  const handleResetToServer = useCallback(() => {
    clearStorage();
    window.location.reload();
  }, [clearStorage]);

  const handleResetFilters = useCallback(() => {
    setDeptFilter('');
    setAiTagFilter('all');
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

  const brandbookModalElement = showBrandbookModal ? (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#1e293b] border border-[#334155] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0f172a]/50 gap-4">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-[#ff4949]" />
            <div>
              <h3 className="text-white font-semibold text-sm sm:text-base">Концепт нового дизайна: Брендбук «Максимум»</h3>
              <p className="text-slate-400 text-[0.7rem] sm:text-xs">Предпросмотр обновлённого корпоративного интерфейса TransAI</p>
            </div>
          </div>

          {/* Theme Selector Tab Buttons */}
          <div className="flex bg-[#0f172a] rounded-lg p-1 border border-[#334155] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBrandbookVariant('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                brandbookVariant === 'dark' 
                  ? 'bg-gradient-to-r from-red-500 to-[#ff4949] text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Тёмная</span>
            </button>
            <button
              type="button"
              onClick={() => setBrandbookVariant('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                brandbookVariant === 'light' 
                  ? 'bg-gradient-to-r from-red-500 to-[#ff4949] text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Светлая</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <a 
              href={brandbookVariant === 'dark' ? brandbookImg : brandbookLightImg} 
              download={brandbookVariant === 'dark' ? "transai_maximum_dark.jpg" : "transai_maximum_light.jpg"} 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#334155] hover:bg-[#475569] text-white text-xs font-medium transition"
              title="Скачать изображение"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Скачать</span>
            </a>
            <button 
              onClick={() => setShowBrandbookModal(false)}
              className="p-1.5 rounded-lg bg-[#334155] hover:bg-[#475569] text-slate-300 hover:text-white transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-[#0f172a] relative min-h-[300px]">
          <img 
            src={brandbookVariant === 'dark' ? brandbookImg : brandbookLightImg} 
            alt={`Брендбук Максимум Концепт - ${brandbookVariant === 'dark' ? 'Тёмная' : 'Светлая'} тема`} 
            className="max-w-full max-h-[64vh] object-contain rounded-lg shadow-lg border border-[#334155]/50 transition-opacity duration-300"
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[#334155] bg-[#0f172a]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[0.7rem] sm:text-xs text-slate-400">
          <span>
            {brandbookVariant === 'dark' 
              ? 'Тёмная тема: глубокий серый (#2d323a), глубокий синий (#0f172a) и фирменный красный (#ff4949).' 
              : 'Светлая тема: чистый белый (#ffffff), светлый серый (#f8fafc) и фирменный красный (#ff4949) акцент.'
            }
          </span>
          <button 
            onClick={() => setShowBrandbookModal(false)}
            className="text-[#ff4949] hover:underline font-medium self-end sm:self-auto"
          >
            Закрыть предпросмотр
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ===== Loading =====
  if (!checked || jsonLoading) {
    return (
      <div className="relative min-h-screen app-bg flex items-center justify-center text-[#1a202c]">
        {theme === 'dark' && <DarkThemeBackground />}
        <div className="relative z-10 text-[#718096] text-lg font-semibold">Загрузка данных...</div>
      </div>
    );
  }

  // ===== No data =====
  if (!data) {
    return (
      <TooltipProvider>
        <div className="relative min-h-screen app-bg flex items-center justify-center text-[#1a202c]">
          {theme === 'dark' && <DarkThemeBackground />}
          <div className="relative z-10 w-full max-w-[600px] px-4 py-8">
            <div className="text-center mb-6">
              <button
                type="button"
                onClick={() => setShowBrandbookModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#ff4949] to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
              >
                <Palette className="w-4.5 h-4.5" />
                <span>Посмотреть концепт брендбука «Максимум»</span>
              </button>
            </div>

            <div className="text-[#1a202c] text-lg text-center mb-2 font-semibold">
              Загрузите данные из двух источников
            </div>
            <div className="text-[#718096] text-[0.85rem] text-center mb-4">
              Файл РМ (issues) + Файл ДБ (Проекты 2026). Связь по ID проекта.
            </div>
            <FileUploader
              onFilesLoad={handleFilesLoad}
              onAIFileLoad={handleAIFileLoad}
              onSaveToDatabase={handleSaveToDatabase}
              hasProjectData={false}
              isLoading={uploadLoading}
              aiLoading={aiLoading}
              saveToDbLoading={saveToDbLoading}
              fileNames={null}
              onClear={handleClearFiles}
            />
            {uploadError && <div className="mt-2 text-[0.85rem] text-[#e02424] bg-[#fee2e2] rounded-lg px-3 py-2">{uploadError}</div>}
            {dbSaveMessage && <div className="mt-2 text-[0.85rem] text-[#0e9f6e] bg-[#f0fdf4] rounded-lg px-3 py-2">{dbSaveMessage}</div>}
          </div>
        </div>
        {brandbookModalElement}
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
      <div className="relative min-h-screen app-bg text-[#1a202c]">
        {theme === 'dark' && <DarkThemeBackground />}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-6">
          <Header 
            theme={theme} 
            onThemeToggle={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            onShowBrandbook={() => setShowBrandbookModal(true)} 
            showUploader={showUploader}
            onUploaderToggle={() => setShowUploader(prev => !prev)}
          />

          {/* File Upload — two files with AnimatePresence */}
          <AnimatePresence initial={false}>
            {showUploader && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                {/* API availability warning */}
                {apiAvailable === false && (
                  <div className="mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-[0.8rem] text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/45 dark:text-amber-200">
                    <ServerOff className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>PHP API недоступно.</strong> Валидация XLSX и сохранение в БД отключены.
                      Дашборд работает в локальном режиме.
                      Для включения БД настройте PHP для папки <code className="bg-amber-100 dark:bg-amber-950 px-1 rounded">api/</code> на хостинге.
                    </span>
                  </div>
                )}

                <div className="mb-1">
                  <FileUploader
                    onFilesLoad={handleFilesLoad}
                    onAIFileLoad={handleAIFileLoad}
                    onSaveToDatabase={apiAvailable ? handleSaveToDatabase : undefined}
                    hasProjectData={true}
                    isLoading={uploadLoading}
                    aiLoading={aiLoading}
                    saveToDbLoading={saveToDbLoading}
                    fileNames={effectiveFileNames}
                    onClear={handleClearFiles}
                    onResetToServer={handleResetToServer}
                    jsonDownloadUrl={jsonDownloadUrl}
                    onExportXLSX={handleExportXLSX}
                    onExportFullReport={fullReportHandler}
                    theme={theme}
                  />
                  {uploadError && <div className="mt-2 text-[0.85rem] text-[#e02424] bg-[#fee2e2] dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg px-3 py-2 border">{uploadError}</div>}
                  {dbSaveMessage && <div className="mt-2 text-[0.85rem] text-[#0e9f6e] bg-[#f0fdf4] dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 rounded-lg px-3 py-2 border">{dbSaveMessage}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky Filter Panel */}
          <FilterPanel
            departments={data.departmentList}
            deptFilter={deptFilter}
            onDeptFilterChange={setDeptFilter}
            aiTagFilter={aiTagFilter}
            onAiTagFilterChange={setAiTagFilter}
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
            theme={theme}
          />

          {/* Chart sections */}
          <ProjectsOverview data={filteredData} />
          <DepartmentDistribution data={filteredData} defaultOpen={false} />
          <CostsOverview data={filteredData} />
          <CostsByDepartment data={filteredData} defaultOpen={false} />
          <KPICards data={filteredData} />
          <ReductionByDepartment data={filteredData} defaultOpen={false} />
          <FinancialEffect data={filteredData} defaultOpen={false} />
          <ProjectEfficiency efficiencyData={efficiencyData} allProjects={adjustedProjects} verdictFilter={verdictFilter} onVerdictFilter={setVerdictFilter} theme={theme} />

          {/* Dynamics block */}
          <DynamicsChart projects={adjustedProjects} theme={theme} />

          {/* Table */}
          <ProjectsTable projects={adjustedProjects} />
        </div>
      </div>
      {brandbookModalElement}
    </TooltipProvider>
  );
}

export default App;
