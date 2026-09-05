import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  RoomState, 
  GameState, 
  PieceColor, 
  RuleConfig, 
  AIPersonality,
  AIDifficulty,
  DEFAULT_RULES,
  Blueprint 
} from '@shared/types';
import { GameSession } from '@shared/gameSession';
import { selectAIMove } from '@shared/aiEngine';
import { getAIRandomFormation } from '@shared/aiFormations';
import { 
  createClassicBalancedLayout, 
  createAssaultLayout,
  createDefensiveLayout,
  createThunderLayout, 
  createBombEngineerLayout, 
  EASTER_EGG_THUNDER, 
  EASTER_EGG_BOMB_ENGINEER 
} from '@shared/blueprintCodec';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState<string>('');
  
  // PVP State
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myRole, setMyRole] = useState<PieceColor | 'spectator'>('spectator');
  
  // PVE State
  const [pveGame, setPveGame] = useState<GameState | null>(null);
  const [pvePersonality, setPvePersonality] = useState<AIPersonality | null>(null);
  const [pveDifficulty, setPveDifficulty] = useState<AIDifficulty>('normal');
  const [pveAiFormationName, setPveAiFormationName] = useState<string>('经典标准阵');
  const [pvePlayerColor, setPvePlayerColor] = useState<PieceColor>('black');
  const [pveEasterEgg, setPveEasterEgg] = useState<'thunder' | 'bomb_engineer' | undefined>(undefined);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const pveSessionRef = useRef<GameSession | null>(null);
  const pvePersonalityRef = useRef<AIPersonality>('balanced');
  const pveDifficultyRef = useRef<AIDifficulty>('normal');
  const pvePlayerColorRef = useRef<PieceColor>('black');
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global error notification
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Read local custom blueprints
  const getLocalBlueprint = (code: string): Blueprint | null => {
    try {
      const raw = localStorage.getItem('junqi_custom_blueprints');
      if (!raw) return null;
      const list: Blueprint[] = JSON.parse(raw);
      const found = list.find(bp => bp.code.toUpperCase() === code.trim().toUpperCase());
      return found || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Connect directly to backend port 3001 if on Vite port 5173
    const isViteDev = window.location.port === '5173';
    const serverUrl = isViteDev 
      ? `http://${window.location.hostname || 'localhost'}:3001`
      : window.location.origin;

    console.log('[Socket] Connecting to server:', serverUrl);

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket Connected]', socket.id);
      setConnected(true);
      setMyId(socket.id || '');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket Connect Warning]', err.message);
      setConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('[Socket Disconnected]');
      setConnected(false);
    });

    socket.on('room_joined', ({ roomCode, myRole }: { roomCode: string; myRole: PieceColor | 'spectator' }) => {
      setMyRole(myRole);
    });

    socket.on('room_state', (state: RoomState) => {
      setRoomState(state);
    });

    socket.on('error_message', (msg: string) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 3500);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // PVP API
  const createRoom = useCallback((playerName: string, blueprintCode?: string) => {
    if (!socketRef.current?.connected) {
      setErrorMessage('正在连接对战服务器，请稍候...');
    }
    socketRef.current?.emit('create_room', { playerName, blueprintCode });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string, blueprintCode?: string) => {
    if (!socketRef.current?.connected) {
      setErrorMessage('正在连接对战服务器，请稍候...');
    }
    socketRef.current?.emit('join_room', { roomCode, playerName, blueprintCode });
  }, []);

  const sitDown = useCallback((roomCode: string, targetColor: PieceColor) => {
    socketRef.current?.emit('sit_down', { roomCode, targetColor });
  }, []);

  const standUp = useCallback((roomCode: string) => {
    socketRef.current?.emit('stand_up', { roomCode });
  }, []);

  const setReady = useCallback((roomCode: string, isReady: boolean) => {
    socketRef.current?.emit('set_ready', { roomCode, isReady });
  }, []);

  const updateRules = useCallback((roomCode: string, rules: Partial<RuleConfig>) => {
    socketRef.current?.emit('update_rules', { roomCode, rules });
  }, []);

  const setBlueprint = useCallback((roomCode: string, blueprintCode: string) => {
    socketRef.current?.emit('set_blueprint', { roomCode, blueprintCode });
  }, []);

  const makePvpMove = useCallback((roomCode: string, from: number, to: number) => {
    socketRef.current?.emit('make_move', { roomCode, from, to });
  }, []);

  // Helper: AI thinking duration based on personality and difficulty (1.2~3.8 seconds)
  const getAiThinkingDelay = (personality: AIPersonality, difficulty: AIDifficulty): number => {
    if (difficulty === 'easy') {
      // 简单型：快速出子，稍作停顿 1200ms ~ 2000ms
      return 1200 + Math.floor(Math.random() * 800);
    } else if (difficulty === 'hard') {
      // 困难型：深思熟虑推演，思考 2600ms ~ 3800ms
      return 2600 + Math.floor(Math.random() * 1200);
    }
    // 正常型
    switch (personality) {
      case 'aggressive':
        // 激进型：寻隙迅捷果断，思考 1800ms ~ 2500ms
        return 1800 + Math.floor(Math.random() * 700);
      case 'cautious':
        // 谨慎型：深思防线排查，思考 2800ms ~ 3500ms
        return 2800 + Math.floor(Math.random() * 700);
      case 'balanced':
      default:
        // 平衡型：攻守兼备研判，思考 2200ms ~ 3000ms
        return 2200 + Math.floor(Math.random() * 800);
    }
  };

  // Trigger AI turn with human-like deliberation
  const triggerAiTurn = useCallback((
    session: GameSession, 
    aiColor: PieceColor, 
    playerColor: PieceColor, 
    personality: AIPersonality,
    difficulty: AIDifficulty = pveDifficultyRef.current
  ) => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }
    setIsAiThinking(true);

    const delay = getAiThinkingDelay(personality, difficulty);
    aiTimerRef.current = setTimeout(() => {
      aiTimerRef.current = null;
      if (!pveSessionRef.current || pveSessionRef.current !== session) {
        setIsAiThinking(false);
        return;
      }
      if (session.state.status !== 'playing' || session.state.turn !== aiColor) {
        setIsAiThinking(false);
        return;
      }

      const aiMove = selectAIMove(session.state.board, aiColor, personality, session.state.rules, difficulty);
      if (aiMove) {
        session.makeMove(aiMove.from, aiMove.to, aiColor);
      } else {
        session.state.status = 'ended';
        session.state.winner = playerColor;
        session.state.winReason = '电脑已无子可动，我方获胜！';
      }

      setIsAiThinking(false);
      setPveGame(session.getMaskedState(playerColor));
    }, delay);
  }, []);

  // PVE API (self-contained, rock-solid client-side execution)
  const startPve = useCallback((
    personality: AIPersonality, 
    difficulty: AIDifficulty = 'normal',
    blueprintCode?: string, 
    rules?: Partial<RuleConfig>,
    playerColor: PieceColor = 'black'
  ) => {
    const finalRules: RuleConfig = { ...DEFAULT_RULES, ...(rules || {}) };
    pvePersonalityRef.current = personality;
    setPvePersonality(personality);
    pveDifficultyRef.current = difficulty;
    setPveDifficulty(difficulty);
    pvePlayerColorRef.current = playerColor;
    setPvePlayerColor(playerColor);

    // Cancel any existing AI timer
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setIsAiThinking(false);

    // Determine layout
    let easterEgg: 'thunder' | 'bomb_engineer' | undefined;
    let playerPlacements = createClassicBalancedLayout();

    const cleanCode = (blueprintCode || '').trim().toUpperCase();
    if (cleanCode === EASTER_EGG_THUNDER) {
      playerPlacements = createThunderLayout();
      easterEgg = 'thunder';
    } else if (cleanCode === EASTER_EGG_BOMB_ENGINEER) {
      playerPlacements = createBombEngineerLayout();
      easterEgg = 'bomb_engineer';
    } else if (cleanCode === 'RUSH01') {
      playerPlacements = createAssaultLayout();
    } else if (cleanCode === 'DEF001') {
      playerPlacements = createDefensiveLayout();
    } else if (cleanCode && cleanCode !== 'CLASS1') {
      const localBp = getLocalBlueprint(cleanCode);
      if (localBp && localBp.placements) {
        playerPlacements = localBp.placements;
      }
    }
    setPveEasterEgg(easterEgg);

    // Pick a varied, tournament-grade formation matching AI personality
    const aiFormation = getAIRandomFormation(personality);
    const aiPlacements = aiFormation.placements;
    setPveAiFormationName(aiFormation.name);

    // Assign layout based on chosen camp:
    // If player is Black, player gets Black side (rows 0..5), AI gets White side (rows 6..11)
    // If player is White, AI gets Black side, player gets White side
    const blackPlacements = playerColor === 'black' ? playerPlacements : aiPlacements;
    const whitePlacements = playerColor === 'white' ? playerPlacements : aiPlacements;

    const session = new GameSession(blackPlacements, whitePlacements, finalRules);
    pveSessionRef.current = session;

    // Instant local state dispatch for player's perspective
    setPveGame(session.getMaskedState(playerColor));

    // If player chose White, Black (AI) plays first after personality thinking delay (1~4s)!
    if (playerColor === 'white') {
      triggerAiTurn(session, 'black', 'white', personality, difficulty);
    }
  }, [triggerAiTurn]);

  const makePveMove = useCallback((from: number, to: number) => {
    const session = pveSessionRef.current;
    if (!session) return;

    const playerColor = pvePlayerColorRef.current;
    const aiColor: PieceColor = playerColor === 'black' ? 'white' : 'black';

    // Disallow move if AI is thinking or it's not player's turn
    if (session.state.status !== 'playing' || session.state.turn !== playerColor) {
      return;
    }

    const res = session.makeMove(from, to, playerColor);
    if (!res.success) {
      setErrorMessage(res.message || '移动无效');
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }

    // Immediately display player move and fluid animation
    setPveGame(session.getMaskedState(playerColor));

    // If game ended, stop
    if ((session.state.status as string) !== 'playing') return;

    // Trigger AI response with human-like thinking delay
    triggerAiTurn(session, aiColor, playerColor, pvePersonalityRef.current, pveDifficultyRef.current);
  }, [triggerAiTurn]);

  const leavePvpRoom = useCallback(() => {
    setRoomState(null);
    socketRef.current?.disconnect();
    socketRef.current?.connect();
  }, []);

  const leavePve = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    setIsAiThinking(false);
    pveSessionRef.current = null;
    setPveGame(null);
    setPvePersonality(null);
    setPveEasterEgg(undefined);
  }, []);

  return {
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
  };
}
