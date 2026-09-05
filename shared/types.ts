export type PieceColor = 'black' | 'white';

export type PieceType =
  | 'field_marshal'      // 司令 (1)
  | 'corps_commander'    // 军长 (2)
  | 'division_commander' // 师长 (3)
  | 'brigade_commander'  // 旅长 (4)
  | 'regiment_commander' // 团长 (5)
  | 'battalion_commander'// 营长 (6)
  | 'company_commander'  // 连长 (7)
  | 'platoon_commander'  // 排长 (8)
  | 'engineer'           // 工兵 (9)
  | 'landmine'           // 地雷 (M)
  | 'bomb'               // 炸弹 (B)
  | 'flag';              // 军旗 (F)

export interface PieceInfo {
  type: PieceType;
  name: string;
  shortName: string;
  rank: number; // Lower is higher, 1 = field marshal, 9 = engineer, 0 = special
  count: number;
}

export const PIECE_CONFIG: Record<PieceType, PieceInfo> = {
  field_marshal:      { type: 'field_marshal', name: '司令', shortName: '司', rank: 1, count: 1 },
  corps_commander:    { type: 'corps_commander', name: '军长', shortName: '军', rank: 2, count: 1 },
  division_commander: { type: 'division_commander', name: '师长', shortName: '师', rank: 3, count: 2 },
  brigade_commander:  { type: 'brigade_commander', name: '旅长', shortName: '旅', rank: 4, count: 2 },
  regiment_commander: { type: 'regiment_commander', name: '团长', shortName: '团', rank: 5, count: 2 },
  battalion_commander:{ type: 'battalion_commander', name: '营长', shortName: '营', rank: 6, count: 2 },
  company_commander:  { type: 'company_commander', name: '连长', shortName: '连', rank: 7, count: 3 },
  platoon_commander:  { type: 'platoon_commander', name: '排长', shortName: '排', rank: 8, count: 3 },
  engineer:           { type: 'engineer', name: '工兵', shortName: '工', rank: 9, count: 3 },
  landmine:           { type: 'landmine', name: '地雷', shortName: '雷', rank: 100, count: 3 },
  bomb:               { type: 'bomb', name: '炸弹', shortName: '炸', rank: 99, count: 2 },
  flag:               { type: 'flag', name: '军旗', shortName: '旗', rank: 1000, count: 1 },
};

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  position: number; // 0..59 (board index) or -1 for unplaced
  isRevealed?: boolean; // In Anqi mode, true if revealed to all
}

export type PointType = 'station' | 'camp' | 'headquarter';

export interface BoardPoint {
  index: number;
  row: number; // 0..11
  col: number; // 0..4
  type: PointType;
  owner: PieceColor; // row 0..5 is black (or top), row 6..11 is white (or bottom)
  isRailroad: boolean;
  name?: string;
}

export interface RuleConfig {
  gameMode: 'mingqi' | 'anqi'; // 明棋 vs 暗棋
  engineerTurns: 'free' | 'single' | 'straight'; // 1A: free 任意拐弯
  landmineOutcome: 'survive' | 'mutual'; // 2B: survive 常规踩雷地雷胜出保留
  commanderDeathReveal: boolean; // 3A: true 司令阵亡亮军旗
  bombFrontLine: boolean; // 4A: false 炸弹不可放第一排
  baseCampMovable: boolean; // 5A: false 大本营进驻不可移出
}

export const DEFAULT_RULES: RuleConfig = {
  gameMode: 'anqi',
  engineerTurns: 'free',
  landmineOutcome: 'survive',
  commanderDeathReveal: true,
  bombFrontLine: false,
  baseCampMovable: false,
};

export type AIPersonality = 'cautious' | 'balanced' | 'aggressive';
export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface LayoutPlacement {
  pieceType: PieceType;
  index: number; // 0..29 relative to side
}

export interface Blueprint {
  code: string; // 6-char alphanumeric
  name: string;
  author?: string;
  placements: LayoutPlacement[]; // 25 pieces
  createdAt: number;
  easterEgg?: 'thunder' | 'bomb_engineer';
}

export interface Player {
  id: string;
  name: string;
  color: PieceColor | null;
  isHost: boolean;
  isReady: boolean;
  blueprintCode?: string;
  connected: boolean;
}

export type ClashOutcome = 
  | 'move'               // 正常移动到空格
  | 'attacker_wins'      // 攻击方胜（液体融合）
  | 'defender_wins'      // 防守方胜（液体融合）
  | 'mutual_destruction' // 同归于尽（液体撞击消散）
  | 'game_over';         // 扛旗/胜负终局

export interface FluidEvent {
  id: string;
  type: 'fusion' | 'splash';
  fromPos: number;
  toPos: number;
  winnerColor?: PieceColor;
  loserColor?: PieceColor;
  winnerType?: PieceType;
  loserType?: PieceType;
  isMutual?: boolean;
}

export interface MoveRecord {
  from: number;
  to: number;
  player: PieceColor;
  outcome: ClashOutcome;
  timestamp: number;
  attackerType?: PieceType;
  defenderType?: PieceType;
}

export interface GameState {
  board: (Piece | null)[]; // length 60
  turn: PieceColor;
  status: 'waiting' | 'ready' | 'playing' | 'ended';
  winner: PieceColor | null;
  winReason?: string;
  rules: RuleConfig;
  blackFlagRevealed: boolean;
  whiteFlagRevealed: boolean;
  moveCount: number;
  lastMove: MoveRecord | null;
  fluidEvent: FluidEvent | null;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  blackPlayer: Player | null;
  whitePlayer: Player | null;
  spectators: Player[];
  rules: RuleConfig;
  game: GameState | null;
}
