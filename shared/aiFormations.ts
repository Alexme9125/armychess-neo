import { AIPersonality, LayoutPlacement } from './types.js';

export interface AIFormation {
  name: string;
  personality: AIPersonality;
  description: string;
  placements: LayoutPlacement[];
}

// =========================================================================
// 1. 激进型阵法池 (Aggressive Formations: 突出速度、铁路突击与大子穿透)
// =========================================================================

// 1.1 双狼突击阵：司令、军长雄踞两侧铁道前沿，炸弹二线掩护，工兵边线机动
export const AGGRESSIVE_TWIN_WOLF: AIFormation = {
  name: '双狼突击阵',
  personality: 'aggressive',
  description: '司令军长雄踞两翼铁道，炸弹二线掩护，雷霆突破',
  placements: [
    { index: 0, pieceType: 'division_commander' },
    { index: 1, pieceType: 'platoon_commander' },
    { index: 2, pieceType: 'battalion_commander' },
    { index: 3, pieceType: 'platoon_commander' },
    { index: 4, pieceType: 'division_commander' },

    { index: 5, pieceType: 'field_marshal' }, // 左翼铁道司令
    { index: 7, pieceType: 'regiment_commander' },
    { index: 9, pieceType: 'corps_commander' }, // 右翼铁道军长

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'brigade_commander' },
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'regiment_commander' },
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'company_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'battalion_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'company_commander' },

    { index: 25, pieceType: 'company_commander' },
    { index: 26, pieceType: 'platoon_commander' }, // 左大本营
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' },              // 右大本营(军旗)
    { index: 29, pieceType: 'engineer' },
  ],
};

// 1.2 中路开山阵：师长突前压迫中央铁桥，军长司令坐镇中轴直捣黄龙
export const AGGRESSIVE_CENTER_RAM: AIFormation = {
  name: '中路开山阵',
  personality: 'aggressive',
  description: '中央铁桥重兵突刺，司令军长轴线调度，锐不可当',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'division_commander' }, // 中路铁桥师长
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'brigade_commander' },
    { index: 7, pieceType: 'corps_commander' }, // 中路军长
    { index: 9, pieceType: 'brigade_commander' },

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'regiment_commander' },
    { index: 13, pieceType: 'division_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'field_marshal' }, // 中路司令
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'platoon_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'battalion_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'battalion_commander' },

    { index: 25, pieceType: 'regiment_commander' },
    { index: 26, pieceType: 'flag' },              // 左大本营(军旗)
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'company_commander' }, // 右大本营
    { index: 29, pieceType: 'engineer' },
  ],
};

// 1.3 雷火强袭阵：炸弹紧贴二排枢纽伺机对拼，大子全面提速接战
export const AGGRESSIVE_THUNDER_FIRE: AIFormation = {
  name: '雷火强袭阵',
  personality: 'aggressive',
  description: '两翼炸弹紧贴前沿强力威慑，司令疾行开路',
  placements: [
    { index: 0, pieceType: 'company_commander' },
    { index: 1, pieceType: 'platoon_commander' },
    { index: 2, pieceType: 'division_commander' },
    { index: 3, pieceType: 'platoon_commander' },
    { index: 4, pieceType: 'company_commander' },

    { index: 5, pieceType: 'corps_commander' },
    { index: 7, pieceType: 'regiment_commander' },
    { index: 9, pieceType: 'field_marshal' },

    { index: 10, pieceType: 'bomb' }, // 边线炸弹
    { index: 11, pieceType: 'brigade_commander' },
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'bomb' }, // 边线炸弹

    { index: 15, pieceType: 'engineer' },
    { index: 17, pieceType: 'division_commander' },
    { index: 19, pieceType: 'engineer' },

    { index: 20, pieceType: 'platoon_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'battalion_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'battalion_commander' },

    { index: 25, pieceType: 'company_commander' },
    { index: 26, pieceType: 'regiment_commander' }, // 左大本营
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' },               // 右大本营(军旗)
    { index: 29, pieceType: 'engineer' },
  ],
};

// 1.4 偏锋侧翼阵：右翼重兵重锤集结，局部形成以多打少的撕裂优势
export const AGGRESSIVE_FLANK_OVERLOAD: AIFormation = {
  name: '偏锋侧翼阵',
  personality: 'aggressive',
  description: '右翼重兵饱和打击，以局部压倒性兵力撕开前线',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'battalion_commander' },
    { index: 3, pieceType: 'platoon_commander' },
    { index: 4, pieceType: 'division_commander' }, // 右翼师长

    { index: 5, pieceType: 'engineer' },
    { index: 7, pieceType: 'brigade_commander' },
    { index: 9, pieceType: 'corps_commander' },    // 右翼军长

    { index: 10, pieceType: 'regiment_commander' },
    { index: 11, pieceType: 'brigade_commander' },
    { index: 13, pieceType: 'division_commander' },
    { index: 14, pieceType: 'field_marshal' },     // 右翼司令

    { index: 15, pieceType: 'engineer' },
    { index: 17, pieceType: 'regiment_commander' },
    { index: 19, pieceType: 'bomb' },              // 右翼炸弹护航

    { index: 20, pieceType: 'company_commander' },
    { index: 21, pieceType: 'bomb' },
    { index: 22, pieceType: 'platoon_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'landmine' },

    { index: 25, pieceType: 'battalion_commander' },
    { index: 26, pieceType: 'flag' },              // 左大本营(军旗)
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'company_commander' }, // 右大本营
    { index: 29, pieceType: 'engineer' },
  ],
};

// =========================================================================
// 2. 平衡型阵法池 (Balanced Formations: 攻守均衡、行营掩护、稳扎稳打)
// =========================================================================

// 2.1 经典标准阵：经典排布，攻防自如，行营掩护严密
export const BALANCED_CLASSIC: AIFormation = {
  name: '经典标准阵',
  personality: 'balanced',
  description: '攻防一体，师旅巡弋，行营呼应，地雷护旗',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'battalion_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'engineer' },
    { index: 7, pieceType: 'regiment_commander' },
    { index: 9, pieceType: 'engineer' },

    { index: 10, pieceType: 'brigade_commander' },
    { index: 11, pieceType: 'division_commander' },
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'division_commander' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'corps_commander' },
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'company_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'field_marshal' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'platoon_commander' },

    { index: 25, pieceType: 'engineer' },
    { index: 26, pieceType: 'flag' },               // 左大本营(军旗)
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'regiment_commander' }, // 右大本营
    { index: 29, pieceType: 'battalion_commander' },
  ],
};

// 2.2 八卦联防阵：高阶将领贴近各行营，炸弹居中策应两翼
export const BALANCED_BAGUA: AIFormation = {
  name: '八卦联防阵',
  personality: 'balanced',
  description: '五大行营外围环绕设防，炸弹策应两翼，进退裕如',
  placements: [
    { index: 0, pieceType: 'company_commander' },
    { index: 1, pieceType: 'platoon_commander' },
    { index: 2, pieceType: 'division_commander' },
    { index: 3, pieceType: 'platoon_commander' },
    { index: 4, pieceType: 'company_commander' },

    { index: 5, pieceType: 'brigade_commander' },
    { index: 7, pieceType: 'corps_commander' },
    { index: 9, pieceType: 'brigade_commander' },

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'regiment_commander' },
    { index: 13, pieceType: 'regiment_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'division_commander' },
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'platoon_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'field_marshal' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'company_commander' },

    { index: 25, pieceType: 'battalion_commander' },
    { index: 26, pieceType: 'battalion_commander' }, // 左大本营
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' },                // 右大本营(军旗)
    { index: 29, pieceType: 'engineer' },
  ],
};

// 2.3 阶梯梯队阵：排连诱敌，师团截杀，司令居中全局调度
export const BALANCED_TIERED: AIFormation = {
  name: '阶梯梯队阵',
  personality: 'balanced',
  description: '前锋侦察诱敌，中军师团阻击，重将梯次策应',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'battalion_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'division_commander' },
    { index: 7, pieceType: 'regiment_commander' },
    { index: 9, pieceType: 'division_commander' },

    { index: 10, pieceType: 'brigade_commander' },
    { index: 11, pieceType: 'corps_commander' },
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'battalion_commander' },
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'engineer' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'field_marshal' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'company_commander' },

    { index: 25, pieceType: 'platoon_commander' },
    { index: 26, pieceType: 'flag' },               // 左大本营(军旗)
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'regiment_commander' }, // 右大本营
    { index: 29, pieceType: 'engineer' },
  ],
};

// 2.4 双星拱卫阵：司令控西、军长控东，双枢纽呼应
export const BALANCED_TWIN_STAR: AIFormation = {
  name: '双星拱卫阵',
  personality: 'balanced',
  description: '司令控西、军长控东，双轨枢纽呼应，阵地严整',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'battalion_commander' },
    { index: 2, pieceType: 'company_commander' },
    { index: 3, pieceType: 'battalion_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'corps_commander' }, // 西路军长
    { index: 7, pieceType: 'division_commander' },
    { index: 9, pieceType: 'division_commander' },

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'brigade_commander' },
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'regiment_commander' },
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'company_commander' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'field_marshal' }, // 东枢纽司令
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'platoon_commander' },

    { index: 25, pieceType: 'regiment_commander' },
    { index: 26, pieceType: 'company_commander' }, // 左大本营
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' },              // 右大本营(军旗)
    { index: 29, pieceType: 'engineer' },
  ],
};

// =========================================================================
// 3. 谨慎型阵法池 (Cautious Formations: 铁桶防守、三角护旗、伏击埋伏)
// =========================================================================

// 3.1 铁壁金汤阵：三颗地雷严密包围左大本营军旗，司令坐镇核心
export const CAUTIOUS_CITADEL: AIFormation = {
  name: '铁壁金汤阵',
  personality: 'cautious',
  description: '三雷鼎足包围军旗要塞，高阶将领退守后排深沟高垒',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'platoon_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'company_commander' },
    { index: 7, pieceType: 'battalion_commander' },
    { index: 9, pieceType: 'battalion_commander' },

    { index: 10, pieceType: 'engineer' },
    { index: 11, pieceType: 'brigade_commander' },
    { index: 13, pieceType: 'brigade_commander' },
    { index: 14, pieceType: 'engineer' },

    { index: 15, pieceType: 'division_commander' },
    { index: 17, pieceType: 'bomb' },
    { index: 19, pieceType: 'division_commander' },

    { index: 20, pieceType: 'bomb' },
    { index: 21, pieceType: 'landmine' }, // 军旗上方地雷
    { index: 22, pieceType: 'field_marshal' },
    { index: 23, pieceType: 'corps_commander' },
    { index: 24, pieceType: 'engineer' },

    { index: 25, pieceType: 'landmine' }, // 军旗左侧地雷
    { index: 26, pieceType: 'flag' },     // 左大本营(军旗)
    { index: 27, pieceType: 'landmine' }, // 军旗右侧地雷
    { index: 28, pieceType: 'regiment_commander' }, // 右大本营
    { index: 29, pieceType: 'regiment_commander' },
  ],
};

// 3.2 行营伏兵阵：重将贴近行营避险，炸弹后设伏击，地雷密锁右侧大本营
export const CAUTIOUS_CAMP_AMBUSH: AIFormation = {
  name: '行营伏兵阵',
  personality: 'cautious',
  description: '炸弹伏击要塞隘口，重将依托安全行营，守株待兔',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'platoon_commander' },
    { index: 2, pieceType: 'company_commander' },
    { index: 3, pieceType: 'platoon_commander' },
    { index: 4, pieceType: 'company_commander' },

    { index: 5, pieceType: 'engineer' },
    { index: 7, pieceType: 'battalion_commander' },
    { index: 9, pieceType: 'engineer' },

    { index: 10, pieceType: 'brigade_commander' },
    { index: 11, pieceType: 'bomb' }, // 行营后伏兵炸弹
    { index: 13, pieceType: 'bomb' }, // 行营后伏兵炸弹
    { index: 14, pieceType: 'brigade_commander' },

    { index: 15, pieceType: 'division_commander' },
    { index: 17, pieceType: 'regiment_commander' },
    { index: 19, pieceType: 'division_commander' },

    { index: 20, pieceType: 'company_commander' },
    { index: 21, pieceType: 'regiment_commander' },
    { index: 22, pieceType: 'corps_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'field_marshal' },

    { index: 25, pieceType: 'engineer' },
    { index: 26, pieceType: 'battalion_commander' }, // 左大本营
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' },                // 右大本营(军旗)
    { index: 29, pieceType: 'landmine' },
  ],
};

// 3.3 九宫稳守阵：左翼密布地雷形成禁飞区，主力居右稳步排查反击
export const CAUTIOUS_NINE_PALACE: AIFormation = {
  name: '九宫稳守阵',
  personality: 'cautious',
  description: '一翼地雷封锁形成绝对禁区，另一翼主力严阵以待',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'platoon_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'battalion_commander' },
    { index: 7, pieceType: 'battalion_commander' },
    { index: 9, pieceType: 'engineer' },

    { index: 10, pieceType: 'brigade_commander' },
    { index: 11, pieceType: 'division_commander' },
    { index: 13, pieceType: 'division_commander' },
    { index: 14, pieceType: 'brigade_commander' },

    { index: 15, pieceType: 'engineer' },
    { index: 17, pieceType: 'regiment_commander' },
    { index: 19, pieceType: 'engineer' },

    { index: 20, pieceType: 'bomb' },
    { index: 21, pieceType: 'landmine' },
    { index: 22, pieceType: 'corps_commander' },
    { index: 23, pieceType: 'bomb' },
    { index: 24, pieceType: 'landmine' },

    { index: 25, pieceType: 'landmine' },
    { index: 26, pieceType: 'flag' },               // 左大本营(军旗)
    { index: 27, pieceType: 'field_marshal' },
    { index: 28, pieceType: 'regiment_commander' }, // 右大本营
    { index: 29, pieceType: 'company_commander' },
  ],
};

// 3.4 诱敌深入阵：前沿弱子示弱引敌入境，中腹陷阱伏兵包抄反打
export const CAUTIOUS_LURING_TRAP: AIFormation = {
  name: '诱敌深入阵',
  personality: 'cautious',
  description: '前沿弱兵虚晃引敌过河，中腹双炸与主力截杀合围',
  placements: [
    { index: 0, pieceType: 'platoon_commander' },
    { index: 1, pieceType: 'company_commander' },
    { index: 2, pieceType: 'platoon_commander' },
    { index: 3, pieceType: 'company_commander' },
    { index: 4, pieceType: 'platoon_commander' },

    { index: 5, pieceType: 'engineer' },
    { index: 7, pieceType: 'battalion_commander' },
    { index: 9, pieceType: 'engineer' },

    { index: 10, pieceType: 'brigade_commander' },
    { index: 11, pieceType: 'division_commander' },
    { index: 13, pieceType: 'division_commander' },
    { index: 14, pieceType: 'brigade_commander' },

    { index: 15, pieceType: 'bomb' },
    { index: 17, pieceType: 'regiment_commander' },
    { index: 19, pieceType: 'bomb' },

    { index: 20, pieceType: 'regiment_commander' },
    { index: 21, pieceType: 'battalion_commander' },
    { index: 22, pieceType: 'company_commander' },
    { index: 23, pieceType: 'landmine' },
    { index: 24, pieceType: 'engineer' },

    { index: 25, pieceType: 'corps_commander' },
    { index: 26, pieceType: 'field_marshal' }, // 左大本营司令坐镇
    { index: 27, pieceType: 'landmine' },
    { index: 28, pieceType: 'flag' },          // 右大本营(军旗)
    { index: 29, pieceType: 'landmine' },
  ],
};

// =========================================================================
// 4. 汇总阵法映射表与随机抽取函数
// =========================================================================

export const AI_FORMATIONS: Record<AIPersonality, AIFormation[]> = {
  aggressive: [
    AGGRESSIVE_TWIN_WOLF,
    AGGRESSIVE_CENTER_RAM,
    AGGRESSIVE_THUNDER_FIRE,
    AGGRESSIVE_FLANK_OVERLOAD,
  ],
  balanced: [
    BALANCED_CLASSIC,
    BALANCED_BAGUA,
    BALANCED_TIERED,
    BALANCED_TWIN_STAR,
  ],
  cautious: [
    CAUTIOUS_CITADEL,
    CAUTIOUS_CAMP_AMBUSH,
    CAUTIOUS_NINE_PALACE,
    CAUTIOUS_LURING_TRAP,
  ],
};

/**
 * 根据选择的性格随机抽取一套符合战术哲学的全新军棋阵型
 */
export function getAIRandomFormation(personality: AIPersonality): AIFormation {
  const pool = AI_FORMATIONS[personality] || AI_FORMATIONS.balanced;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
