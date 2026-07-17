import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTooltip } from './TooltipContext';

interface BarSegment {
  label: string;
  value: string;
  pct: number;
  colorClass: string;
}

interface AnimatedBarProps {
  segments: BarSegment[];
  height?: number;
  delay?: number;
  showValues?: boolean;
}

function useInView(ref: React.RefObject<HTMLElement | null>, once = true) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);
  return inView;
}

/** Measures segment width in pixels to decide if label fits */
function useSegmentWidth(containerRef: React.RefObject<HTMLDivElement | null>, pct: number) {
  const [pxWidth, setPxWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const w = el.getBoundingClientRect().width * (pct / 100);
      setPxWidth(w);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, pct]);

  return pxWidth;
}

export function AnimatedBar({ segments, height = 56, delay = 0, showValues = true }: AnimatedBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const tooltip = useTooltip();

  return (
    <div ref={ref} className="flex rounded-[10px] bg-[#e2e8f0] dark:bg-white/[0.08] w-full" style={{ height }}>
      {segments.map((seg, i) => (
        <AnimatedBarSegment
          key={i}
          seg={seg}
          containerRef={ref}
          inView={inView}
          delay={delay + i * 0.2}
          showValues={showValues}
          tooltip={tooltip}
        />
      ))}
    </div>
  );
}

function AnimatedBarSegment({
  seg,
  containerRef,
  inView,
  delay,
  showValues,
  tooltip,
}: {
  seg: BarSegment;
  containerRef: React.RefObject<HTMLDivElement | null>;
  inView: boolean;
  delay: number;
  showValues: boolean;
  tooltip: ReturnType<typeof useTooltip>;
}) {
  const pxWidth = useSegmentWidth(containerRef, seg.pct);
  const fits = pxWidth >= 50; // minimum 50px to show label

  const handleEnter = (e: React.MouseEvent) => {
    tooltip.show(`${seg.label}: ${seg.value} (${seg.pct.toFixed(1)}%)`, e.clientX, e.clientY);
  };
  const handleMove = (e: React.MouseEvent) => tooltip.move(e.clientX, e.clientY);
  const handleLeave = () => tooltip.hide();

  return (
    <motion.div
      className={`h-full flex items-center justify-center relative cursor-help ${seg.colorClass}`}
      style={{ minWidth: 0 }}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ width: '0%' }}
      animate={inView ? { width: `${seg.pct}%` } : { width: '0%' }}
      transition={{
        duration: 1,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {showValues && fits && (
        <span className="text-white font-bold text-[1rem] whitespace-nowrap px-2 drop-shadow-md pointer-events-none">
          {seg.value}
        </span>
      )}
    </motion.div>
  );
}

interface DeptSegment {
  label: string;
  value: number;
  displayValue: string;
  pct: number;
  colorClass: string;
}

interface DepartmentBarProps {
  key?: string | number;
  name: string;
  rowNum?: number;
  segments: DeptSegment[];
  total: string;
  height?: number;
  delay?: number;
  trackWidthPct?: number;
}

export function DepartmentBar({ name, rowNum, segments, total, height = 40, delay = 0, trackWidthPct = 100 }: DepartmentBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const tooltip = useTooltip();
  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      className="flex items-center gap-4 mb-3.5 last:mb-0"
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay }}
    >
      <div className="w-[220px] text-[1.05rem] font-bold dept-label truncate flex-shrink-0 flex items-center gap-2">
        {rowNum !== undefined && (
          <span className="text-[0.8rem] dept-label-num font-bold w-[22px] text-right flex-shrink-0">{rowNum}.</span>
        )}
        {name}
      </div>
      <div className="flex-1 flex items-center gap-3">
        <div ref={trackRef} className="rounded-lg bg-[#e2e8f0] dark:bg-white/[0.08] flex" style={{ height, width: `${trackWidthPct}%` }}>
          {segments.map((seg, i) => (
            <DeptAnimatedSegment
              key={i}
              seg={seg}
              trackRef={trackRef}
              inView={inView}
              delay={delay + i * 0.1}
              tooltip={tooltip}
            />
          ))}
        </div>
        <div className="w-[100px] text-right text-[1.15rem] font-extrabold dept-label flex-shrink-0">
          {total}
        </div>
      </div>
    </motion.div>
  );
}

function DeptAnimatedSegment({
  seg,
  trackRef,
  inView,
  delay,
  tooltip,
}: {
  key?: string | number;
  seg: DeptSegment;
  trackRef: React.RefObject<HTMLDivElement | null>;
  inView: boolean;
  delay: number;
  tooltip: ReturnType<typeof useTooltip>;
}) {
  const pxWidth = useSegmentWidth(trackRef, seg.pct);
  const fits = pxWidth >= 50;

  const handleEnter = (e: React.MouseEvent) => {
    tooltip.show(`${seg.label}: ${seg.displayValue} (${seg.pct.toFixed(1)}%)`, e.clientX, e.clientY);
  };
  const handleMove = (e: React.MouseEvent) => tooltip.move(e.clientX, e.clientY);
  const handleLeave = () => tooltip.hide();

  return (
    <motion.div
      className={`h-full flex items-center justify-center relative cursor-help ${seg.colorClass}`}
      style={{ minWidth: 0 }}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ width: '0%' }}
      animate={inView ? { width: `${seg.pct}%` } : { width: '0%' }}
      transition={{
        duration: 1,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {fits && (
        <span className="text-white font-bold text-[0.85rem] whitespace-nowrap px-2 drop-shadow-sm pointer-events-none">
          {seg.displayValue}
        </span>
      )}
    </motion.div>
  );
}
