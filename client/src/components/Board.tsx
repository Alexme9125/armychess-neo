import React, { useRef, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { 
  Piece as PieceModel, 
  PieceColor, 
  RuleConfig, 
  FluidEvent, 
  MoveRecord,
  DEFAULT_RULES 
} from '@shared/types';
import { 
  ALL_CAMPS, 
  ALL_HEADQUARTERS, 
  RAILROAD_POINTS, 
  BOARD_ROWS, 
  BOARD_COLS,
  ALL_HIGHWAY_EDGES,
  ALL_RAILROAD_EDGES 
} from '@shared/boardData';
import { findMovePath } from '@shared/ruleEngine';
import { Piece } from './Piece';
import { FluidCanvas } from './FluidCanvas';
import clsx from 'clsx';
import { Shield, Flag, Mountain } from 'lucide-react';

interface PointCoord {
  x: number;
  y: number;
}

interface GlidingState {
  piece: PieceModel;
  currentX: number;
  currentY: number;
  toIndex: number;
}

interface BoardProps {
  board: (PieceModel | null)[];
  selectedPos: number | null;
  legalTargets: number[];
  lastMovedPos?: number | null;
  viewerColor?: PieceColor | 'spectator' | 'referee';
  gameMode?: 'mingqi' | 'anqi';
  rules?: RuleConfig;
  fluidEvent: FluidEvent | null;
  lastMove?: MoveRecord | null;
  tacticalMarks?: Record<string, string>;
  onSelectPiece: (pos: number) => void;
  onMoveTo: (targetPos: number) => void;
  onContextMenuPiece?: (pos: number) => void;
  onAnimationComplete?: () => void;
  flipBoard?: boolean;
  theme?: 'dark' | 'light';
}

export const Board: React.FC<BoardProps> = ({
  board,
  selectedPos,
  legalTargets,
  lastMovedPos,
  viewerColor = 'black',
  gameMode = 'anqi',
  rules = DEFAULT_RULES,
  fluidEvent,
  lastMove,
  tacticalMarks,
  onSelectPiece,
  onMoveTo,
  onContextMenuPiece,
  onAnimationComplete,
  flipBoard = false,
  theme = 'dark',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isLight = theme === 'light';

  // Node center coordinates for SVG routes and animations
  const [coords, setCoords] = useState<Record<number, PointCoord>>({});
  
  // Gliding piece state along waypoint path
  const [glidingState, setGlidingState] = useState<GlidingState | null>(null);
  
  // Deferred fluid event: only triggered AFTER the gliding piece hits the target!
  const [activeFluidEvent, setActiveFluidEvent] = useState<FluidEvent | null>(null);
  const pendingFluidEventRef = useRef<FluidEvent | null>(null);
  const prevMoveTimeRef = useRef<number>(0);

  // Measure all 60 node coordinates relative to container
  const updateCoordinates = () => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newCoords: Record<number, PointCoord> = {};

    for (let i = 0; i < 60; i++) {
      const el = pointRefs.current[i];
      if (el) {
        const rect = el.getBoundingClientRect();
        newCoords[i] = {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        };
      }
    }
    setCoords(newCoords);
  };

  useLayoutEffect(() => {
    updateCoordinates();
    window.addEventListener('resize', updateCoordinates);
    return () => window.removeEventListener('resize', updateCoordinates);
  }, [flipBoard]);

  // Re-measure after initial mount / DOM settling
  useEffect(() => {
    const timer = setTimeout(updateCoordinates, 50);
    return () => clearTimeout(timer);
  }, []);

  // Sync incoming fluid event into pending ref (waits for glide to arrive)
  useEffect(() => {
    if (fluidEvent) {
      pendingFluidEventRef.current = fluidEvent;
    }
  }, [fluidEvent]);

  // -------------------------------------------------------------
  // PATH-FOLLOWING GLIDING ANIMATION (Turns at corners)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!lastMove || lastMove.timestamp === prevMoveTimeRef.current) return;
    prevMoveTimeRef.current = lastMove.timestamp;

    const fromCoord = coords[lastMove.from];
    const toCoord = coords[lastMove.to];
    if (!fromCoord || !toCoord) return;

    const targetPiece = board[lastMove.to];
    const isMyPiece = viewerColor !== 'referee' && viewerColor !== 'spectator' && lastMove.player === viewerColor;
    
    // In dark chess (anqi), opponent pieces remain hidden unless already revealed
    const isPieceRevealed = gameMode === 'mingqi' || isMyPiece || Boolean(targetPiece?.isRevealed);

    // The moving piece was the attacker initiated from `lastMove.from`.
    // NEVER fall back to targetPiece?.type if isMyPiece, because targetPiece at destination `to`
    // was either the opponent defender (which is masked as 'flag' in Anqi!) or post-combat piece!
    const movingPieceType = isMyPiece 
      ? (lastMove.attackerType || 'engineer')
      : (gameMode === 'mingqi' || targetPiece?.isRevealed ? (lastMove.attackerType || targetPiece?.type || 'engineer') : 'engineer');

    // Piece model that is moving
    const movingPiece: PieceModel = {
      id: `glide-${Date.now()}`,
      type: movingPieceType,
      color: lastMove.player,
      position: lastMove.to,
      isRevealed: isPieceRevealed,
    };

    // 1. Calculate full waypoint path along actual tracks (e.g. turning corners)
    const waypointIndices = findMovePath(
      board, 
      lastMove.from, 
      lastMove.to, 
      movingPiece.type, 
      rules
    );

    const waypoints: PointCoord[] = waypointIndices
      .map(idx => coords[idx])
      .filter((c): c is PointCoord => Boolean(c));

    if (waypoints.length < 2) {
      waypoints.push(toCoord);
    }

    // 2. Compute segment lengths and total distance
    const segmentLengths: number[] = [];
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const d = Math.hypot(waypoints[i + 1].x - waypoints[i].x, waypoints[i + 1].y - waypoints[i].y);
      segmentLengths.push(d);
      totalDistance += d;
    }

    // Dynamic duration based on path complexity (e.g. 260ms for 1 step, up to 420ms for multi-corner flight)
    const duration = Math.min(420, Math.max(260, waypoints.length * 90));
    const startTime = performance.now();

    const getPositionAlongPath = (progress: number): PointCoord => {
      if (totalDistance === 0 || waypoints.length === 1) return waypoints[0];
      const targetDist = progress * totalDistance;
      let accumulated = 0;

      for (let i = 0; i < segmentLengths.length; i++) {
        const segLen = segmentLengths[i];
        if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
          const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
          return {
            x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * segProgress,
            y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * segProgress,
          };
        }
        accumulated += segLen;
      }
      return waypoints[waypoints.length - 1];
    };

    let animId: number;
    const animateGlide = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1.0);
      
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - t, 3);
      const pos = getPositionAlongPath(ease);

      setGlidingState({
        piece: movingPiece,
        currentX: pos.x,
        currentY: pos.y,
        toIndex: lastMove.to,
      });

      if (t < 1.0) {
        animId = requestAnimationFrame(animateGlide);
      } else {
        // Glide completed!
        setGlidingState(null);

        // NOW trigger the eating / collision fluid animation at the destination!
        if (pendingFluidEventRef.current) {
          setActiveFluidEvent(pendingFluidEventRef.current);
          pendingFluidEventRef.current = null;
        } else {
          onAnimationComplete?.();
        }
      }
    };

    animId = requestAnimationFrame(animateGlide);
    return () => cancelAnimationFrame(animId);
  }, [lastMove, coords]);

  // Coordinate getter for FluidCanvas
  const getPointCoords = (boardIndex: number) => {
    return coords[boardIndex] || null;
  };

  const legalTargetSet = useMemo(() => new Set(legalTargets), [legalTargets]);

  // Determine display order of rows (normal: 0..11, flipped: 11..0)
  const rows = useMemo(() => {
    const r = Array.from({ length: BOARD_ROWS }, (_, i) => i);
    return flipBoard ? r.reverse() : r;
  }, [flipBoard]);

  const cols = useMemo(() => {
    const c = Array.from({ length: BOARD_COLS }, (_, i) => i);
    return flipBoard ? c.reverse() : c;
  }, [flipBoard]);

  return (
    <div className="relative flex flex-col items-center justify-center p-2 sm:p-3 select-none">
      {/* Liquid Glass Board Container with Compressed Height */}
      <div 
        ref={containerRef}
        className={clsx(
          'relative liquid-glass-board rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 shadow-2xl border border-white/20',
          'w-full max-w-[500px] sm:max-w-[580px] md:max-w-[640px]'
        )}
      >
        {/* ========================================================= */}
        {/* SVG Network Lines: Highways and Glowing Railroads         */}
        {/* ========================================================= */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Railroad Glow Filter */}
            <filter id="railGlowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Highway Network Lines (including camp diagonals) */}
          {ALL_HIGHWAY_EDGES.map(([u, v]) => {
            const p1 = coords[u];
            const p2 = coords[v];
            if (!p1 || !p2) return null;

            return (
              <line
                key={`hw-${u}-${v}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                className="highway-line"
                stroke={isLight ? "rgba(51, 65, 85, 0.65)" : "rgba(255, 255, 255, 0.38)"}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            );
          })}

          {/* 2. Railroad Network Lines (Thick, Distinct Glowing Tracks) */}
          {ALL_RAILROAD_EDGES.map(([u, v]) => {
            const p1 = coords[u];
            const p2 = coords[v];
            if (!p1 || !p2) return null;

            return (
              <g key={`rr-${u}-${v}`}>
                {/* Outer Glow */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  className="railroad-glow"
                  stroke={isLight ? "rgba(2, 132, 199, 0.28)" : "rgba(56, 189, 248, 0.45)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  filter="url(#railGlowEffect)"
                />
                {/* Outer Rail Track */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  className="railroad-track"
                  stroke={isLight ? "#0284c7" : "#38bdf8"}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                {/* Inner Dark Track Line / Sleeper Texture */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  className="railroad-sleeper"
                  stroke={isLight ? "#ffffff" : "#090d16"}
                  strokeWidth={isLight ? "2.5" : "2"}
                  strokeDasharray="6,4"
                  strokeLinecap="butt"
                />
              </g>
            );
          })}
        </svg>

        {/* Dynamic Fluid Simulation Canvas (Metaball fusion & Splash) */}
        <FluidCanvas 
          fluidEvent={activeFluidEvent}
          getPointCoords={getPointCoords}
          onAnimationComplete={() => {
            setActiveFluidEvent(null);
            onAnimationComplete?.();
          }}
        />

        {/* ========================================================= */}
        {/* Smooth Gliding Piece Trajectory Animation Layer           */}
        {/* ========================================================= */}
        {glidingState && (
          <div
            className="absolute z-40 pointer-events-none transition-none"
            style={{
              left: `${glidingState.currentX}px`,
              top: `${glidingState.currentY}px`,
              transform: 'translate(-50%, -50%) scale(1.15)',
              filter: 'drop-shadow(0 12px 24px rgba(56, 189, 248, 0.6))',
            }}
          >
            <Piece
              piece={glidingState.piece}
              tacticalMark={tacticalMarks?.[glidingState.piece.id]}
              viewerColor={viewerColor}
              gameMode={gameMode}
              theme={theme}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* Board Grid Layout (12 Rows with Horizontal Rectangles)    */}
        {/* ========================================================= */}
        <div className="flex flex-col gap-1 sm:gap-1.5 z-10 relative">
          {rows.map((row) => {
            const isFrontBoundary = (!flipBoard && row === 5) || (flipBoard && row === 6);

            return (
              <React.Fragment key={`row-${row}`}>
                <div className="flex justify-between items-center gap-1 sm:gap-1.5">
                  {cols.map((col) => {
                    const index = row * BOARD_COLS + col;
                    const piece = board[index];
                    const isCamp = ALL_CAMPS.has(index);
                    const isHeadquarter = ALL_HEADQUARTERS.has(index);
                    const isRailroad = RAILROAD_POINTS.has(index);
                    const isSelected = selectedPos === index;
                    const isLegalTarget = legalTargetSet.has(index);
                    const isLastMoved = lastMovedPos === index;
                    
                    // Only hide static piece at destination while gliding piece is actively in-flight to it
                    const isCurrentlyGlidingInto = glidingState?.toIndex === index;
                    const isAnimatingDestination = isCurrentlyGlidingInto;
                    const isCaptureWinner = activeFluidEvent?.toPos === index && activeFluidEvent?.type === 'fusion';

                    return (
                      <div
                        key={`cell-${index}`}
                        ref={(el) => { pointRefs.current[index] = el; }}
                        onClick={() => {
                          if (isLegalTarget && selectedPos !== null) {
                            onMoveTo(index);
                          } else if (piece) {
                            onSelectPiece(index);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onContextMenuPiece?.(index);
                        }}
                        className={clsx(
                          'relative flex items-center justify-center transition-all duration-200',
                          // Horizontal spot dimensions
                          'w-16 h-8 sm:w-20 sm:h-9 md:w-24 md:h-10.5',
                          // Station Styling without textual clutter
                          isCamp ? 'cell-camp rounded-full border-2 border-purple-400/70 bg-purple-950/40 shadow-inner' :
                          isHeadquarter ? 'cell-hq rounded-xl border-2 border-amber-400/70 bg-amber-950/40 shadow-md' :
                          'cell-station rounded-lg border border-white/15 bg-slate-900/50',
                          // Railroad indicator
                          isRailroad && !isCamp && 'border-sky-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]',
                          // Legal destination highlight
                          isLegalTarget && 'cursor-pointer ring-2 ring-emerald-400 bg-emerald-950/50 scale-105 z-20 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                        )}
                      >
                        {/* Empty Station Icons (Clean, No Distracting Text) */}
                        {!piece && !isAnimatingDestination && (
                          <div className="flex items-center justify-center opacity-60">
                            {isCamp ? (
                              <Shield className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
                            ) : isHeadquarter ? (
                              <Flag className="w-3.5 h-3.5 text-amber-300" />
                            ) : (
                              <div className={clsx(
                                'w-2 h-2 rounded-full',
                                isRailroad ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-slate-500/80'
                              )} />
                            )}
                          </div>
                        )}

                        {/* Piece On Station (never disappears upon capturing) */}
                        {piece && !isAnimatingDestination && (
                          <Piece
                            piece={piece}
                            isSelected={isSelected}
                            isLegalTarget={isLegalTarget}
                            isLastMoved={isLastMoved}
                            tacticalMark={piece ? tacticalMarks?.[piece.id] : undefined}
                            viewerColor={viewerColor}
                            gameMode={gameMode}
                            theme={theme}
                            className={isCaptureWinner ? 'scale-105 z-30 transition-transform duration-300' : undefined}
                          />
                        )}

                        {/* Legal Target Fluid Ripple Ring */}
                        {isLegalTarget && !piece && (
                          <div className="absolute inset-0 rounded-lg sm:rounded-xl border-2 border-emerald-400/80 animate-ping pointer-events-none opacity-40" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* River Boundary (前线界河 / 三桥两山) between Row 5 and Row 6 */}
                {isFrontBoundary && (
                  <div
                    className={clsx(
                      "front-boundary-bar relative my-1.5 py-1 px-1 rounded-xl flex justify-between items-center gap-1 sm:gap-1.5 transition-all duration-200",
                      isLight
                        ? "bg-sky-100/40 border border-sky-300/60 shadow-[inset_0_1px_3px_rgba(2,132,199,0.1)]"
                        : "bg-sky-950/30 border border-sky-500/30 shadow-[inset_0_1px_4px_rgba(0,0,0,0.4)]"
                    )}
                  >
                    {cols.map((col) => {
                      const isCenterBridge = col === 2;
                      const isSideBridge = col === 0 || col === 4;
                      const isMountain = col === 1 || col === 3;

                      let label = '';
                      if (isCenterBridge) {
                        label = '前线铁桥';
                      } else if (col === 0) {
                        label = !flipBoard ? '左铁桥' : '右铁桥';
                      } else if (col === 4) {
                        label = !flipBoard ? '右铁桥' : '左铁桥';
                      } else if (col === 1) {
                        label = !flipBoard ? '西山界' : '东山界';
                      } else if (col === 3) {
                        label = !flipBoard ? '东山界' : '西山界';
                      }

                      return (
                        <div
                          key={`boundary-col-${col}`}
                          className="relative w-16 sm:w-20 md:w-24 flex flex-col items-center justify-center"
                        >
                          {/* Bridge Track Guides (Framing the railroad track crossing the river) */}
                          {(isCenterBridge || isSideBridge) && (
                            <div
                              className={clsx(
                                "absolute inset-y-[-4px] w-10 sm:w-12 border-x pointer-events-none transition-colors",
                                isLight ? "border-sky-500/35" : "border-sky-400/25"
                              )}
                            />
                          )}

                          {isCenterBridge ? (
                            <div
                              className={clsx(
                                "relative z-10 w-full py-0.5 sm:py-1 px-1 rounded-lg flex items-center justify-center gap-1 font-black transition-all",
                                "text-[10px] sm:text-xs tracking-wider",
                                isLight
                                  ? "bg-sky-600 text-white border border-sky-700 shadow-md shadow-sky-600/25 ring-1 ring-sky-300/60"
                                  : "bg-sky-600/90 text-white border border-sky-400 shadow-md shadow-sky-500/35 ring-1 ring-sky-300/40"
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                              <span>{label}</span>
                            </div>
                          ) : isSideBridge ? (
                            <div
                              className={clsx(
                                "relative z-10 w-full py-0.5 sm:py-1 px-1 rounded-lg flex items-center justify-center gap-1 font-bold transition-all",
                                "text-[10px] sm:text-xs tracking-tight",
                                isLight
                                  ? "bg-sky-50/95 text-sky-950 border border-sky-300/90 shadow-xs"
                                  : "bg-sky-950/80 text-sky-200 border border-sky-500/50 shadow-xs"
                              )}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                              <span>{label}</span>
                            </div>
                          ) : (
                            <div
                              className={clsx(
                                "relative z-10 w-full py-0.5 sm:py-1 px-1 rounded-lg flex items-center justify-center gap-1 font-bold transition-all",
                                "text-[10px] sm:text-xs tracking-tight",
                                isLight
                                  ? "bg-rose-50/90 text-rose-950 border border-rose-300 shadow-xs"
                                  : "bg-rose-950/70 text-rose-200 border border-rose-500/40 shadow-xs"
                              )}
                            >
                              <Mountain className={clsx("w-3 h-3 shrink-0", isLight ? "text-rose-600" : "text-rose-400")} />
                              <span>{label}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
