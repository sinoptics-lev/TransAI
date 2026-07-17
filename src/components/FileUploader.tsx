import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, X, Check, ArrowRight,
  Download, RotateCcw, Database, AlertTriangle,
  ShieldCheck, Loader2
} from 'lucide-react';
import { validateSingleFile } from '@/lib/api';
import type { SingleValidationResult } from '@/lib/api';

/* ── Types ── */
interface FileUploaderProps {
  onFilesLoad: (rmFile: File, dbFile: File, aiFile?: File) => void;
  onAIFileLoad: (aiFile: File) => void;
  onSaveToDatabase?: (rmFile: File, dbFile: File, aiFile?: File) => void;
  hasProjectData: boolean;
  isLoading: boolean;
  aiLoading?: boolean;
  saveToDbLoading?: boolean;
  fileNames?: { rm?: string | null; db?: string | null; ai?: string | null } | null;
  onClear: () => void;
  onResetToServer?: () => void;
  jsonDownloadUrl?: string | null;
  onExportXLSX?: () => void;
  onExportFullReport?: () => void;
  theme?: 'light' | 'dark';
}

type ZoneStatus = 'idle' | 'loading' | 'valid' | 'error';

interface ZoneState {
  file: File | null;
  status: ZoneStatus;
  message: string;
  missingCols?: string[];
}

const ZONE_IDLE: ZoneState = { file: null, status: 'idle', message: '' };

/* ── Single drop zone ── */
function FileDropZone({
  label,
  sublabel,
  required,
  state,
  onDrop,
  theme = 'light',
}: {
  label: string;
  sublabel: string;
  required: boolean;
  state: ZoneState;
  onDrop: (f: File) => void;
  theme?: 'light' | 'dark';
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.xlsx')) {
      onDrop(files[0]);
    }
  }, [onDrop]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onDrop(files[0]);
    }
  }, [onDrop]);

  // ==================== DARK THEME LAYOUT ====================
  if (theme === 'dark') {
    if (state.file) {
      // After upload (or error/loading with selected file)
      let borderClass = 'border-[#10b981]';
      let iconBgClass = 'bg-green-500/10 border-green-500/20 shadow-[0_0_15px_rgba(16,185,129,0.35)]';
      let iconElement = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      let statusTextClass = 'text-emerald-400';

      if (state.status === 'error') {
        borderClass = 'border-[#ff4949]';
        iconBgClass = 'bg-[#ff4949]/10 border-[#ff4949]/20 shadow-[0_0_15px_rgba(255,73,73,0.35)]';
        iconElement = <AlertTriangle className="w-5 h-5 text-[#ff4949]" />;
        statusTextClass = 'text-[#ff4949]';
      } else if (state.status === 'loading') {
        borderClass = 'border-blue-500/50';
        iconBgClass = 'bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.25)]';
        iconElement = <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
        statusTextClass = 'text-blue-400';
      }

      return (
        <div 
          className={`relative rounded-xl px-5 py-4 bg-[#1e2227] border transition-all flex items-center gap-4 ${borderClass}`}
        >
          {/* Circular Shield Check icon with protective green aura */}
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border ${iconBgClass}`}>
            {iconElement}
          </div>

          {/* Text block: label, filename, validation status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 leading-none mb-1">
              <span className="text-[0.75rem] font-medium text-slate-400">{label}</span>
              {required && <span className="text-[#ff4949] font-bold text-xs">*</span>}
            </div>
            
            <div className="text-[0.85rem] font-bold text-white truncate my-0.5" title={state.file.name}>
              {state.file.name}
            </div>

            {state.message && (
              <div className={`text-[0.72rem] font-semibold flex items-center gap-1 ${statusTextClass}`}>
                {state.message}
              </div>
            )}

            {/* Error missing columns */}
            {state.status === 'error' && state.missingCols && state.missingCols.length > 0 && (
              <div className="text-[0.68rem] text-[#ff4949]/90 mt-1 leading-tight font-medium">
                Не найдено: {state.missingCols.join(', ')}
              </div>
            )}
          </div>

          {/* Replace Button on the far right */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="flex-shrink-0 text-[0.8rem] font-bold text-[#ff4949] hover:text-red-400 underline cursor-pointer bg-transparent border-none p-1 transition-colors relative z-10"
            title="Заменить файл"
          >
            Заменить
          </button>

          {/* Sparkle decoration on bottom right */}
          <svg className="absolute bottom-3 right-3 w-3.5 h-3.5 text-slate-600 opacity-40 select-none pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2" />
          </svg>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={handleChange}
          />
        </div>
      );
    }

    // Empty Drop Zone (Before upload)
    const emptyBorder = isDragOver 
      ? 'border-[#ff4949] bg-[#ff4949]/5' 
      : 'border-[#3e4654] bg-[#1e2227] hover:border-[#ff4949]/50 hover:bg-[#22252a]/70';

    return (
      <div
        className={`relative rounded-xl border-2 border-dashed py-7 px-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[120px] ${emptyBorder}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleChange} />
        
        {/* Document Icon with glowing red light */}
        <div className="relative mb-2.5 flex items-center justify-center">
          <div className="w-11 h-11 rounded-xl bg-[#ff4949]/10 border border-[#ff4949]/20 flex items-center justify-center shadow-[0_0_20px_rgba(255,73,73,0.25)] transition-shadow">
            <FileSpreadsheet className="w-5 h-5 text-[#ff4949]" />
          </div>
        </div>

        {/* Label */}
        <div className="text-[0.85rem] font-bold text-slate-200 flex items-center gap-1 justify-center">
          {label}
          {required && <span className="text-[#ff4949] font-bold text-xs">*</span>}
        </div>

        {/* Sublabel */}
        <div className="text-[0.72rem] text-slate-400 font-semibold mt-1">{sublabel}</div>
      </div>
    );
  }

  // ==================== LIGHT THEME LAYOUT (ORIGINAL) ====================
  const statusBorder =
    state.status === 'valid' ? 'border-green-300 bg-green-50' :
    state.status === 'error'  ? 'border-red-300 bg-red-50' :
    state.status === 'loading'? 'border-blue-300 bg-blue-50' :
    isDragOver                ? 'border-[#1a56db] bg-[#e1effe]' :
                                'border-[#cbd5e1] bg-white hover:border-[#94a3b8] hover:bg-[#f8fafc]';

  const statusIcon =
    state.status === 'valid'  ? <ShieldCheck className="w-4 h-4 text-green-600" /> :
    state.status === 'error'  ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
    state.status === 'loading'? <Loader2 className="w-4 h-4 text-blue-600 animate-spin" /> :
                                 <FileSpreadsheet className="w-4 h-4 text-[#1a56db]" />;

  const statusIconBg =
    state.status === 'valid'  ? 'bg-green-100' :
    state.status === 'error'  ? 'bg-red-100' :
    state.status === 'loading'? 'bg-blue-100' :
                                 'bg-[#e1effe]';

  if (state.file) {
    return (
      <div className={`rounded-xl px-4 py-3 border ${statusBorder}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${statusIconBg}`}>
            {statusIcon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[0.75rem] text-[#718096]">{label}</span>
              {required && <span className="text-[0.65rem] text-red-400">*</span>}
            </div>
            <div className="text-[0.85rem] font-semibold text-[#1a202c] truncate">{state.file.name}</div>
            {state.message && (
              <div className={`text-[0.7rem] mt-0.5 leading-tight ${
                state.status === 'error' ? 'text-red-600' :
                state.status === 'valid' ? 'text-green-700' :
                state.status === 'loading' ? 'text-blue-600' : 'text-[#718096]'
              }`}>
                {state.message}
              </div>
            )}
            {state.status === 'error' && state.missingCols && state.missingCols.length > 0 && (
              <div className="text-[0.7rem] text-red-500 mt-1">
                Не найдено: {state.missingCols.join(', ')}
              </div>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="flex-shrink-0 text-[0.7rem] text-[#1a56db] hover:text-[#1e429f] underline cursor-pointer bg-transparent border-none p-1"
            title="Заменить файл"
          >
            Заменить
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed px-4 py-4 text-center cursor-pointer transition-all ${statusBorder}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleChange} />
      <div className="flex flex-col items-center gap-1.5">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusIconBg}`}>
          {statusIcon}
        </div>
        <div className="text-[0.85rem] font-semibold text-[#1a202c]">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </div>
        <div className="text-[0.7rem] text-[#718096]">{sublabel}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main FileUploader
   ═══════════════════════════════════════════ */
export function FileUploader({
  onFilesLoad,
  onAIFileLoad,
  onSaveToDatabase,
  hasProjectData,
  isLoading,
  aiLoading,
  saveToDbLoading,
  fileNames,
  onClear,
  onResetToServer,
  jsonDownloadUrl,
  onExportXLSX,
  onExportFullReport,
  theme = 'light',
}: FileUploaderProps) {
  const [rm, setRm] = useState<ZoneState>(ZONE_IDLE);
  const [db, setDb] = useState<ZoneState>(ZONE_IDLE);
  const [ai, setAi] = useState<ZoneState>(ZONE_IDLE);

  const canLoad = rm.status === 'valid' && db.status === 'valid';
  const canSaveToDb = canLoad && !!onSaveToDatabase;

  /* ── Validate single file ── */
  const validateFile = useCallback(async (
    file: File,
    type: 'rm' | 'db' | 'ai',
    setState: React.Dispatch<React.SetStateAction<ZoneState>>
  ) => {
    // AI file — skip validation
    if (type === 'ai') {
      setState({ file, status: 'valid', message: '✓ Загружен' });
      return;
    }

    setState({ file, status: 'loading', message: 'Проверка структуры...' });

    try {
      const result = await validateSingleFile(file, type);

      if (result.ok && result.valid) {
        setState({ file, status: 'valid', message: '✓ Структура OK' });
      } else {
        setState({
          file,
          status: 'error',
          message: result.message || 'Ошибка структуры',
          missingCols: result.missing,
        });
      }
    } catch (err) {
      setState({
        file,
        status: 'error',
        message: 'Ошибка проверки: ' + (err instanceof Error ? err.message : String(err)),
      });
    }
  }, []);

  /* ── Drop handlers ── */
  const handleRmDrop = useCallback((f: File) => {
    validateFile(f, 'rm', setRm);
  }, [validateFile]);

  const handleDbDrop = useCallback((f: File) => {
    validateFile(f, 'db', setDb);
  }, [validateFile]);

  const handleAiDrop = useCallback((f: File) => {
    validateFile(f, 'ai', setAi);
  }, [validateFile]);

  /* ── Actions ── */
  const handleLoad = () => {
    if (rm.file && db.file && canLoad) {
      onFilesLoad(rm.file, db.file, ai.file || undefined);
    } else if (ai.file && hasProjectData) {
      onAIFileLoad(ai.file);
    }
  };

  const handleSaveToDb = () => {
    if (rm.file && db.file && canLoad && onSaveToDatabase) {
      onSaveToDatabase(rm.file, db.file, ai.file || undefined);
    }
  };

  const handleClearLocal = () => {
    setRm(ZONE_IDLE);
    setDb(ZONE_IDLE);
    setAi(ZONE_IDLE);
    onClear();
  };

  /* ═══════ Already loaded state ═══════ */
  if (fileNames?.rm && fileNames?.db) {
    return (
      <motion.div
        className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-green-200"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.85rem] font-semibold text-[#1a202c] truncate">
            Данные загружены: {fileNames.rm} + {fileNames.db}{fileNames.ai ? ' + ' + fileNames.ai : ''}
          </div>
          <div className="text-[0.75rem] text-[#718096]">
            {onSaveToDatabase ? 'Данные сохранены в БД' : 'Сохраните в базу данных для общего доступа'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onExportXLSX && (
            <button onClick={onExportXLSX} className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-[#7c3aed] bg-[#f3e8ff] rounded-lg border-none cursor-pointer hover:bg-[#e9d5ff] transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" />XLSX
            </button>
          )}
          <button onClick={onExportFullReport} disabled={!onExportFullReport} className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-[#0e9f6e] bg-[#f0fdf4] rounded-lg border-none cursor-pointer hover:bg-[#dcfce7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <FileSpreadsheet className="w-3.5 h-3.5" />Отчет
          </button>
          {jsonDownloadUrl && (
            <a href={jsonDownloadUrl} download="projects_data.json" className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-[#1a56db] bg-[#e1effe] rounded-lg border-none cursor-pointer hover:bg-[#bfdbfe] transition-colors no-underline" onClick={e => e.stopPropagation()}>
              <Download className="w-3.5 h-3.5" />JSON
            </a>
          )}
          {onResetToServer && (
            <button onClick={onResetToServer} className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-[#059669] bg-[#d1fae5] rounded-lg border-none cursor-pointer hover:bg-[#a7f3d0] transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />Данные сервера
            </button>
          )}
          <button onClick={handleClearLocal} className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-[#e02424] bg-[#fee2e2] rounded-lg border-none cursor-pointer hover:bg-[#fecaca] transition-colors">
            <X className="w-3.5 h-3.5" />Удалить
          </button>
        </div>
      </motion.div>
    );
  }

  /* ═══════ Upload form ═══════ */
  const containerBg = theme === 'dark' 
    ? 'bg-[#2d323a] border-[#3e4654] text-white' 
    : 'bg-white border-[#e2e8f0] text-[#1a202c]';

  const titleText = theme === 'dark' ? 'text-white' : 'text-[#1a202c]';
  const iconColor = theme === 'dark' ? 'text-[#ff4949]' : 'text-[#1a56db]';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className={`rounded-xl p-4 shadow-sm border transition-all ${containerBg}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className={`text-[0.85rem] font-semibold flex items-center gap-2 ${titleText}`}>
            <FileSpreadsheet className={`w-4 h-4 ${iconColor}`} />
            Загрузка данных
          </div>
          <div className="flex items-center gap-2">
            {onExportFullReport && (
              <button 
                onClick={onExportFullReport} 
                disabled={!onExportFullReport} 
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold rounded-lg border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  theme === 'dark' 
                    ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40' 
                    : 'text-[#0e9f6e] bg-[#f0fdf4] hover:bg-[#dcfce7]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />Отчет
              </button>
            )}
            {onResetToServer && (
              <button 
                onClick={onResetToServer} 
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold rounded-lg border-none cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'text-emerald-300 bg-[#1e2227] hover:bg-[#22252a] border border-[#3e4654]'
                    : 'text-[#059669] bg-[#d1fae5] hover:bg-[#a7f3d0]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />Данные сервера
              </button>
            )}
          </div>
        </div>

        {/* Drop zones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FileDropZone
            label="Данные из РМ"
            sublabel="issues_*.xlsx"
            required={true}
            state={rm}
            onDrop={handleRmDrop}
            theme={theme}
          />
          <FileDropZone
            label="Данные из ДБ"
            sublabel="Проекты 2026.xlsx"
            required={true}
            state={db}
            onDrop={handleDbDrop}
            theme={theme}
          />
          <FileDropZone
            label="Аналитика ИИ"
            sublabel="ai_*.xlsx (опционально)"
            required={false}
            state={ai}
            onDrop={handleAiDrop}
            theme={theme}
          />
        </div>

        {/* Summary status */}
        <AnimatePresence>
          {(rm.status === 'error' || db.status === 'error') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className={`border rounded-lg px-4 py-3 ${
                theme === 'dark' 
                  ? 'bg-[#ff4949]/10 border-[#ff4949]/30' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-[#ff4949]' : 'text-red-600'}`} />
                  <span className={`text-[0.85rem] font-semibold ${theme === 'dark' ? 'text-white' : 'text-red-800'}`}>
                    {rm.status === 'error' && db.status === 'error'
                      ? 'Оба файла не прошли проверку'
                      : 'Файл не прошёл проверку структуры'}
                  </span>
                </div>
                <div className={`text-[0.75rem] ${theme === 'dark' ? 'text-slate-300' : 'text-red-700'}`}>
                  Загрузите корректный файл или нажмите «Заменить» для повторной загрузки.
                  Проверьте, что файл содержит все обязательные колонки.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All valid — success notice */}
        <AnimatePresence>
          {rm.status === 'valid' && db.status === 'valid' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className={`border rounded-lg px-4 py-2 flex items-center gap-2 ${
                theme === 'dark' 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <ShieldCheck className={`w-4 h-4 flex-shrink-0 ${theme === 'dark' ? 'text-emerald-400' : 'text-green-600'}`} />
                <span className={`text-[0.8rem] ${theme === 'dark' ? 'text-slate-200' : 'text-green-700'}`}>
                  Оба файла прошли проверку. Можно обновить дашборд{onSaveToDatabase ? ' и сохранить в БД' : ''}.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        {canLoad && (
          <motion.div
            className="mt-3 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              onClick={handleLoad}
              disabled={isLoading}
              className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-[0.9rem] font-semibold border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                theme === 'dark'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/15'
                  : 'bg-[#1a56db] hover:bg-[#1e429f]'
              }`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {ai.file ? 'Обновить дашборд + ИИ' : 'Обновить дашборд'}
            </button>

            {canSaveToDb && (
              <button
                onClick={handleSaveToDb}
                disabled={saveToDbLoading}
                className={`flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-[0.9rem] font-semibold border-none cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/15'
                    : 'bg-[#0e9f6e] hover:bg-[#059669]'
                }`}
              >
                {saveToDbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                {saveToDbLoading ? 'Сохранение...' : 'Сохранить в БД'}
              </button>
            )}

            <span className={`text-[0.8rem] ${theme === 'dark' ? 'text-slate-400' : 'text-[#718096]'}`}>
              Связь по ID: РМ (№) ↔ ДБ (ID задачи){ai.file ? ' ↔ ИИ (ID проекта)' : ''}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
