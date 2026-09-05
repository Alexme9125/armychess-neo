import React, { useState } from 'react';
import { AIPersonality, AIDifficulty, RuleConfig, DEFAULT_RULES } from '@shared/types';
import { 
  EASTER_EGG_THUNDER, 
  EASTER_EGG_BOMB_ENGINEER 
} from '@shared/blueprintCodec';
import { sound } from '../hooks/useAudio';
import clsx from 'clsx';
import { 
  Bot, 
  Shield, 
  Scale, 
  Zap, 
  Sparkles, 
  Bomb, 
  Eye, 
  EyeOff, 
  Play, 
  X, 
  Layers,
  Coffee,
  Target,
  Flame
} from 'lucide-react';

interface PveSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPve: (params: {
    personality: AIPersonality;
    difficulty: AIDifficulty;
    blueprintCode: string;
    rules: RuleConfig;
    playerColor: 'black' | 'white';
  }) => void;
  onOpenWorkshop: () => void;
}

export const PveSetupModal: React.FC<PveSetupModalProps> = ({
  isOpen,
  onClose,
  onStartPve,
  onOpenWorkshop,
}) => {
  const [personality, setPersonality] = useState<AIPersonality>('balanced');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [gameMode, setGameMode] = useState<'mingqi' | 'anqi'>('anqi');
  const [playerColor, setPlayerColor] = useState<'black' | 'white'>('black');
  const [blueprintCode, setBlueprintCode] = useState('CLASS1');

  if (!isOpen) return null;

  const isThunder = blueprintCode.trim() === EASTER_EGG_THUNDER;
  const isBombEngineer = blueprintCode.trim() === EASTER_EGG_BOMB_ENGINEER;

  const handleStart = () => {
    sound.playPieceClick();
    onStartPve({
      personality,
      difficulty,
      blueprintCode: blueprintCode.trim().toUpperCase() || 'CLASS1',
      rules: {
        ...DEFAULT_RULES,
        gameMode,
      },
      playerColor,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none modal-backdrop-animate">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto liquid-glass-panel rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl flex flex-col gap-5 modal-content-animate custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">PVE 人机练棋设置</h3>
              <p className="text-xs text-slate-400">选择电脑人机风格与开局阵型蓝图</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Personality Selector */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            人机性格：
          </label>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Cautious */}
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setPersonality('cautious'); }}
              className={clsx(
                'p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer',
                personality === 'cautious' ? 'border-cyan-400 bg-cyan-950/50 ring-2 ring-cyan-400/30' : 'border-white/10 bg-slate-900/60 hover:bg-slate-850'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-cyan-300 font-bold text-xs">
                <Shield className="w-4 h-4" /> 谨慎
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                选择较为谨慎的对手
              </p>
            </button>

            {/* Balanced */}
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setPersonality('balanced'); }}
              className={clsx(
                'p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer',
                personality === 'balanced' ? 'border-purple-400 bg-purple-950/50 ring-2 ring-purple-400/30' : 'border-white/10 bg-slate-900/60 hover:bg-slate-850'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-purple-300 font-bold text-xs">
                <Scale className="w-4 h-4" /> 平衡
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                选择较为均衡的对手
              </p>
            </button>

            {/* Aggressive */}
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setPersonality('aggressive'); }}
              className={clsx(
                'p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer',
                personality === 'aggressive' ? 'border-rose-400 bg-rose-950/50 ring-2 ring-rose-400/30' : 'border-white/10 bg-slate-900/60 hover:bg-slate-850'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-rose-300 font-bold text-xs">
                <Zap className="w-4 h-4" /> 激进
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                选择较为激进的对手
              </p>
            </button>
          </div>
        </div>

        {/* 2. Difficulty Selector */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">
            人机难度：
          </label>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Easy */}
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setDifficulty('easy'); }}
              className={clsx(
                'p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer',
                difficulty === 'easy'
                  ? 'border-emerald-400 bg-emerald-950/50 ring-2 ring-emerald-400/30'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-850'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-emerald-300 font-bold text-xs">
                <Coffee className="w-4 h-4 text-emerald-400" /> 简单
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                适合喜欢休闲的玩家
              </p>
            </button>

            {/* Normal */}
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setDifficulty('normal'); }}
              className={clsx(
                'p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer',
                difficulty === 'normal'
                  ? 'border-amber-400 bg-amber-950/50 ring-2 ring-amber-400/30'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-850'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-amber-300 font-bold text-xs">
                <Target className="w-4 h-4 text-amber-400" /> 正常
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                适合追求练手的玩家
              </p>
            </button>

            {/* Hard */}
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setDifficulty('hard'); }}
              className={clsx(
                'p-3 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer',
                difficulty === 'hard'
                  ? 'border-rose-500 bg-rose-950/60 ring-2 ring-rose-400/40'
                  : 'border-white/10 bg-slate-900/60 hover:bg-slate-850'
              )}
            >
              <div className="flex items-center gap-1.5 mb-1 text-rose-300 font-bold text-xs">
                <Flame className="w-4 h-4 text-rose-400" /> 困难
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                适合寻求挑战的玩家
              </p>
            </button>
          </div>
        </div>

        {/* 2. Camp / Color Choice (Black先手 vs White后手) */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">执棋阵营：</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setPlayerColor('black'); }}
              className={clsx(
                'p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer',
                playerColor === 'black'
                  ? 'border-amber-400 bg-amber-950/60 text-amber-200 ring-2 ring-amber-400/40 shadow-md'
                  : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
              )}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-amber-300 shadow-[0_0_8px_#fbbf24]" />
              <span>执黑先手</span>
            </button>

            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setPlayerColor('white'); }}
              className={clsx(
                'p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer',
                playerColor === 'white'
                  ? 'border-sky-400 bg-sky-950/60 text-sky-200 ring-2 ring-sky-400/40 shadow-md'
                  : 'border-white/10 bg-slate-900/60 text-slate-400 hover:text-white'
              )}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-white shadow-[0_0_8px_#ffffff]" />
              <span>执白后手</span>
            </button>
          </div>
        </div>

        {/* 3. Game Mode: Mingqi vs Anqi */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-2">对弈模式：</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setGameMode('anqi'); }}
              className={clsx(
                'p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition',
                gameMode === 'anqi' ? 'border-purple-400 bg-purple-950/60 text-purple-200' : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
              )}
            >
              <EyeOff className="w-4 h-4" /> 暗棋模式
            </button>

            <button
              type="button"
              onClick={() => { sound.playPieceClick(); setGameMode('mingqi'); }}
              className={clsx(
                'p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition',
                gameMode === 'mingqi' ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200' : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
              )}
            >
              <Eye className="w-4 h-4" /> 明棋模式
            </button>
          </div>
        </div>

        {/* 3. Blueprint Code & Easter Egg Recognition (Requirement 5 & 7) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">
              阵型蓝图码 (6位)：
            </label>
            <button
              onClick={onOpenWorkshop}
              className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> 打开布阵工坊
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="text"
              value={blueprintCode}
              onChange={(e) => setBlueprintCode(e.target.value.toUpperCase())}
              placeholder="输入 6 位蓝图码 (如 CLASS1, RUSH01, DEF001)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-cyan-400 shadow-inner"
            />
          </div>

          {/* Easter Egg 1: Thunder Mode 325799 */}
          {isThunder && (
            <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-950/90 to-amber-950/80 border border-amber-400/50 shadow-lg flex items-center gap-2.5 text-amber-200 text-xs animate-pulse">
              <Zap className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">⚡【彩蛋触发：雷霆模式已就绪】</span>
                <p className="text-[10px] text-amber-300/80">
                  除军旗外，玩家全军 24 枚棋子皆为无坚不摧的【司令】！
                </p>
              </div>
            </div>
          )}

          {/* Easter Egg 2: Bomb-Engineer Mode 350234 */}
          {isBombEngineer && (
            <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-rose-950/80 via-red-950/90 to-rose-950/80 border border-rose-400/50 shadow-lg flex items-center gap-2.5 text-rose-200 text-xs animate-pulse">
              <Bomb className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold">💣【彩蛋触发：炸弹兵模式已就绪】</span>
                <p className="text-[10px] text-rose-300/80">
                  1～5排全为炸弹，第6排兵站为工兵，大本营为军旗与司令！
                </p>
              </div>
            </div>
          )}

          {/* Quick preset choices */}
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="shrink-0">快捷推荐:</span>
            <button 
              type="button"
              onClick={() => { sound.playPieceClick(); setBlueprintCode('CLASS1'); }}
              className={clsx(
                "px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0",
                blueprintCode === 'CLASS1'
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 font-bold shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/5"
              )}
            >
              经典平衡
            </button>
            <button 
              type="button"
              onClick={() => { sound.playPieceClick(); setBlueprintCode('RUSH01'); }}
              className={clsx(
                "px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0",
                blueprintCode === 'RUSH01'
                  ? "bg-rose-500/20 text-rose-300 border-rose-400/50 font-bold shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/5"
              )}
            >
              突击强攻
            </button>
            <button 
              type="button"
              onClick={() => { sound.playPieceClick(); setBlueprintCode('DEF001'); }}
              className={clsx(
                "px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0",
                blueprintCode === 'DEF001'
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50 font-bold shadow-sm"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/5"
              )}
            >
              铁壁固守
            </button>
          </div>

          {/* Tactical Tendency Hint */}
          {blueprintCode === 'RUSH01' && (
            <p className="mt-1.5 text-[10px] text-rose-300/90 leading-snug">
              ⚡ 战术倾向：突击强攻 —— 双师长扼守前线两侧，司令军长亲临左右铁轨，闪电突击直逼敌营。
            </p>
          )}
          {blueprintCode === 'DEF001' && (
            <p className="mt-1.5 text-[10px] text-emerald-300/90 leading-snug">
              🛡️ 战术倾向：铁壁固守 —— 三角地雷死锁军旗通路，炸弹藏于后翼，司令坐镇中军防守反击。
            </p>
          )}
          {blueprintCode === 'CLASS1' && (
            <p className="mt-1.5 text-[10px] text-cyan-300/90 leading-snug">
              ⚖️ 战术倾向：攻守平衡 —— 经典兵力梯次配置，兼具前线侦察、铁道工兵控盘与大将纵深机动。
            </p>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm tracking-wider shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98"
        >
          <Play className="w-5 h-5 fill-current" />
          立即开局练棋
        </button>
      </div>
    </div>
  );
};
