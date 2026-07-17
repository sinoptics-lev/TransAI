import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative h-full w-full"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-3 bg-white rounded-xl shadow-2xl border border-gray-200 whitespace-nowrap pointer-events-none"
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="text-[0.95rem] font-semibold text-[#1a202c] leading-snug">
              {content}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div
                className="w-3 h-3 bg-white border-r border-b border-gray-200 rotate-45"
                style={{ transformOrigin: 'top left', transform: 'translateY(-6px) rotate(45deg)' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
