import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, X, Check, ArrowRight,
  Download, RotateCcw, Database, AlertCircle, Loader2
} from 'lucide-react';
import { validateSingleFile } from '@/lib/api';
import type { SingleValidationResult } from '@/lib/api';

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
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

function FileDropZone({
  label,
  sublabel,
  file,
  onDrop,
  isLoading,
  validation,
  validationResult,
}: {
  label: string;
  sublabel: string;
  file: File | null;
  onDrop: (f: File) => void;
  isLoading: boolean;
  validation: ValidationState;
  validationResult: SingleValidationResult | null;
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

  if (file) {
    const statusColor = validation === 'valid'
      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
      : validation === 'invalid'
        ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        : validation === 'validating'
          ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
          : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800';

    const StatusIcon = validation === 'validating'
      ? Loader2
      : validation === 'invalid'
        ? AlertCircle
        : Check;

    const iconColor = validation === 'valid'
      ? 'text-emerald-600 dark:text-emerald-400'
      : validation === 'invalid'
        ? 'text-red-500'
        : validation === 'validating'
          ? 'text-blue-500 animate-spin'
          : 'text-emerald-600 dark:text-emerald-400';

    const iconBg = validation === 'valid'
      ? 'bg-emerald-100 dark:bg-emerald-900/40'
      : validation === 'invalid'
        ? 'bg-red-100 dark:bg-red-900/40'
        : validation === 'validating'
          ? 'bg-blue-100 dark:bg-blue-900/40'
          : 'bg-emerald-100 dark:bg-emerald-900/40';

    return (
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${statusColor}`}>
        <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <StatusIcon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.75rem] text-muted-foreground">{label}</div>
          <div className="text-[0.85rem] font-semibold text-foreground truncate">{file.name}</div>
          {validationResult && validation === 'invalid' && (
            <div className="text-[0.7rem] text-red-500 mt-0.5">{validationResult.message}</div>
          )}
          {validation === 'validating' && (
            <div className="text-[0.7rem] text-blue-500 mt-0.5">Проверка...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed px-4 py-4 text-center cursor-pointer transition-all ${
        isDragOver
          ? 'border-mingos-red bg-mingos-red/5'
          : 'border-border bg-card hover:border-muted-foreground hover:bg-muted'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleChange} />
      <div className="flex flex-col items-center gap-1.5">
        {isLoading ? (
          <div className="w-8 h-8 rounded-full bg-mingos-red/10 flex items-center justify-center animate-spin">
            <Upload className="w-4 h-4 text-mingos-red" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-mingos-red/10 flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4 text-mingos-red" />
          </div>
        )}
        <div className="text-[0.85rem] font-semibold text-foreground">{label}</div>
        <div className="text-[0.7rem] text-muted-foreground">{sublabel}</div>
      </div>
    </div>
  );
}

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
}: FileUploaderProps) {
  const [rmFile, setRmFile] = useState<File | null>(null);
  const [dbFile, setDbFile] = useState<File | null>(null);
  const [aiFile, setAiFile] = useState<File | null>(null);

  const [rmValidation, setRmValidation] = useState<ValidationState>('idle');
  const [dbValidation, setDbValidation] = useState<ValidationState>('idle');
  const [rmValidationResult, setRmValidationResult] = useState<SingleValidationResult | null>(null);
  const [dbValidationResult, setDbValidationResult] = useState<SingleValidationResult | null>(null);

  const handleRmDrop = useCallback(async (f: File) => {
    setRmFile(f);
    setRmValidation('validating');
    const result = await validateSingleFile(f, 'rm');
    setRmValidationResult(result);
    setRmValidation(result.valid ? 'valid' : 'invalid');
  }, []);

  const handleDbDrop = useCallback(async (f: File) => {
    setDbFile(f);
    setDbValidation('validating');
    const result = await validateSingleFile(f, 'db');
    setDbValidationResult(result);
    setDbValidation(result.valid ? 'valid' : 'invalid');
  }, []);

  const handleAiDrop = useCallback((f: File) => setAiFile(f), []);

  const handleLoad = () => {
    if (rmFile && dbFile && rmValidation !== 'invalid' && dbValidation !== 'invalid') {
      onFilesLoad(rmFile, dbFile, aiFile || undefined);
    } else if (aiFile && hasProjectData) {
      onAIFileLoad(aiFile);
    }
  };

  const handleSaveDb = () => {
    if (onSaveToDatabase && rmFile && dbFile) {
      onSaveToDatabase(rmFile, dbFile, aiFile || undefined);
    }
  };

  const handleClearLocal = () => {
    setRmFile(null);
    setDbFile(null);
    setAiFile(null);
    setRmValidation('idle');
    setDbValidation('idle');
    setRmValidationResult(null);
    setDbValidationResult(null);
    onClear();
  };

  const canLoad = ((rmFile && dbFile && rmValidation !== 'invalid' && dbValidation !== 'invalid')
    || (aiFile && hasProjectData));
  const canSaveDb = onSaveToDatabase && rmFile && dbFile && rmValidation === 'valid' && dbValidation === 'valid';

  if (fileNames?.rm && fileNames?.db) {
    return (
      <motion.div
        className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 shadow-sm border border-emerald-200 dark:border-emerald-800"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.85rem] font-semibold text-foreground truncate">
            Данные загружены: {fileNames.rm} + {fileNames.db}{fileNames.ai ? ' + ' + fileNames.ai : ''}
          </div>
          <div className="text-[0.75rem] text-muted-foreground">Для всех пользователей — скачайте JSON и замените на сервере</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {onExportXLSX && (
            <button
              onClick={onExportXLSX}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20 rounded-lg border-none cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-950/40 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              XLSX
            </button>
          )}
          <button
            onClick={onExportFullReport}
            disabled={!onExportFullReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-none cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Отчет
          </button>
          {jsonDownloadUrl && (
            <a
              href={jsonDownloadUrl}
              download="projects_data.json"
              className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-colors no-underline"
              onClick={e => e.stopPropagation()}
            >
              <Download className="w-3.5 h-3.5" />
              JSON
            </a>
          )}
          {onResetToServer && (
            <button
              onClick={onResetToServer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-none cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Данные сервера
            </button>
          )}
          <button
            onClick={handleClearLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg border-none cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Удалить
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[0.85rem] font-semibold text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-mingos-red" />
            Загрузка данных
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportFullReport}
              disabled={!onExportFullReport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-none cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Отчет
            </button>
            {onResetToServer && (
              <button
                onClick={onResetToServer}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[0.8rem] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border-none cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Данные сервера
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FileDropZone
            label="Данные из РМ"
            sublabel="issues_2026_with_linked*.xlsx"
            file={rmFile}
            onDrop={handleRmDrop}
            isLoading={isLoading}
            validation={rmValidation}
            validationResult={rmValidationResult}
          />
          <FileDropZone
            label="Данные из ДБ"
            sublabel="Проекты 2026.xlsx"
            file={dbFile}
            onDrop={handleDbDrop}
            isLoading={isLoading}
            validation={dbValidation}
            validationResult={dbValidationResult}
          />
          <FileDropZone
            label="Аналитика ИИ"
            sublabel="ai_project_analysis.xlsx (опционально)"
            file={aiFile}
            onDrop={handleAiDrop}
            isLoading={aiLoading ?? false}
            validation="idle"
            validationResult={null}
          />
        </div>

        <AnimatePresence>
          {canLoad && (
            <motion.div
              className="mt-3 flex items-center gap-3 flex-wrap"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <button
                onClick={handleLoad}
                className="flex items-center gap-2 px-5 py-2.5 bg-mingos-red text-white rounded-lg text-[0.9rem] font-semibold border-none cursor-pointer hover:bg-red-600 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                {rmFile && dbFile
                  ? (aiFile ? 'Обновить дашборд + ИИ' : 'Обновить дашборд')
                  : 'Обновить ИИ-аналитику'}
              </button>
              {canSaveDb && (
                <button
                  onClick={handleSaveDb}
                  disabled={saveToDbLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-[0.9rem] font-semibold border-none cursor-pointer hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  <Database className="w-4 h-4" />
                  {saveToDbLoading ? 'Сохранение...' : 'Сохранить в БД'}
                </button>
              )}
              <span className="text-[0.8rem] text-muted-foreground">
                {rmFile && dbFile
                  ? 'Связь по ID: РМ (столбец A) ↔ ДБ (столбец L)' + (aiFile ? ' ↔ ИИ (столбец A)' : '')
                  : 'Обновление только данных ИИ-аналитики для текущих проектов'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
