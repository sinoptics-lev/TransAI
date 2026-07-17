import { motion } from 'framer-motion';
import { Sun, Moon, UploadCloud } from 'lucide-react';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  onShowBrandbook: () => void;
  showUploader: boolean;
  onUploaderToggle: () => void;
}

export function Header({ theme, onThemeToggle, onShowBrandbook, showUploader, onUploaderToggle }: HeaderProps) {
  const isDark = theme === 'dark';

  return (
    <motion.header
      className={`w-full rounded-2xl mb-6 shadow-xl overflow-hidden relative border transition-all duration-300 ${
        isDark 
          ? 'bg-[#2d323a] border-[#3e4654] text-white' 
          : 'bg-white border-slate-200/80 text-slate-900'
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Absolute vector abstract background in corporate colors */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        {isDark ? (
          // Dark theme abstract design: deep grey (#2d323a), deep blue (#0f172a), branded red (#ff4949)
          <svg className="absolute w-full h-full object-cover opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <rect width="1440" height="320" fill="url(#dark-bg-grad)"/>
            {/* Dynamic intersecting curves & waves in branded red and slate */}
            <path d="M-100,240 C150,140 350,300 700,160 C1050,20 1200,240 1600,140 L1600,320 L-100,320 Z" fill="url(#dark-red-grad)" opacity="0.18" />
            <path d="M-50,180 C250,280 600,120 950,220 C1300,320 1450,160 1600,240 L1600,320 L-50,320 Z" fill="url(#dark-accent-grad)" opacity="0.15" />
            <circle cx="150" cy="80" r="280" fill="#ff4949" opacity="0.05" filter="blur(50px)" />
            <circle cx="1100" cy="220" r="220" fill="#2d323a" opacity="0.3" filter="blur(30px)" />
            <defs>
              <linearGradient id="dark-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2d323a" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="dark-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4949" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="dark-accent-grad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff4949" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#2d323a" stopOpacity="0.1"/>
              </linearGradient>
            </defs>
          </svg>
        ) : (
          // Light theme abstract design: light grey (#f8fafc) background and branded red (#ff4949)
          <svg className="absolute w-full h-full object-cover" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <rect width="1440" height="320" fill="#f8fafc"/>
            {/* Elegant overlapping waves/blobs in branded red #ff4949 and clean white */}
            <path d="M-100,200 C200,100 450,300 850,150 C1250,0 1350,220 1600,130 L1600,320 L-100,320 Z" fill="#ffffff" opacity="0.7" />
            <path d="M-50,240 C250,130 550,340 950,160 C1250,60 1350,260 1600,180 L1600,320 L-50,320 Z" fill="url(#light-red-grad)" opacity="0.12" />
            <path d="M150,330 C450,180 750,80 1150,240 L1150,320 L150,320 Z" fill="url(#light-red-grad-2)" opacity="0.08" />
            {/* Ambient corporate color spots */}
            <circle cx="120" cy="90" r="150" fill="#ff4949" opacity="0.04" filter="blur(35px)" />
            <circle cx="1250" cy="200" r="200" fill="#ff4949" opacity="0.03" filter="blur(45px)" />
            <circle cx="680" cy="60" r="100" fill="#ffffff" opacity="0.9" />
            <defs>
              <linearGradient id="light-red-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4949" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="light-red-grad-2" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff4949" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        )}
      </div>

      {/* Red accent bar — corporate mark */}
      <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-[#ff4949]" />

      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-7 px-6 py-8 sm:px-8 sm:py-9 relative z-10 w-full">
        
        {/* Small Logo Mark - Placed on the left */}
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <img
            src={isDark ? `${import.meta.env.BASE_URL}logo-mark-light.svg` : `${import.meta.env.BASE_URL}logo-mark-dark.svg`}
            alt="Логотип «Максимум»"
            className="h-14 sm:h-16 md:h-[68px] w-auto object-contain transition-all duration-300 hover:scale-105"
          />
        </motion.div>

        {/* Divider after logo */}
        <div className="hidden sm:block w-[1.5px] h-12 sm:h-16 bg-slate-300/40 dark:bg-slate-700/50 flex-shrink-0" />

        {/* Text block: Title & Subtitle - on full width right of the logo */}
        <motion.div
          className="min-w-0 flex-1 text-center sm:text-left pr-0 sm:pr-14 md:pr-16"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <h1 className={`text-xl sm:text-2xl md:text-[1.75rem] lg:text-[2.1rem] font-black tracking-tight leading-tight mb-2.5 transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Трансформационные проекты 2026
          </h1>
          <p className={`text-xs sm:text-sm md:text-[0.92rem] leading-relaxed font-semibold max-w-[780px] transition-colors duration-300 ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Сводный аналитический дашборд по цифровой трансформации органов исполнительной власти Московской области
          </p>
        </motion.div>

        {/* Theme & Uploader Toggle Buttons - placed absolutely in the bottom right corner of the banner */}
        <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-20 flex items-center gap-2">
          {/* Uploader Toggle Button */}
          <button
            type="button"
            onClick={onUploaderToggle}
            className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl border transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow-sm ${
              isDark 
                ? showUploader
                  ? 'bg-[#ff4949]/15 hover:bg-[#ff4949]/25 text-[#ff4949] border-[#ff4949]/40 shadow-[0_0_12px_rgba(255,73,73,0.2)]'
                  : 'bg-[#2d323a]/90 hover:bg-[#3e4654] text-slate-300 border-[#3e4654]' 
                : showUploader
                  ? 'bg-red-50 hover:bg-red-100 text-[#ff4949] border-[#ff4949]/40'
                  : 'bg-white/90 hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title={showUploader ? "Скрыть панель загрузки" : "Показать панель загрузки"}
          >
            <UploadCloud className="w-4.5 h-4.5" />
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onThemeToggle}
            className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl border transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] cursor-pointer shadow-sm ${
              isDark 
                ? 'bg-[#2d323a]/90 hover:bg-[#3e4654] text-amber-400 border-[#3e4654]' 
                : 'bg-white/90 hover:bg-slate-50 text-indigo-600 border-slate-200'
            }`}
            title={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
          >
            {isDark ? (
              <Sun className="w-4.5 h-4.5" />
            ) : (
              <Moon className="w-4.5 h-4.5" />
            )}
          </button>
        </div>
      </div>

      {/* Bottom red hairline */}
      {!isDark && <div className="h-[3px] w-full bg-gradient-to-r from-[#ff4949] via-[#ff4949]/50 to-transparent" />}
    </motion.header>
  );
}
