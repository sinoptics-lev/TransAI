import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface TooltipState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

interface TooltipContextType {
  show: (text: string, x: number, y: number) => void;
  hide: () => void;
  move: (x: number, y: number) => void;
  state: TooltipState;
}

const TooltipCtx = createContext<TooltipContextType | null>(null);

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TooltipState>({ visible: false, text: '', x: 0, y: 0 });

  const show = useCallback((text: string, x: number, y: number) => {
    setState({ visible: true, text, x, y });
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const move = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, x, y }));
  }, []);

  return (
    <TooltipCtx.Provider value={{ show, hide, move, state }}>
      {children}
      <TooltipOverlay />
    </TooltipCtx.Provider>
  );
}

export function useTooltip() {
  const ctx = useContext(TooltipCtx);
  if (!ctx) throw new Error('useTooltip must be inside TooltipProvider');
  return ctx;
}

function TooltipOverlay() {
  const { state } = useTooltip();
  if (!state.visible) return null;

  return (
    <div
      className="fixed z-[99999] pointer-events-none"
      style={{
        left: state.x,
        top: state.y - 48,
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-white text-[#374151] text-[0.9rem] font-semibold px-4 py-2.5 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-[#d1d5db] whitespace-nowrap">
        {state.text}
      </div>
      <div
        className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white border-r border-b border-[#d1d5db] rotate-45"
        style={{ bottom: -5 }}
      />
    </div>
  );
}
