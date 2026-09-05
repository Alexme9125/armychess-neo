import React from 'react';
import { RuleConfig } from '@shared/types';
import clsx from 'clsx';
import { Settings, Eye, EyeOff, ShieldCheck, Flame } from 'lucide-react';

interface RuleSettingsProps {
  rules: RuleConfig;
  isHost: boolean;
  onChangeRules: (rules: Partial<RuleConfig>) => void;
  disabled?: boolean;
}

export const RuleSettings: React.FC<RuleSettingsProps> = ({
  rules,
  isHost,
  onChangeRules,
  disabled = false,
}) => {
  return (
    <div className="liquid-glass-panel rounded-2xl p-4 border border-white/10 text-xs">
      <div className="flex items-center gap-2 mb-3 text-slate-300 font-bold">
        <Settings className="w-4 h-4 text-cyan-400" />
        <span>对战规则设定 {isHost ? '(房主可调整)' : '(房主设定)'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Game Mode: Mingqi vs Anqi (Requirement 6) */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-200">可见性模式</span>
            {rules.gameMode === 'mingqi' ? (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <Eye className="w-3.5 h-3.5" /> 明棋 (全公开)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-purple-400 font-bold">
                <EyeOff className="w-3.5 h-3.5" /> 暗棋 (隐藏身份)
              </span>
            )}
          </div>

          {isHost && !disabled ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChangeRules({ gameMode: 'anqi' })}
                className={clsx(
                  'flex-1 py-1 rounded-lg font-semibold transition',
                  rules.gameMode === 'anqi' ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                )}
              >
                暗棋
              </button>
              <button
                type="button"
                onClick={() => onChangeRules({ gameMode: 'mingqi' })}
                className={clsx(
                  'flex-1 py-1 rounded-lg font-semibold transition',
                  rules.gameMode === 'mingqi' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                )}
              >
                明棋
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400">
              {rules.gameMode === 'anqi' ? '暗棋：对方棋子背面朝上，碰撞裁判裁决。' : '明棋：双方所有棋子开局完全可见。'}
            </p>
          )}
        </div>

        {/* 2. Engineer Turn */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-200">工兵铁路拐弯</span>
            <span className="text-cyan-300 font-mono font-bold">
              {rules.engineerTurns === 'free' ? '无限拐弯' : '仅直线'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {rules.engineerTurns === 'free' ? '工兵沿畅通铁路线可任意拐弯变轨，飞跃全场。' : '工兵在铁路上只能走直线。'}
          </p>
        </div>

        {/* 3. Landmine Outcome */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-200">常规踩地雷</span>
            <span className="text-emerald-300 font-mono font-bold">
              {rules.landmineOutcome === 'survive' ? '常规棋子踩雷后地雷保留' : '同归于尽'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            常规军官踩雷阵亡，地雷依然坚挺保留；唯有工兵可安全挖除。
          </p>
        </div>

        {/* 4. Commander Death Reveals Flag */}
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-200">司令阵亡亮旗</span>
            <span className="text-amber-300 font-mono font-bold">
              {rules.commanderDeathReveal ? '立即明示' : '保持隐秘'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            当己方司令阵亡，指挥所暴露，大本营军旗立即翻开向敌方明示。
          </p>
        </div>
      </div>
    </div>
  );
};
