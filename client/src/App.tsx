import React, { useState, useMemo, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { Board } from './components/Board';
import { BlueprintModal } from './components/BlueprintModal';
import { RoomLobby } from './components/RoomLobby';
import { PveSetupModal } from './components/PveSetupModal';
import { TacticalMarkToolbar, TacticalMarkType } from './components/TacticalMarkToolbar';
import { getLegalMoves } from '@shared/ruleEngine';
import { PieceColor } from '@shared/types';
import { sound } from './hooks/useAudio';
import confetti from 'canvas-confetti';
import clsx from 'clsx';
import { 
  Swords, 
  Bot, 
  Sparkles, 
  Layers, 
  Users, 
  Trophy, 
  RotateCcw, 
  Volume2, 
  Info, 
  Zap, 
  Bomb, 
  CheckCircle2, 
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

export function App() {
  const {
    connected,
    myId,
    roomState,
    myRole,
    pveGame,
    pvePersonality,
    pveDifficulty,
    pveAiFormationName,
    pvePlayerColor,
    pveEasterEgg,
    isAiThinking,
    errorMessage,
    createRoom,
    joinRoom,
    sitDown,
    standUp,
    setReady,
    updateRules,
    setBlueprint,
    makePvpMove,
    startPve,
    makePveMove,
    leavePvpRoom,
    leavePve,
  } = useSocket();

  // Theme state: dark (default) vs light (white mica)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('junqi_theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    sound.playPieceClick();
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('junqi_theme', next);
    } catch {
      // ignore
    }
  };

  // Modals
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [isPveSetupOpen, setIsPveSetupOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [playerName, setPlayerName] = useState(() => `指挥官_${Math.floor(100 + Math.random() * 900)}`);
  const [activeBlueprintCode, setActiveBlueprintCode] = useState('CLASS1');

  // Board interaction state
  const [selectedPos, setSelectedPos] = useState<number | null>(null);

  // Tactical mark state in Anqi mode
  const [tacticalMarks, setTacticalMarks] = useState<Record<string, TacticalMarkType>>({});
  const [activeMarkTool, setActiveMarkTool] = useState<TacticalMarkType | 'eraser' | null>(null);

  // Active game session (either PVP active game or PVE active game)
  const isPvpActive = roomState?.game && roomState.game.status === 'playing';
  const isPvpEnded = roomState?.game && roomState.game.status === 'ended';
  const isPveActive = pveGame && (pveGame.status === 'playing' || pveGame.status === 'ended');

  const currentGame = isPvpActive || isPvpEnded ? roomState.game : pveGame;

  // Determine viewer color & turn based on PVP role or PVE chosen color
  const pvpPlayerColor: PieceColor | 'spectator' = useMemo(() => {
    if (!roomState) return (myRole === 'black' || myRole === 'white') ? myRole : 'spectator';
    if (roomState.blackPlayer?.id === myId) return 'black';
    if (roomState.whitePlayer?.id === myId) return 'white';
    return (myRole === 'black' || myRole === 'white') ? myRole : 'spectator';
  }, [roomState, myId, myRole]);

  const viewerColor: PieceColor | 'spectator' = isPveActive 
    ? pvePlayerColor 
    : pvpPlayerColor;

  const isMyTurn = currentGame?.status === 'playing' && (
    viewerColor !== 'spectator' && currentGame.turn === viewerColor && !isAiThinking
  );

  // Calculate legal moves for selected piece
  const legalTargets = useMemo(() => {
    if (!currentGame || selectedPos === null) return [];
    const piece = currentGame.board[selectedPos];
    if (!piece) return [];
    
    // Only allow selecting own piece on your turn
    if (viewerColor !== 'spectator' && piece.color !== viewerColor) return [];
    if (!isMyTurn) return [];

    return getLegalMoves(currentGame.board, selectedPos, currentGame.rules);
  }, [currentGame, selectedPos, viewerColor, isMyTurn]);

  // Victory celebration (audio silenced per user requirement)
  useEffect(() => {
    if (currentGame?.status === 'ended' && currentGame.winner) {
      const isSpectator = viewerColor === 'spectator';
      const didIWin = !isSpectator && currentGame.winner === viewerColor;
      if (didIWin) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [currentGame?.status, currentGame?.winner, viewerColor]);

  // Handle Piece Click
  const handleSelectPiece = (pos: number) => {
    if (!currentGame || currentGame.status !== 'playing') return;

    const piece = currentGame.board[pos];
    if (!piece) {
      setSelectedPos(null);
      return;
    }

    const isOpponent = viewerColor !== 'spectator' && piece.color !== viewerColor;

    // Tactical marking on enemy pieces in Anqi mode
    if (isOpponent && currentGame.rules.gameMode === 'anqi') {
      setSelectedPos(null);

      // Case A: A mark tool is active from the toolbar
      if (activeMarkTool) {
        sound.playPieceClick();
        setTacticalMarks(prev => {
          const next = { ...prev };
          if (activeMarkTool === 'eraser') {
            delete next[piece.id];
          } else {
            if (next[piece.id] === activeMarkTool) {
              delete next[piece.id]; // Toggle off
            } else {
              next[piece.id] = activeMarkTool;
            }
          }
          return next;
        });
        return;
      }

      // Case B: No tool active -> directly cycle through marks: ! -> ? -> × -> + -> - -> none
      sound.playPieceClick();
      setTacticalMarks(prev => {
        const cycle: (TacticalMarkType | null)[] = ['!', '?', '×', '+', '-', null];
        const curr = prev[piece.id] || null;
        const currIdx = cycle.indexOf(curr);
        const nextMark = cycle[(currIdx + 1) % cycle.length];
        const next = { ...prev };
        if (!nextMark) {
          delete next[piece.id];
        } else {
          next[piece.id] = nextMark;
        }
        return next;
      });
      return;
    }

    // Friendly piece selection for moving (only on player's turn)
    if (piece.color === viewerColor && isMyTurn) {
      sound.playPieceClick();
      setSelectedPos(pos);
    }
  };

  // Right-click to cycle/toggle mark on enemy piece
  const handleContextMenuPiece = (pos: number) => {
    if (!currentGame || currentGame.rules.gameMode !== 'anqi') return;
    const piece = currentGame.board[pos];
    if (!piece) return;
    const isOpponent = viewerColor !== 'spectator' && piece.color !== viewerColor;
    if (!isOpponent) return;

    sound.playPieceClick();
    setTacticalMarks(prev => {
      const cycle: (TacticalMarkType | null)[] = ['!', '?', '×', '+', '-', null];
      const curr = prev[piece.id] || null;
      const currIdx = cycle.indexOf(curr);
      const nextMark = cycle[(currIdx + 1) % cycle.length];
      const next = { ...prev };
      if (!nextMark) {
        delete next[piece.id];
      } else {
        next[piece.id] = nextMark;
      }
      return next;
    });
  };

  // Handle Move to Target
  const handleMoveTo = (targetPos: number) => {
    if (selectedPos === null || !currentGame || !isMyTurn) return;

    sound.playPieceClick();
    if (isPveActive) {
      makePveMove(selectedPos, targetPos);
    } else if (roomState) {
      makePvpMove(roomState.roomCode, selectedPos, targetPos);
    }

    setSelectedPos(null);
  };

  return (
    <div className={clsx(
      "min-h-screen flex flex-col items-center justify-between relative overflow-x-hidden transition-colors duration-300",
      theme === 'light' ? 'theme-light bg-slate-100 text-slate-900' : 'theme-dark bg-slate-950 text-slate-100'
    )}>
      
      {/* Background Ambient Glow & Fluid Waves */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="mica-ambient-glow-1 absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="mica-ambient-glow-2 absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="mica-ambient-glow-3 absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="fixed top-5 z-50 px-5 py-3 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2.5 animate-bounce">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="w-full z-20 liquid-glass-panel border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Swords className="w-5 h-5" />
          </div>
          <span className="font-sans font-black text-lg sm:text-xl tracking-wider bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
            军棋
          </span>
        </div>

        {/* Right Controls: Theme Toggle + Workshop + Online Status */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Light / Dark Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={clsx(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition cursor-pointer",
              theme === 'light'
                ? "bg-white/90 hover:bg-white text-slate-800 border-slate-300/80 shadow"
                : "bg-slate-900/80 hover:bg-slate-800 text-amber-300 border-amber-400/30"
            )}
            title="切换界面主题"
          >
            {theme === 'light' ? '亮色' : '暗色'}
          </button>

          <button
            onClick={() => setIsWorkshopOpen(true)}
            className={clsx(
              "px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer",
              theme === 'light'
                ? "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-300"
                : "bg-slate-900/80 hover:bg-slate-800 border-cyan-400/30 text-cyan-300"
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            布阵工坊
          </button>

          <div className="flex items-center gap-1.5 text-xs opacity-70 font-mono">
            <span className={clsx('w-2 h-2 rounded-full', connected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500')} />
            <span className="hidden md:inline">{connected ? '服务器在线' : '连接中...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 flex flex-col items-center justify-center z-10 py-3 sm:py-6 px-2 sm:px-4">
        
        {/* VIEW 1: Active Chess Board (PVP or PVE) */}
        {currentGame ? (
          <div className="w-full flex flex-col items-center gap-4">
            
            {/* Top Match HUD */}
            <div className="w-full max-w-[500px] sm:max-w-[580px] md:max-w-[640px] liquid-glass-panel rounded-2xl px-3 sm:px-4 py-2 border border-white/10 flex items-center justify-between gap-2 text-xs h-12 min-h-[48px]">
              
              {/* Left Badges: Mode & Camp */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {isPveActive ? (
                  <span className={clsx(
                    "px-2 py-0.5 rounded-lg font-bold flex items-center gap-1",
                    theme === 'light'
                      ? "bg-purple-50 text-purple-900 border border-purple-300/80 shadow-sm"
                      : "bg-purple-500/20 text-purple-300 border border-purple-400/30"
                  )}>
                    <Bot className={clsx("w-3.5 h-3.5", theme === 'light' ? "text-purple-700" : "text-purple-300")} /> 
                    {pvePersonality === 'cautious' ? '谨慎人机' : pvePersonality === 'aggressive' ? '激进人机' : '平衡人机'}
                    <span className={clsx(
                      "ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                      pvePlayerColor === 'black'
                        ? (theme === 'light' ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm" : "bg-amber-500/30 text-amber-200")
                        : (theme === 'light' ? "bg-sky-100 text-sky-900 border border-sky-300 shadow-sm" : "bg-sky-500/30 text-sky-200")
                    )}>
                      {pvePlayerColor === 'black' ? '我方执黑' : '我方执白'}
                    </span>
                  </span>
                ) : (
                  <span className={clsx(
                    "px-2 py-0.5 rounded-lg font-bold flex items-center gap-1",
                    theme === 'light'
                      ? "bg-cyan-50 text-cyan-900 border border-cyan-300/80 shadow-sm"
                      : "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                  )}>
                    <Users className={clsx("w-3.5 h-3.5", theme === 'light' ? "text-cyan-700" : "text-cyan-300")} /> 房号 {roomState?.roomCode}
                    <span className={clsx(
                      "ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold",
                      viewerColor === 'black'
                        ? (theme === 'light' ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm" : "bg-amber-500/30 text-amber-200")
                        : viewerColor === 'white'
                        ? (theme === 'light' ? "bg-sky-100 text-sky-900 border border-sky-300 shadow-sm" : "bg-sky-500/30 text-sky-200")
                        : (theme === 'light' ? "bg-slate-200 text-slate-800" : "bg-slate-700/50 text-slate-300")
                    )}>
                      {viewerColor === 'black' ? '我方执黑' : viewerColor === 'white' ? '我方执白' : '观战'}
                    </span>
                  </span>
                )}

                <span className={clsx(
                  "px-1.5 py-0.5 rounded-md font-mono text-[11px]",
                  theme === 'light'
                    ? "bg-slate-100 text-slate-800 border border-slate-300/70 font-semibold"
                    : "bg-slate-800 text-slate-300"
                )}>
                  {currentGame.rules.gameMode === 'anqi' ? '暗棋' : '明棋'}
                </span>

                {/* Easter Egg Badge if triggered */}
                {pveEasterEgg === 'thunder' && (
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse text-[11px]",
                    theme === 'light'
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  )}>
                    <Zap className="w-3 h-3" /> 雷霆
                  </span>
                )}

                {pveEasterEgg === 'bomb_engineer' && (
                  <span className={clsx(
                    "px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse text-[11px]",
                    theme === 'light'
                      ? "bg-rose-100 text-rose-900 border border-rose-300"
                      : "bg-rose-500/20 text-rose-300 border border-rose-400/40"
                  )}>
                    <Bomb className="w-3 h-3" /> 炸弹兵
                  </span>
                )}
              </div>

              {/* Right: Turn / Thinking Indicator & Exit Button */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {currentGame.status === 'playing' ? (
                  isPveActive && isAiThinking ? (
                    <div className={clsx(
                      "px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1.5 shadow text-xs animate-pulse",
                      pveDifficulty === 'hard'
                        ? (theme === 'light' ? "bg-rose-100 text-rose-900 border border-rose-300" : "bg-rose-950/80 text-rose-200 border border-rose-400/50")
                        : pveDifficulty === 'easy'
                        ? (theme === 'light' ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-emerald-950/80 text-emerald-200 border border-emerald-400/50")
                        : (theme === 'light' ? "bg-purple-100 text-purple-900 border border-purple-300" : "bg-purple-950/80 text-purple-200 border border-purple-400/50")
                    )}>
                      <Bot className={clsx(
                        "w-3.5 h-3.5 animate-spin",
                        pveDifficulty === 'hard' ? "text-rose-600 dark:text-rose-400" :
                        pveDifficulty === 'easy' ? "text-emerald-600 dark:text-emerald-400" :
                        "text-purple-600 dark:text-purple-400"
                      )} />
                      <span>思考中……</span>
                      <span className={clsx(
                        "w-1.5 h-1.5 rounded-full animate-ping",
                        pveDifficulty === 'hard' ? "bg-rose-500" : pveDifficulty === 'easy' ? "bg-emerald-500" : "bg-purple-500"
                      )} />
                    </div>
                  ) : (
                    <div className={clsx(
                      'px-2.5 py-0.5 rounded-lg font-bold flex items-center gap-1.5 shadow text-xs',
                      currentGame.turn === 'black' ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40' : 'bg-slate-200 text-slate-900'
                    )}>
                      <span className={clsx('w-1.5 h-1.5 rounded-full animate-ping', currentGame.turn === 'black' ? 'bg-amber-400' : 'bg-slate-700')} />
                      <span>{currentGame.turn === 'black' ? '轮到黑方' : '轮到白方'}</span>
                      {isMyTurn && <span className="text-[10px] ml-0.5 bg-cyan-500 text-slate-950 px-1 rounded font-bold">您行动</span>}
                    </div>
                  )
                ) : (
                  <div className={clsx(
                    'px-2.5 py-0.5 rounded-lg font-bold border text-xs shadow',
                    viewerColor !== 'spectator' && currentGame.winner === viewerColor
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : viewerColor !== 'spectator'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                  )}>
                    {viewerColor !== 'spectator'
                      ? (currentGame.winner === viewerColor ? '我方胜' : '我方负')
                      : (currentGame.winner === 'black' ? '黑方胜' : '白方胜')}
                  </div>
                )}

                {/* Exit Button */}
                <button
                  onClick={() => {
                    if (isPveActive) leavePve();
                    else leavePvpRoom();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs font-semibold cursor-pointer"
                >
                  退出
                </button>
              </div>
            </div>

            {/* The Liquid Glass Chess Board with Responsive Tactical Mark Toolbar */}
            <div className="relative flex flex-col items-center justify-center w-full">
              <div className="relative flex items-center justify-center">
                <Board
                  board={currentGame.board}
                  selectedPos={selectedPos}
                  legalTargets={legalTargets}
                  lastMovedPos={currentGame.lastMove?.to}
                  viewerColor={viewerColor}
                  gameMode={currentGame.rules.gameMode}
                  fluidEvent={currentGame.fluidEvent}
                  lastMove={currentGame.lastMove}
                  tacticalMarks={tacticalMarks}
                  onSelectPiece={handleSelectPiece}
                  onMoveTo={handleMoveTo}
                  onContextMenuPiece={handleContextMenuPiece}
                  flipBoard={viewerColor !== 'white'}
                  theme={theme}
                />

                {/* Desktop (lg+): Side Floating Tactical Mark Toolbar in Anqi Mode */}
                {currentGame.rules.gameMode === 'anqi' && (
                  <div className="hidden lg:block absolute left-full ml-3 xl:ml-4 top-1/2 -translate-y-1/2 z-40">
                    <TacticalMarkToolbar
                      activeTool={activeMarkTool}
                      onSelectTool={(tool) => {
                        setActiveMarkTool(tool);
                        setSelectedPos(null);
                      }}
                      onClearAll={() => setTacticalMarks({})}
                      marksCount={Object.keys(tacticalMarks).length}
                      theme={theme}
                      layout="vertical"
                    />
                  </div>
                )}
              </div>

              {/* Mobile / Tablet (<lg): Horizontal Tactical Mark Toolbar docked directly below board */}
              {currentGame.rules.gameMode === 'anqi' && (
                <div className="lg:hidden mt-2.5 sm:mt-3.5 z-30 w-full flex justify-center px-2">
                  <TacticalMarkToolbar
                    activeTool={activeMarkTool}
                    onSelectTool={(tool) => {
                      setActiveMarkTool(tool);
                      setSelectedPos(null);
                    }}
                    onClearAll={() => setTacticalMarks({})}
                    marksCount={Object.keys(tacticalMarks).length}
                    theme={theme}
                    layout="horizontal"
                  />
                </div>
              )}
            </div>

            {/* Game Over Modal */}
            {currentGame.status === 'ended' && (() => {
              const isSpectator = viewerColor === 'spectator';
              const didIWin = !isSpectator && currentGame.winner === viewerColor;
              const didILose = !isSpectator && currentGame.winner && currentGame.winner !== viewerColor;

              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none">
                  <div className={clsx(
                    "liquid-glass-panel rounded-3xl p-6 sm:p-8 max-w-md w-full border shadow-2xl flex flex-col items-center text-center",
                    didIWin ? "border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.25)]" :
                    didILose ? "border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.25)]" :
                    "border-cyan-400/40 shadow-[0_0_30px_rgba(56,189,248,0.25)]"
                  )}>
                    {/* Visual Icon */}
                    <div className={clsx(
                      "w-16 h-16 rounded-full border flex items-center justify-center mb-4 shadow-lg",
                      didIWin ? "bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.4)]" :
                      didILose ? "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.3)]" :
                      "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_24px_rgba(56,189,248,0.4)]"
                    )}>
                      {didIWin ? (
                        <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                      ) : didILose ? (
                        <AlertCircle className="w-8 h-8 text-rose-400" />
                      ) : (
                        <Trophy className="w-8 h-8 text-cyan-400" />
                      )}
                    </div>

                    {/* Prominent result title: Explicitly showing whether our side won or lost */}
                    <h3 className={clsx(
                      "text-2xl sm:text-3xl font-black mb-1.5 tracking-wide",
                      didIWin ? "text-amber-300" :
                      didILose ? "text-rose-400" :
                      "text-white"
                    )}>
                      {didIWin ? '🏆 我方获胜！' :
                       didILose ? '💔 我方战败' :
                       (currentGame.winner === 'black' ? '黑方斩获胜利！' : '白方斩获胜利！')}
                    </h3>

                    {/* Result role tag */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={clsx(
                        "text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border",
                        didIWin ? "bg-amber-500/20 text-amber-300 border-amber-400/30" :
                        didILose ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                        "bg-cyan-500/20 text-cyan-300 border-cyan-400/30"
                      )}>
                        {didIWin ? '战斗胜利 · VICTORY' :
                         didILose ? '战斗失败 · DEFEAT' :
                         (currentGame.winner === 'black' ? '黑方胜利' : '白方胜利')}
                      </span>
                    </div>

                    {/* Description of win reason */}
                    <div className="text-xs sm:text-sm text-slate-300 mb-6 px-4 py-3 rounded-2xl bg-slate-900/70 border border-white/10 w-full space-y-1">
                      <p className="font-medium text-slate-200">
                        {currentGame.winReason || (didIWin ? '运筹帷幄，决胜千里！' : '胜败乃兵家常事，重整旗鼓再战！')}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {viewerColor !== 'spectator' ? `您执${viewerColor === 'black' ? '黑' : '白'}军` : '观战模式'} · 终局共经历 {currentGame.moveCount} 回合
                      </p>
                    </div>

                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => {
                          if (isPveActive) {
                            startPve(pvePersonality || 'balanced', pveDifficulty, activeBlueprintCode, undefined, pvePlayerColor);
                          } else {
                            setReady(roomState!.roomCode, true);
                          }
                        }}
                        className={clsx(
                          "flex-1 py-3 rounded-2xl font-bold text-sm shadow-md transition cursor-pointer",
                          didIWin
                            ? "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-amber-500/20"
                            : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20"
                        )}
                      >
                        再战一局
                      </button>

                      <button
                        onClick={() => {
                          if (isPveActive) leavePve();
                          else leavePvpRoom();
                        }}
                        className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition cursor-pointer"
                      >
                        返回主页
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : roomState ? (
          // VIEW 2: PVP Room Waiting Lobby
          <RoomLobby
            roomState={roomState}
            myId={myId}
            onSitDown={(color) => sitDown(roomState.roomCode, color)}
            onStandUp={() => standUp(roomState.roomCode)}
            onSetReady={(isReady) => setReady(roomState.roomCode, isReady)}
            onUpdateRules={(rules) => updateRules(roomState.roomCode, rules)}
            onSetBlueprint={(code) => setBlueprint(roomState.roomCode, code)}
            onOpenWorkshop={() => setIsWorkshopOpen(true)}
            onLeaveRoom={leavePvpRoom}
          />
        ) : (
          // VIEW 3: Main Menu Landing Screen
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 select-none">
            
            {/* Hero Section */}
            <div className="text-center py-4">
              <h2 className="text-4xl sm:text-6xl font-sans font-black tracking-wider text-white">
                军棋
              </h2>
            </div>

            {/* Profile Bar */}
            <div className="liquid-glass-panel rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">您的指挥官代号:</span>
                <input 
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-white/10 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-mono">当前默认蓝图:</span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                  {activeBlueprintCode}
                </span>
                <button
                  onClick={() => setIsWorkshopOpen(true)}
                  className="text-cyan-400 hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" /> 修改
                </button>
              </div>
            </div>

            {/* Three Main Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: PVP Room Battle */}
              <div className="liquid-glass-panel rounded-3xl p-6 border border-cyan-400/20 hover:border-cyan-400/40 transition flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 group-hover:scale-110 transition">
                    <Swords className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">PVP 双人联机</h3>
                </div>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    onClick={() => createRoom(playerName, activeBlueprintCode)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition"
                  >
                    创建新房间
                  </button>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      maxLength={6}
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value)}
                      placeholder="输入 6 位房间码"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs uppercase focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={() => {
                        if (joinCodeInput.trim()) {
                          joinRoom(joinCodeInput.trim(), playerName, activeBlueprintCode);
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      加入
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: PVE Practice Arena */}
              <div className="liquid-glass-panel rounded-3xl p-6 border border-purple-400/20 hover:border-purple-400/40 transition flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 mb-4 group-hover:scale-110 transition">
                    <Bot className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">PVE 人机练棋</h3>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setIsPveSetupOpen(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition"
                  >
                    配置人机开局
                  </button>
                </div>
              </div>

              {/* Card 3: Blueprint Workshop */}
              <div className="liquid-glass-panel rounded-3xl p-6 border border-amber-400/20 hover:border-amber-400/40 transition flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-4 group-hover:scale-110 transition">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">布阵工坊</h3>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setIsWorkshopOpen(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-md transition"
                  >
                    开启布阵工坊
                  </button>
                </div>
              </div>

            </div>

            {/* Rules Section */}
            <div className="liquid-glass-panel rounded-2xl p-4 border border-white/10 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400" />
                  本服已启用的官方争议规则设定（已定夺生效）
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-400">
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-cyan-300 font-bold block mb-0.5">工兵拐弯</span>
                  <span>铁道上可无限任意拐弯飞行</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-emerald-300 font-bold block mb-0.5">常规踩雷</span>
                  <span>常规棋子踩雷后地雷保留</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-amber-300 font-bold block mb-0.5">司令阵亡</span>
                  <span>立即亮出军旗大本营位置</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-purple-300 font-bold block mb-0.5">炸弹首排</span>
                  <span>第一行不能放置炸弹</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/60 border border-white/5">
                  <span className="text-rose-300 font-bold block mb-0.5">大本营守备</span>
                  <span>大本营中的棋子不能移出</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full z-20 py-4 px-6 text-center text-xs text-slate-500 font-mono border-t border-white/5">
        Powered by Darwin Chess Engine
      </footer>

      {/* Modals */}
      <BlueprintModal
        isOpen={isWorkshopOpen}
        onClose={() => setIsWorkshopOpen(false)}
        onSelectBlueprint={(code) => {
          setActiveBlueprintCode(code);
          if (roomState) setBlueprint(roomState.roomCode, code);
        }}
      />

      <PveSetupModal
        isOpen={isPveSetupOpen}
        onClose={() => setIsPveSetupOpen(false)}
        onStartPve={({ personality, difficulty, blueprintCode, rules, playerColor }) => {
          setIsPveSetupOpen(false);
          startPve(personality, difficulty, blueprintCode, rules, playerColor);
        }}
        onOpenWorkshop={() => {
          setIsPveSetupOpen(false);
          setIsWorkshopOpen(true);
        }}
      />

    </div>
  );
}

export default App;
