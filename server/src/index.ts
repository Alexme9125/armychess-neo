import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { 
  Player,
  PieceColor, 
  RuleConfig, 
  AIPersonality, 
  AIDifficulty,
  DEFAULT_RULES, 
  Piece 
} from '../../shared/types.js';
import { blueprintService } from './blueprintService.js';
import { roomManager, Room } from './roomManager.js';
import { GameSession } from './gameSession.js';
import { selectAIMove } from './aiEngine.js';
import { getAIRandomFormation } from '../../shared/aiFormations.js';
import { createClassicBalancedLayout, validateLayout } from '../../shared/blueprintCodec.js';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Serve client production static files if available
const clientDist = path.resolve(process.cwd(), 'client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// REST API for Blueprints
app.get('/api/blueprints/:code', (req, res) => {
  const bp = blueprintService.getBlueprint(req.params.code);
  if (!bp) {
    return res.status(404).json({ error: '未找到对应蓝图码的阵型' });
  }
  res.json(bp);
});

app.post('/api/blueprints', (req, res) => {
  const { name, placements, author } = req.body;
  if (!placements || !Array.isArray(placements)) {
    return res.status(400).json({ error: '无效的布阵数据' });
  }

  const validation = validateLayout(placements);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const bp = blueprintService.saveBlueprint(name, placements, author);
  res.json(bp);
});

app.get('/api/blueprints', (_req, res) => {
  res.json(blueprintService.getAllBlueprints());
});

// Fallback to SPA index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send('Junqi Server is running.');
  }
});

// Helper: Broadcast room state with privacy masks for each client
function broadcastRoomState(room: Room) {
  io.to(room.code).fetchSockets().then(sockets => {
    for (const socket of sockets) {
      const player = room.getPlayer(socket.id);
      let viewerRole: PieceColor | 'referee' | 'spectator' = 'spectator';
      if (player?.color) {
        viewerRole = player.color;
      }
      socket.emit('room_state', room.toState(viewerRole));
    }
  });
}

// In-memory active PVE sessions: socket.id -> { session, personality, difficulty, playerColor }
interface PVESessionData {
  session: GameSession;
  personality: AIPersonality;
  difficulty: AIDifficulty;
  aiFormationName: string;
  playerColor: PieceColor;
  aiColor: PieceColor;
}
const pveSessions = new Map<string, PVESessionData>();

io.on('connection', (socket: Socket) => {
  console.log(`[Socket Connected] ${socket.id}`);

  // ----------------------------------------------------
  // PVP Handlers
  // ----------------------------------------------------
  socket.on('create_room', ({ playerName, blueprintCode }: { playerName: string; blueprintCode?: string }) => {
    const player: Player = {
      id: socket.id,
      name: playerName || '玩家1',
      color: 'black',
      isHost: true,
      isReady: false,
      blueprintCode,
      connected: true,
    };

    const room = roomManager.createRoom(player);
    socket.join(room.code);
    socket.emit('room_joined', { roomCode: room.code, myRole: 'black' });
    broadcastRoomState(room);
  });

  socket.on('join_room', ({ roomCode, playerName, blueprintCode }: { roomCode: string; playerName: string; blueprintCode?: string }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) {
      return socket.emit('error_message', '房间不存在或已关闭');
    }

    const player: Player = {
      id: socket.id,
      name: playerName || `玩家${Math.floor(Math.random() * 1000)}`,
      color: null,
      isHost: false,
      isReady: false,
      blueprintCode,
      connected: true,
    };

    // Auto-seat if empty
    if (!room.blackPlayer) {
      player.color = 'black';
      room.blackPlayer = player;
    } else if (!room.whitePlayer) {
      player.color = 'white';
      room.whitePlayer = player;
    } else {
      // Room full, join as spectator (Requirement 8)
      room.addSpectator(player);
    }

    socket.join(room.code);
    socket.emit('room_joined', { roomCode: room.code, myRole: player.color || 'spectator' });
    broadcastRoomState(room);
  });

  socket.on('sit_down', ({ roomCode, targetColor }: { roomCode: string; targetColor: PieceColor }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const res = room.sitDown(socket.id, targetColor);
    if (!res.success) {
      return socket.emit('error_message', res.message);
    }
    broadcastRoomState(room);
  });

  socket.on('stand_up', ({ roomCode }: { roomCode: string }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const res = room.standUp(socket.id);
    if (!res.success) {
      return socket.emit('error_message', res.message);
    }
    broadcastRoomState(room);
  });

  socket.on('update_rules', ({ roomCode, rules }: { roomCode: string; rules: Partial<RuleConfig> }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.gameSession && room.gameSession.state.status === 'playing') return;

    room.rules = { ...room.rules, ...rules };
    // Reset ready states when rules change
    if (room.blackPlayer) room.blackPlayer.isReady = false;
    if (room.whitePlayer) room.whitePlayer.isReady = false;

    broadcastRoomState(room);
  });

  socket.on('set_blueprint', ({ roomCode, blueprintCode }: { roomCode: string; blueprintCode: string }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (player) {
      player.blueprintCode = blueprintCode;
      player.isReady = false;
      broadcastRoomState(room);
    }
  });

  socket.on('set_ready', ({ roomCode, isReady }: { roomCode: string; isReady: boolean }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player || !player.color) return;

    player.isReady = isReady;

    if (isReady && room.blackPlayer?.isReady && room.whitePlayer?.isReady) {
      const started = room.tryStartGame();
      if (started) {
        console.log(`[Game Started] Room ${room.code}`);
      }
    }

    broadcastRoomState(room);
  });

  socket.on('make_move', ({ roomCode, from, to }: { roomCode: string; from: number; to: number }) => {
    const room = roomManager.getRoom(roomCode);
    if (!room || !room.gameSession) return;

    const player = room.getPlayer(socket.id);
    if (!player || !player.color) return;

    const res = room.gameSession.makeMove(from, to, player.color);
    if (!res.success) {
      return socket.emit('error_message', res.message);
    }

    broadcastRoomState(room);
  });

  // ----------------------------------------------------
  // PVE Handlers
  // ----------------------------------------------------
  socket.on('pve_start', ({ 
    personality = 'balanced', 
    difficulty = 'normal',
    blueprintCode, 
    rules,
    playerColor = 'black'
  }: { 
    personality?: AIPersonality; 
    difficulty?: AIDifficulty;
    blueprintCode?: string; 
    rules?: Partial<RuleConfig>;
    playerColor?: PieceColor;
  }) => {
    const finalRules: RuleConfig = { ...DEFAULT_RULES, ...(rules || {}) };
    const chosenColor: PieceColor = playerColor === 'white' ? 'white' : 'black';
    const aiColor: PieceColor = chosenColor === 'black' ? 'white' : 'black';
    const chosenPersonality = personality || 'balanced';
    const chosenDifficulty = difficulty || 'normal';
    
    const playerBp = blueprintService.getBlueprint(blueprintCode || '') || {
      code: 'CLASS1',
      name: '标准阵型',
      placements: createClassicBalancedLayout(),
      createdAt: Date.now(),
    };

    // AI randomly selects one of the 4 formations tailored to its personality
    const aiFormation = getAIRandomFormation(chosenPersonality);
    const aiBp = {
      code: 'AI_FORMATION',
      name: aiFormation.name,
      placements: aiFormation.placements,
      createdAt: Date.now(),
    };

    const blackPlacements = chosenColor === 'black' ? playerBp.placements : aiBp.placements;
    const whitePlacements = chosenColor === 'white' ? playerBp.placements : aiBp.placements;

    const session = new GameSession(blackPlacements, whitePlacements, finalRules);
    pveSessions.set(socket.id, {
      session,
      personality: chosenPersonality,
      difficulty: chosenDifficulty,
      aiFormationName: aiFormation.name,
      playerColor: chosenColor,
      aiColor,
    });

    socket.emit('pve_state', {
      game: session.getMaskedState(chosenColor),
      personality: chosenPersonality,
      difficulty: chosenDifficulty,
      aiFormationName: aiFormation.name,
      easterEgg: playerBp.easterEgg,
    });

    // If player chose white, AI (black) moves first!
    if (chosenColor === 'white') {
      setTimeout(() => {
        const currentPve = pveSessions.get(socket.id);
        if (!currentPve || currentPve.session.state.status !== 'playing') return;
        const aiMove = selectAIMove(
          currentPve.session.state.board, 
          'black', 
          currentPve.personality, 
          currentPve.session.state.rules, 
          currentPve.difficulty
        );
        if (aiMove) {
          currentPve.session.makeMove(aiMove.from, aiMove.to, 'black');
          socket.emit('pve_state', {
            game: currentPve.session.getMaskedState('white'),
            personality: currentPve.personality,
            difficulty: currentPve.difficulty,
            aiFormationName: currentPve.aiFormationName,
          });
        }
      }, 650);
    }
  });

  socket.on('pve_move', ({ from, to }: { from: number; to: number }) => {
    const pve = pveSessions.get(socket.id);
    if (!pve) return;

    const { session, personality, difficulty, aiFormationName, playerColor, aiColor } = pve;
    const res = session.makeMove(from, to, playerColor);
    if (!res.success) {
      return socket.emit('error_message', res.message);
    }

    // Send player move result immediately so user sees their piece move and fluid animation
    socket.emit('pve_state', {
      game: session.getMaskedState(playerColor),
      personality,
      difficulty,
      aiFormationName,
    });

    // If game ended after player's move, stop here
    if (session.state.status === 'ended') return;

    // AI thinking delay (natural timing: 600ms)
    setTimeout(() => {
      if (session.state.status !== 'playing' || session.state.turn !== aiColor) return;

      const aiMove = selectAIMove(session.state.board, aiColor, personality, session.state.rules, difficulty);
      if (aiMove) {
        session.makeMove(aiMove.from, aiMove.to, aiColor);
      } else {
        // AI has no moves -> player wins
        session.state.status = 'ended';
        session.state.winner = playerColor;
        session.state.winReason = '电脑已无子可动，我方获胜！';
      }

      socket.emit('pve_state', {
        game: session.getMaskedState(playerColor),
        personality,
        difficulty,
        aiFormationName,
      });
    }, 600);
  });

  // ----------------------------------------------------
  // Disconnect Handling
  // ----------------------------------------------------
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ${socket.id}`);
    pveSessions.delete(socket.id);

    const room = roomManager.findRoomByPlayerId(socket.id);
    if (room) {
      const { gameEnded } = room.removePlayer(socket.id);
      if (gameEnded) {
        console.log(`[Game Ended by Disconnect] Room ${room.code}`);
      }
      broadcastRoomState(room);

      // Clean up empty room if no players and no spectators
      if (!room.blackPlayer && !room.whitePlayer && room.spectators.size === 0) {
        roomManager.deleteRoom(room.code);
      }
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Junqi Server running on http://0.0.0.0:${PORT}`);
});
