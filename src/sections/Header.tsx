import { motion } from 'framer-motion';

export function Header() {
  return (
    <motion.header
      className="w-full rounded-xl mb-6 shadow-lg overflow-hidden relative"
      style={{
        background: 'linear-gradient(115deg, #3c4149 0%, #535861 55%, #5e636c 100%)',
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Red accent bar — corporate mark */}
      <div className="absolute top-0 left-0 bottom-0 w-[5px] bg-[#ff4949]" />

      <div className="flex items-center gap-6 px-8 py-6">
        {/* Mingu logo */}
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
        >
          <img
            src="./logo-mingu-light.svg"
            alt="Московская область — Мингосуправления"
            className="h-[54px] w-auto object-contain"
          />
        </motion.div>

        {/* Divider */}
        <div className="hidden sm:block w-px self-stretch bg-white/20" />

        {/* Title block */}
        <motion.div
          className="min-w-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
        >
          <h1 className="text-white text-[1.5rem] sm:text-[1.75rem] font-bold leading-tight mb-1.5">
            Трансформационные проекты 2026
          </h1>
          <p className="text-white/75 text-[0.85rem] sm:text-[0.95rem] leading-snug">
            Сводный аналитический дашборд по цифровой трансформации органов
            исполнительной власти Московской области
          </p>
        </motion.div>
      </div>

      {/* Bottom red hairline */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#ff4949] via-[#ff4949]/40 to-transparent" />
    </motion.header>
  );
}
