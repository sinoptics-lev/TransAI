import { motion } from 'framer-motion';

const Equalizer = ({ className }: { className?: string }) => (
  <div className={`flex items-end gap-[3px] ${className}`}>
    <div className="w-[3px] h-2 bg-[#ff4949] rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '1.2s' }} />
    <div className="w-[3px] h-4.5 bg-[#ff4949] rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1s' }} />
    <div className="w-[3px] h-3.5 bg-[#ff4949] rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.5s' }} />
    <div className="w-[3px] h-1.5 bg-[#ff4949] rounded-full animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '0.8s' }} />
    <div className="w-[3px] h-3 bg-[#ff4949] rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '1.3s' }} />
  </div>
);

export function DarkThemeBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#0e1013] select-none">
      
      {/* ================= BACKGROUND DIAGONAL PLATES ================= */}
      <div className="absolute inset-0 rotate-[-38deg] scale-[1.3] origin-center flex flex-col gap-12 justify-center items-center opacity-[0.38]">
        
        {/* Track 1 */}
        <div className="flex gap-12 -ml-[200px]">
          <div className="w-[450px] h-[180px] bg-[#1a1d24] border border-white/[0.04] rounded-[36px] shadow-[inset_0_4px_12px_rgba(255,255,255,0.015)]" />
          <div className="w-[600px] h-[180px] bg-[#16191f] border border-white/[0.03] rounded-[36px]" />
        </div>

        {/* Track 2 */}
        <div className="flex gap-12 ml-[150px]">
          <div className="w-[500px] h-[220px] bg-[#16191f] border border-white/[0.03] rounded-[44px] shadow-[inset_0_4px_12px_rgba(255,255,255,0.01)]" />
          <div className="w-[750px] h-[220px] bg-[#1a1d24] border border-white/[0.04] rounded-[44px] shadow-2xl" />
        </div>

        {/* Track 3 */}
        <div className="flex gap-12 -ml-[100px]">
          <div className="w-[700px] h-[200px] bg-[#181b21] border border-white/[0.035] rounded-[40px]" />
          <div className="w-[450px] h-[200px] bg-[#15181e] border border-white/[0.03] rounded-[40px]" />
        </div>

        {/* Track 4 */}
        <div className="flex gap-12 ml-[300px]">
          <div className="w-[550px] h-[190px] bg-[#1a1d24] border border-white/[0.04] rounded-[38px]" />
          <div className="w-[500px] h-[190px] bg-[#16191f] border border-white/[0.03] rounded-[38px]" />
        </div>

      </div>

      {/* ================= GLOWING NEBULAS / RED ORBS ================= */}
      <div className="absolute inset-0">
        
        {/* Orb 1: Upper center-left */}
        <div className="absolute top-[12%] left-[12%] w-[260px] h-[260px] bg-[#ff4949]/35 rounded-full blur-[85px] mix-blend-screen animate-pulse" 
          style={{ animationDuration: '7s' }} 
        />
        <div className="absolute top-[16%] left-[18%] w-[120px] h-[120px] bg-[#ff4949]/40 rounded-full blur-[55px] mix-blend-screen" />

        {/* Orb 2: Center right */}
        <div className="absolute top-[32%] right-[18%] w-[340px] h-[340px] bg-red-600/25 rounded-full blur-[110px] mix-blend-screen animate-pulse" 
          style={{ animationDuration: '10s' }} 
        />
        <div className="absolute top-[38%] right-[24%] w-[150px] h-[150px] bg-[#ff4949]/35 rounded-full blur-[60px] mix-blend-screen" />

        {/* Orb 3: Bottom left-center */}
        <div className="absolute bottom-[14%] left-[22%] w-[300px] h-[300px] bg-[#ff4949]/25 rounded-full blur-[95px] mix-blend-screen animate-pulse" 
          style={{ animationDuration: '9s' }} 
        />

        {/* Orb 4: Bottom far right */}
        <div className="absolute bottom-[8%] right-[8%] w-[280px] h-[280px] bg-red-600/30 rounded-full blur-[90px] mix-blend-screen animate-pulse" 
          style={{ animationDuration: '8s' }} 
        />
        <div className="absolute bottom-[14%] right-[14%] w-[130px] h-[130px] bg-[#ff4949]/40 rounded-full blur-[55px] mix-blend-screen" />

        {/* Orb 5: Top center-right */}
        <div className="absolute top-[4%] right-[32%] w-[200px] h-[200px] bg-[#ff4949]/20 rounded-full blur-[75px] mix-blend-screen" />

      </div>

      {/* ================= CONSTELLATIONS & NETWORK LINES ================= */}
      <div className="absolute inset-0 opacity-[0.25]">
        
        {/* Network 1: Left middle */}
        <svg className="absolute bottom-[15%] left-[2%] w-[300px] h-[300px] text-[#ff4949]/30 stroke-current" viewBox="0 0 100 100" fill="none">
          <line x1="10" y1="90" x2="35" y2="60" strokeWidth="0.4" />
          <line x1="35" y1="60" x2="80" y2="70" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
          <line x1="35" y1="60" x2="45" y2="35" strokeWidth="0.4" />
          <line x1="10" y1="90" x2="45" y2="35" strokeWidth="0.3" />
          <circle cx="10" cy="90" r="1.2" fill="#ff4949" className="shadow-[0_0_5px_#ff4949]" />
          <circle cx="35" cy="60" r="1.8" fill="#ff4949" className="animate-ping" />
          <circle cx="35" cy="60" r="1.8" fill="#ff4949" />
          <circle cx="80" cy="70" r="1" fill="#ff4949" />
          <circle cx="45" cy="35" r="1.2" fill="#ff4949" />
        </svg>

        {/* Network 2: Top right */}
        <svg className="absolute top-[4%] right-[4%] w-[350px] h-[350px] text-[#ff4949]/30 stroke-current" viewBox="0 0 100 100" fill="none">
          <line x1="20" y1="40" x2="65" y2="25" strokeWidth="0.4" />
          <line x1="65" y1="25" x2="95" y2="55" strokeWidth="0.4" />
          <line x1="65" y1="25" x2="55" y2="80" strokeWidth="0.4" strokeDasharray="1.5 1.5" />
          <line x1="20" y1="40" x2="55" y2="80" strokeWidth="0.3" />
          <circle cx="20" cy="40" r="1.2" fill="#ff4949" />
          <circle cx="65" cy="25" r="2" fill="#ff4949" className="animate-pulse" />
          <circle cx="95" cy="55" r="1.2" fill="#ff4949" />
          <circle cx="55" cy="80" r="1.2" fill="#ff4949" />
        </svg>

      </div>

      {/* ================= RED GLOWING DOTS / PARTICLES ================= */}
      <div className="absolute inset-0">
        
        {/* Point 1: top left */}
        <div className="absolute top-[9%] left-[9%] flex items-center justify-center">
          <div className="absolute w-4 h-4 bg-[#ff4949]/30 rounded-full animate-ping" />
          <div className="w-2 h-2 bg-[#ff4949] rounded-full shadow-[0_0_8px_#ff4949]" />
        </div>

        {/* Point 2: near left edge */}
        <div className="absolute top-[52%] left-[10%] flex items-center justify-center opacity-80">
          <div className="w-1.5 h-1.5 bg-[#ff4949] rounded-full shadow-[0_0_6px_#ff4949]" />
        </div>

        {/* Point 3: bottom center-left */}
        <div className="absolute bottom-[24%] left-[18%] flex items-center justify-center">
          <div className="absolute w-3.5 h-3.5 bg-[#ff4949]/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          <div className="w-2 h-2 bg-[#ff4949] rounded-full shadow-[0_0_8px_#ff4949]" />
        </div>

        {/* Point 4: center */}
        <div className="absolute top-[51%] left-[48%] flex items-center justify-center opacity-70">
          <div className="w-1.5 h-1.5 bg-[#ff4949] rounded-full shadow-[0_0_6px_#ff4949]" />
        </div>

        {/* Point 5: center right */}
        <div className="absolute top-[45%] right-[18%] flex items-center justify-center">
          <div className="absolute w-4 h-4 bg-[#ff4949]/30 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
          <div className="w-2 h-2 bg-[#ff4949] rounded-full shadow-[0_0_8px_#ff4949]" />
        </div>

        {/* Point 6: bottom center-right */}
        <div className="absolute bottom-[18%] right-[35%] flex items-center justify-center">
          <div className="w-2 h-2 bg-[#ff4949] rounded-full shadow-[0_0_8px_#ff4949]" />
        </div>

      </div>

      {/* ================= EQUALIZER GRAPHICS ================= */}
      <Equalizer className="absolute bottom-[22%] left-[12%] opacity-35 scale-110" />
      <Equalizer className="absolute top-[35%] right-[13%] opacity-40 scale-100" />
      <Equalizer className="absolute bottom-[30%] right-[28%] opacity-30 scale-90" />

      {/* ================= SPECIAL FOUR-POINT SPARKLE STAR ================= */}
      <div className="absolute bottom-[15%] right-[9%] flex flex-col items-center opacity-[0.45]">
        {/* Vertical thin line running through the star */}
        <div className="w-[1.5px] h-[95px] bg-gradient-to-b from-transparent via-slate-400 to-transparent" />
        
        {/* Star Sparkle */}
        <div className="absolute top-[35px] flex items-center justify-center">
          <div className="absolute w-7 h-7 bg-white/10 rounded-full blur-[4px] animate-pulse" />
          <svg className="w-5.5 h-5.5 text-slate-200 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2" />
          </svg>
        </div>
      </div>

    </div>
  );
}
