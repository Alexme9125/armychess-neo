import React from 'react';
import { Piece as PieceModel, PIECE_CONFIG } from '@shared/types';
import clsx from 'clsx';
import { Shield } from 'lucide-react';

interface PieceProps {
  piece: PieceModel;
  isSelected?: boolean;
  isLegalTarget?: boolean;
  isLastMoved?: boolean;
  tacticalMark?: string;
  viewerColor?: 'black' | 'white' | 'spectator' | 'referee';
  gameMode?: 'mingqi' | 'anqi';
  onClick?: () => void;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
  className?: string;
}

export const Piece: React.FC<PieceProps> = ({
  piece,
  isSelected,
  isLegalTarget,
  isLastMoved,
  tacticalMark,
  viewerColor = 'spectator',
  gameMode = 'anqi',
  onClick,
  style,
  theme = 'dark',
  className,
}) => {
  const isBlack = piece.color === 'black';
  const isOpponent = viewerColor !== 'referee' && viewerColor !== 'spectator' && piece.color !== viewerColor;
  const isLight = theme === 'light';
  
  // Hidden in dark chess if it's opponent's piece (or spectator view) and not revealed
  const isHidden = gameMode === 'anqi' && !piece.isRevealed && (
    viewerColor === 'spectator' || isOpponent
  );

  const info = PIECE_CONFIG[piece.type];

  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      style={style}
      className={clsx(
        'group relative flex items-center justify-center cursor-pointer select-none rounded-lg sm:rounded-xl transition-all duration-200 transform',
        // Horizontal rounded rectangle dimensions to compress board height
        'w-16 h-8 sm:w-20 sm:h-9 md:w-24 md:h-10.5 px-1.5',
        isBlack ? 'liquid-mica-black text-amber-200' : 'liquid-mica-white text-slate-800',
        'mica-shimmer',
        isSelected && 'piece-selected ring-2 ring-cyan-400/90 z-30 scale-105',
        isLastMoved && 'ring-2 ring-purple-400/70',
        isLegalTarget && 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900',
        // Colored border ring when marked (preserves natural mica material, no muddy background)
        tacticalMark === '!' && 'ring-2 ring-rose-500 border-rose-500/80',
        tacticalMark === '?' && 'ring-2 ring-sky-500 border-sky-500/80',
        tacticalMark === '×' && 'ring-2 ring-slate-400 border-slate-400/80',
        tacticalMark === '+' && 'ring-2 ring-amber-500 border-amber-500/80',
        tacticalMark === '-' && 'ring-2 ring-emerald-500 border-emerald-500/80',
        'hover:scale-105 active:scale-95',
        className
      )}
    >
      {/* Top accent metallic sheen line */}
      <div 
        className={clsx(
          'absolute top-0.5 inset-x-2 h-[1.5px] rounded-full opacity-60',
          isBlack ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent' : 'bg-gradient-to-r from-transparent via-sky-400 to-transparent'
        )} 
      />

      {isHidden ? (
        // Mysterious Liquid Mica Pattern for Back of Hidden Piece
        // Keeps "黑军" / "白军" wording to let player define meaning; only colors change upon marking
        <div className="flex items-center justify-center gap-1.5 w-full">
          {/* Shield Badge */}
          <div className={clsx(
            'w-4 h-4 rounded-full flex items-center justify-center border transition-colors shrink-0',
            tacticalMark === '!' && (isBlack ? 'border-rose-400/60 bg-rose-950/60 text-rose-300' : 'border-rose-300 bg-rose-50 text-rose-600'),
            tacticalMark === '?' && (isBlack ? 'border-sky-400/60 bg-sky-950/60 text-sky-300' : 'border-sky-300 bg-sky-50 text-sky-600'),
            tacticalMark === '×' && (isBlack ? 'border-slate-400/60 bg-slate-900/60 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-600'),
            tacticalMark === '+' && (isBlack ? 'border-amber-400/60 bg-amber-950/60 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-600'),
            tacticalMark === '-' && (isBlack ? 'border-emerald-400/60 bg-emerald-950/60 text-emerald-300' : 'border-emerald-300 bg-emerald-50 text-emerald-600'),
            !tacticalMark && (isBlack ? 'border-purple-500/40 bg-purple-950/60 text-purple-300' : 'border-slate-300 bg-slate-100 text-slate-500')
          )}>
            <Shield className="w-2.5 h-2.5 opacity-90" />
          </div>

          {/* Camp text: still displays "黑军" / "白军", only changes font color! No muddy text shadow */}
          <span className={clsx(
            'text-[10px] sm:text-[11px] tracking-widest font-mono uppercase font-bold transition-colors select-none',
            // Tactical marked font colors
            tacticalMark === '!' && (isBlack ? 'text-rose-300' : 'text-rose-600'),
            tacticalMark === '?' && (isBlack ? 'text-sky-300' : 'text-sky-600'),
            tacticalMark === '×' && (isBlack ? 'text-slate-300' : 'text-slate-700'),
            tacticalMark === '+' && (isBlack ? 'text-amber-300' : 'text-amber-600'),
            tacticalMark === '-' && (isBlack ? 'text-emerald-300' : 'text-emerald-600'),
            // Unmarked default font colors
            !tacticalMark && (isBlack ? 'text-purple-300' : (isLight ? 'text-slate-700' : 'text-slate-600'))
          )}>
            {isBlack ? '黑军' : '白军'}
          </span>
        </div>
      ) : (
        // Revealed / Friendly Piece Display (Centered Modern Typography, No Rank Numbers)
        <div className="flex items-center justify-center w-full px-1">
          <span 
            className={clsx(
              'piece-font leading-none transition-all',
              'text-xs sm:text-sm md:text-[15px]',
              isBlack 
                ? 'text-amber-200' 
                : 'text-slate-900',
              piece.type === 'flag' && 'text-rose-500 font-black tracking-wider',
              piece.type === 'bomb' && (isBlack ? 'text-amber-400' : 'text-rose-600')
            )}
            style={{
              textShadow: isBlack
                ? '0 1px 3px rgba(0,0,0,0.8)'
                : (isLight ? 'none' : '0 1px 2px rgba(255,255,255,0.8)')
            }}
          >
            {info.name}
          </span>
        </div>
      )}

      {/* Tactical Mark Badge (Crisp Corner Badge, moved inward to prevent overflow clipping) */}
      {tacticalMark && (
        <div
          className={clsx(
            "absolute top-1 right-1.5 sm:top-1.5 sm:right-2 w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] rounded-full flex items-center justify-center text-[10px] sm:text-[11px] font-black leading-none shadow-md border z-30 pointer-events-none transition-all",
            tacticalMark === '!' && "bg-rose-600 text-white border-rose-300 shadow-rose-950/30",
            tacticalMark === '?' && "bg-sky-600 text-white border-sky-300 shadow-sky-950/30",
            tacticalMark === '×' && "bg-slate-700 text-white border-slate-400 shadow-slate-950/30",
            tacticalMark === '+' && "bg-amber-600 text-white border-amber-300 shadow-amber-950/30",
            tacticalMark === '-' && "bg-emerald-600 text-white border-emerald-300 shadow-emerald-950/30"
          )}
        >
          {tacticalMark}
        </div>
      )}
    </div>
  );
};
