import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useState, useRef, useEffect } from 'react';

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const icon = resolvedTheme === 'dark'
    ? <Moon className="w-4 h-4" />
    : <Sun className="w-4 h-4" />;

  const options: { value: 'light' | 'dark' | 'system'; label: string; Icon: typeof Sun }[] = [
    { value: 'light', label: 'Светлая', Icon: Sun },
    { value: 'dark', label: 'Тёмная', Icon: Moon },
    { value: 'system', label: 'Системная', Icon: Monitor },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white/90 text-sm"
        title="Переключить тему"
      >
        {icon}
        <span className="hidden sm:inline">Тема</span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-1 w-40 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50"
        >
          {options.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => { setTheme(value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                theme === value
                  ? 'bg-mingos-red/10 text-mingos-red'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function Header() {
  const { resolvedTheme } = useTheme();

  return (
    <motion.header
      className="w-full rounded-xl px-4 sm:px-6 py-5 sm:py-8 mb-6 shadow-md relative overflow-hidden"
      style={{
        background: resolvedTheme === 'dark'
          ? 'linear-gradient(135deg, hsl(220 20% 12%) 0%, hsl(220 15% 18%) 100%)'
          : 'linear-gradient(135deg, hsl(220 20% 22%) 0%, hsl(220 15% 32%) 100%)',
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Logo watermark */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
        <img
          src="./logo-light-min.png"
          alt=""
          className="h-20 sm:h-28 w-auto"
        />
      </div>

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <img
              src="./logo-light-min.png"
              alt="Мингосуправление"
              className="h-8 sm:h-10 w-auto flex-shrink-0"
            />
            <h1 className="text-white text-lg sm:text-[1.75rem] font-bold leading-tight">
              Трансформационные проекты 2026
            </h1>
          </div>
          <p className="text-white/80 text-sm sm:text-[0.95rem]">
            Сводный аналитический дашборд по цифровой трансформации органов исполнительной власти Московской области
          </p>
        </div>
        <ThemeToggle />
      </div>
    </motion.header>
  );
}
