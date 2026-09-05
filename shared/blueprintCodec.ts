import { Blueprint, LayoutPlacement, PieceType, PIECE_CONFIG } from './types.js';
import { RELATIVE_CAMPS, RELATIVE_FRONT_ROW, RELATIVE_HEADQUARTERS, RELATIVE_BACK_ROWS } from './boardData.js';

export const EASTER_EGG_THUNDER = '325799';
export const EASTER_EGG_BOMB_ENGINEER = '350234';

// Character set for 6-char alphanumeric code (excluding easily confused 0, O, 1, I)
const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRandomCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    result += CODE_CHARS[idx];
  }
  return result;
}

// Generate Thunder Mode Layout (325799)
// 1 Flag in Base Camp, other 24 pieces are Field Marshals (司令)
export function createThunderLayout(): LayoutPlacement[] {
  const placements: LayoutPlacement[] = [];
  const campSet = new Set(RELATIVE_CAMPS);

  for (let i = 0; i < 30; i++) {
    if (campSet.has(i)) continue;
    if (i === 26) {
      placements.push({ index: i, pieceType: 'flag' });
    } else {
      placements.push({ index: i, pieceType: 'field_marshal' });
    }
  }
  return placements;
}

// Generate Bomb-Engineer Mode Layout (350234)
// Ranks 1~5 (rows 0~4) are all Bombs (炸弹)
// Rank 6 (row 5) non-camp slots are Engineers (工兵)
// Camps (Base camps) hold Flag (军旗) and Field Marshal (司令)
export function createBombEngineerLayout(): LayoutPlacement[] {
  const placements: LayoutPlacement[] = [];
  const campSet = new Set(RELATIVE_CAMPS);

  // Rows 0..4 (indices 0..24)
  for (let i = 0; i < 25; i++) {
    if (campSet.has(i)) continue;
    placements.push({ index: i, pieceType: 'bomb' });
  }

  // Row 5 (indices 25..29):
  // 26 and 28 are base camps -> Flag and Field Marshal
  // 25, 27, 29 are stations -> Engineers
  placements.push({ index: 25, pieceType: 'engineer' });
  placements.push({ index: 26, pieceType: 'flag' });
  placements.push({ index: 27, pieceType: 'engineer' });
  placements.push({ index: 28, pieceType: 'field_marshal' });
  placements.push({ index: 29, pieceType: 'engineer' });

  return placements;
}

// Default Classic Layouts for quick selection & fallback
export function createClassicBalancedLayout(): LayoutPlacement[] {
  // Classic formation:
  // Row 0 (Front): 排长, 连长, 营长, 连长, 排长
  // Row 1: 工兵, [Camp], 团长, [Camp], 工兵
  // Row 2: 旅长, 师长, [Camp], 旅长, 师长
  // Row 3: 炸弹, [Camp], 军长, [Camp], 炸弹
  // Row 4: 连长, 地雷, 司令, 地雷, 排长
  // Row 5: 工兵, [军旗], 地雷, [团长], 营长
  return [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'battalion_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'engineer' },
    // 6 is camp
    { index: 7, pieceType: 'regiment_commander' },
    // 8 is camp
    { index: 9, pieceType: 'engineer' },

    { index: 10, pieceType: 'brigade_commander' },
    { index: 11, pieceType: 'division_commander' },
    // 12 is camp
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'division_commander' },

    { index: 15, pieceType: 'bomb' },
    // 16 is camp
    { index: 17, pieceType: 'corps_commander' },
    // 18 is camp
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'company_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'field_marshal' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'platoon_commander' },

    { index: 25, pieceType: 'engineer' },
    { index: 26, pieceType: 'flag' }, // Left HQ
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'regiment_commander' }, // Right HQ
    { index: 29, pieceType: 'battalion_commander' },
  ];
}

export function createAssaultLayout(): LayoutPlacement[] {
  // Offensive formation: Commander & Corps Commander near railroad flanks
  return [
    { index: 0, pieceType: 'division_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'battalion_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'division_commander' },

    { index: 5, pieceType: 'field_marshal' }, // on left railroad
    // 6 is camp
    { index: 7, pieceType: 'regiment_commander' },
    // 8 is camp
    { index: 9, pieceType: 'corps_commander' }, // on right railroad

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'brigade_commander' },
    // 12 is camp
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'bomb' },
    // 16 is camp
    { index: 17, pieceType: 'regiment_commander' },
    // 18 is camp
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'platoon_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'battalion_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'platoon_commander' },

    { index: 25, pieceType: 'company_commander' },
    { index: 26, pieceType: 'platoon_commander' }, // Left HQ
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' }, // Right HQ
    { index: 29, pieceType: 'engineer' },
  ];
}

export function createDefensiveLayout(): LayoutPlacement[] {
  // Defensive / Citadel formation:
  // Triangular mine protection around flag, Supreme Commanders guarding rear lines,
  // expendable vanguards probing front lines, Bombs stationed behind camps.
  return [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'platoon_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'company_commander' },
    // 6 is camp
    { index: 7, pieceType: 'battalion_commander' },
    // 8 is camp
    { index: 9, pieceType: 'battalion_commander' },

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'brigade_commander' },
    // 12 is camp
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'division_commander' },
    // 16 is camp
    { index: 17, pieceType: 'bomb' },
    // 18 is camp
    { index: 19, pieceType: 'division_commander' },

    { index: 20, pieceType: 'bomb' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'field_marshal' },
    { index: 23, pieceType: 'corps_commander' },
    { index: 24, pieceType: 'engineer' },

    { index: 25, pieceType: 'landmine' },
    { index: 26, pieceType: 'flag' }, // Left HQ
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'regiment_commander' }, // Right HQ
    { index: 29, pieceType: 'regiment_commander' },
  ];
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateLayout(placements: LayoutPlacement[], isPVE = false, code?: string): ValidationResult {
  if (code === EASTER_EGG_THUNDER || code === EASTER_EGG_BOMB_ENGINEER) {
    return { valid: true };
  }

  if (placements.length !== 25) {
    return { valid: false, message: `需布满 25 枚棋子，当前仅放置了 ${placements.length} 枚` };
  }

  const campSet = new Set(RELATIVE_CAMPS);
  const hqSet = new Set(RELATIVE_HEADQUARTERS);
  const frontRowSet = new Set(RELATIVE_FRONT_ROW);
  const backRowsSet = new Set(RELATIVE_BACK_ROWS);

  // Count piece types
  const pieceCounts: Partial<Record<PieceType, number>> = {};
  let flagInHq = false;

  for (const p of placements) {
    if (campSet.has(p.index)) {
      return { valid: false, message: '行营（安全岛）开局时不能放置棋子' };
    }

    if (p.pieceType === 'flag') {
      if (!hqSet.has(p.index)) {
        return { valid: false, message: '军旗必须放置在大本营内' };
      }
      flagInHq = true;
    }

    if (p.pieceType === 'bomb' && frontRowSet.has(p.index)) {
      return { valid: false, message: '第一排（前线）禁止放置炸弹' };
    }

    if (p.pieceType === 'landmine' && !backRowsSet.has(p.index)) {
      return { valid: false, message: '地雷只能摆放在后两排（第5排和第6排）' };
    }

    pieceCounts[p.pieceType] = (pieceCounts[p.pieceType] || 0) + 1;
  }

  if (!flagInHq) {
    return { valid: false, message: '军旗必须放置在两个大本营之一' };
  }

  // Verify standard piece quantities
  for (const [type, info] of Object.entries(PIECE_CONFIG) as [PieceType, typeof PIECE_CONFIG[PieceType]][]) {
    const count = pieceCounts[type] || 0;
    if (count !== info.count) {
      return { valid: false, message: `${info.name} 数量不匹配：需 ${info.count} 枚，当前有 ${count} 枚` };
    }
  }

  return { valid: true };
}
