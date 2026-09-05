import React, { useState } from 'react';
import { RoomState, PieceColor, RuleConfig, Player } from '@shared/types';
import { RuleSettings } from './RuleSettings';
import { sound } from '../hooks/useAudio';
import clsx from 'clsx';
import { 
  Users, 
  Crown, 
  CheckCircle2, 
  Circle, 
  ArrowUpRight, 
  LogOut, 
  Copy, 
  Check, 
  Layers, 
  Sparkles, 
  Eye, 
  UserPlus 
} from 'lucide-react';

interface RoomLobbyProps {
  roomState: RoomState;
  myId: string;
  onSitDown: (color: PieceColor) => void;
  onStandUp: () => void;
  onSetReady: (isReady: boolean) => void;
  onUpdateRules: (rules: Partial<RuleConfig>) => void;
  onSetBlueprint: (code: string) => void;
  onOpenWorkshop: () => void;
  onLeaveRoom: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  roomState,
  myId,
  onSitDown,
  onStandUp,
  onSetReady,
  onUpdateRules,
  onSetBlueprint,
  onOpenWorkshop,
  onLeaveRoom,
}) => {
  const [blueprintInput, setBlueprintInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const isHost = roomState.hostId === myId;
  const blackPlayer = roomState.blackPlayer;
  const whitePlayer = roomState.whitePlayer;

  const mySeat: PieceColor | null = 
    blackPlayer?.id === myId ? 'black' : 
    whitePlayer?.id === myId ? 'white' : null;

  const amSeated = mySeat !== null;
  const isSpectator = !amSeated;
  const myPlayer = amSeated ? (mySeat === 'black' ? blackPlayer : whitePlayer) : roomState.spectators.find(s => s.id === myId);

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomState.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleApplyBlueprint = () => {
    if (!blueprintInput.trim()) return;
    sound.playPieceClick();
    onSetBlueprint(blueprintInput.trim().toUpperCase());
    setBlueprintInput('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col gap-6 select-none">
      
      {/* Header Bar */}
      <div className="liquid-glass-panel rounded-3xl p-5 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-wide">
              PVP 联机对战大厅
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
              房间模式
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            分享 6 位房间码邀请好友，座位满额后自动进入观战模式
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-inner">
            <span className="text-xs text-slate-400 font-mono">房间码:</span>
            <span className="text-2xl font-mono font-black text-cyan-300 tracking-wider">
              {roomState.roomCode}
            </span>
            <button
              onClick={handleCopyRoomCode}
              className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition"
              title="复制房间码"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={onLeaveRoom}
            className="p-2.5 rounded-2xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </div>

      {/* Two Seats: Black Player vs White Player */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Seat 1: Black Player */}
        <div className={clsx(
          'liquid-glass-panel rounded-3xl p-5 border transition-all flex flex-col justify-between',
          blackPlayer ? 'border-amber-400/30 bg-slate-900/60' : 'border-dashed border-white/20 bg-slate-950/40'
        )}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-400 border border-amber-300 shadow-[0_0_8px_#fbbf24]" />
                <span className="font-bold text-base text-amber-200">执黑先手席</span>
              </div>

              {blackPlayer?.isHost && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  <Crown className="w-3 h-3 text-amber-400" /> 房主
                </span>
              )}
            </div>

            {blackPlayer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white tracking-wide">
                    {blackPlayer.name} {blackPlayer.id === myId && '(您)'}
                  </span>
                  {blackPlayer.isReady ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> 已准备
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Circle className="w-4 h-4" /> 准备中
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  阵型蓝图: <span className="text-cyan-300 font-bold">{blackPlayer.blueprintCode || 'CLASS1 (经典阵)'}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <span>该席位目前空缺</span>
                {isSpectator && (
                  <button
                    onClick={() => onSitDown('black')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> 坐下执黑
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Seat Action if My Seat */}
          {mySeat === 'black' && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={onStandUp}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                站起进入观战
              </button>

              <button
                onClick={() => onSetReady(!blackPlayer?.isReady)}
                className={clsx(
                  'flex-1 py-2 rounded-xl font-bold text-xs shadow-md transition',
                  blackPlayer?.isReady ? 'bg-slate-700 text-slate-200' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                )}
              >
                {blackPlayer?.isReady ? '取消准备' : '确认准备'}
              </button>
            </div>
          )}
        </div>

        {/* Seat 2: White Player */}
        <div className={clsx(
          'liquid-glass-panel rounded-3xl p-5 border transition-all flex flex-col justify-between',
          whitePlayer ? 'border-sky-400/30 bg-slate-900/60' : 'border-dashed border-white/20 bg-slate-950/40'
        )}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-slate-100 border border-white shadow-[0_0_8px_#ffffff]" />
                <span className="font-bold text-base text-slate-100">执白后手席</span>
              </div>

              {whitePlayer?.isHost && (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  <Crown className="w-3 h-3 text-amber-400" /> 房主
                </span>
              )}
            </div>

            {whitePlayer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white tracking-wide">
                    {whitePlayer.name} {whitePlayer.id === myId && '(您)'}
                  </span>
                  {whitePlayer.isReady ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> 已准备
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Circle className="w-4 h-4" /> 准备中
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  阵型蓝图: <span className="text-cyan-300 font-bold">{whitePlayer.blueprintCode || 'CLASS1 (经典阵)'}</span>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <span>该席位目前空缺</span>
                {isSpectator && (
                  <button
                    onClick={() => onSitDown('white')}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> 坐下执白
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Seat Action if My Seat */}
          {mySeat === 'white' && (
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
              <button
                onClick={onStandUp}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                站起进入观战
              </button>

              <button
                onClick={() => onSetReady(!whitePlayer?.isReady)}
                className={clsx(
                  'flex-1 py-2 rounded-xl font-bold text-xs shadow-md transition',
                  whitePlayer?.isReady ? 'bg-slate-700 text-slate-200' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                )}
              >
                {whitePlayer?.isReady ? '取消准备' : '确认准备'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Blueprint Input Panel for Seated Players */}
      {amSeated && (
        <div className="liquid-glass-panel rounded-2xl p-4 border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>输入蓝图码切换开局阵型：</span>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="text"
              maxLength={6}
              value={blueprintInput}
              onChange={(e) => setBlueprintInput(e.target.value)}
              placeholder="6位蓝图码 (如 A8K9X2)"
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-xs uppercase focus:outline-none focus:border-cyan-400 w-44"
            />
            <button
              onClick={handleApplyBlueprint}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
            >
              载入
            </button>

            <button
              onClick={onOpenWorkshop}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              布阵工坊
            </button>
          </div>
        </div>
      )}

      {/* Rule Settings */}
      <RuleSettings
        rules={roomState.rules}
        isHost={isHost}
        onChangeRules={onUpdateRules}
      />

      {/* Spectators Drawer / List */}
      <div className="liquid-glass-panel rounded-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>观战席 ({roomState.spectators.length} 人在旁观)</span>
          </div>
          {isSpectator && (
            <span className="text-[11px] text-purple-300 font-mono">
              您当前在旁观席中
            </span>
          )}
        </div>

        {roomState.spectators.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {roomState.spectators.map((s) => (
              <span 
                key={s.id}
                className={clsx(
                  'px-3 py-1 rounded-xl text-xs font-mono border',
                  s.id === myId ? 'bg-purple-950/80 text-purple-200 border-purple-400/50 font-bold' : 'bg-slate-900/60 text-slate-400 border-white/5'
                )}
              >
                {s.name} {s.id === myId && '(您)'}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">暂无旁观者</p>
        )}
      </div>
    </div>
  );
};
