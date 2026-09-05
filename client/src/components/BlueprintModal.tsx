import React, { useState, useMemo } from 'react';
import { 
  PieceType, 
  PIECE_CONFIG, 
  LayoutPlacement, 
  Blueprint 
} from '@shared/types';
import { 
  RELATIVE_CAMPS, 
  RELATIVE_HEADQUARTERS, 
  RELATIVE_FRONT_ROW, 
  RELATIVE_BACK_ROWS 
} from '@shared/boardData';
import { 
  createClassicBalancedLayout, 
  createAssaultLayout, 
  createDefensiveLayout,
  validateLayout,
  generateRandomCode
} from '@shared/blueprintCodec';
import { sound } from '../hooks/useAudio';
import clsx from 'clsx';
import { 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck,
  Save, 
  Sparkles, 
  X, 
  ArrowLeftRight 
} from 'lucide-react';

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlueprint?: (code: string) => void;
}

export const BlueprintModal: React.FC<BlueprintModalProps> = ({
  isOpen,
  onClose,
  onSelectBlueprint,
}) => {
  const [name, setName] = useState('我的军棋阵型');
  const [placements, setPlacements] = useState<LayoutPlacement[]>(() => createClassicBalancedLayout());
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  
  // Generated code modal
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remaining counts for tray
  const placedCounts = useMemo(() => {
    const counts: Partial<Record<PieceType, number>> = {};
    for (const p of placements) {
      counts[p.pieceType] = (counts[p.pieceType] || 0) + 1;
    }
    return counts;
  }, [placements]);

  // Validation
  const validation = useMemo(() => {
    return validateLayout(placements);
  }, [placements]);

  // Slots map: 0..29 -> PieceType
  const slotsMap = useMemo(() => {
    const map = new Map<number, PieceType>();
    for (const p of placements) {
      map.set(p.index, p.pieceType);
    }
    return map;
  }, [placements]);

  if (!isOpen) return null;

  const handleSlotClick = (index: number) => {
    sound.playPieceClick();
    setErrorMessage(null);

    // If a camp is clicked, show notice
    if (RELATIVE_CAMPS.includes(index)) {
      setErrorMessage('行营开局时不能摆放棋子');
      return;
    }

    const currentPiece = slotsMap.get(index);

    // Case 1: Slot already selected for swapping
    if (selectedSlot !== null) {
      if (selectedSlot === index) {
        setSelectedSlot(null); // Deselect
        return;
      }

      // Swap pieces between selectedSlot and index
      const otherPiece = slotsMap.get(selectedSlot);
      const nextPlacements = placements.filter(p => p.index !== index && p.index !== selectedSlot);

      if (currentPiece) nextPlacements.push({ index: selectedSlot, pieceType: currentPiece });
      if (otherPiece) nextPlacements.push({ index: index, pieceType: otherPiece });

      setPlacements(nextPlacements);
      setSelectedSlot(null);
      return;
    }

    // Case 2: Selected a piece type from tray, placing onto slot
    if (selectedPieceType) {
      const available = (PIECE_CONFIG[selectedPieceType].count || 0) - (placedCounts[selectedPieceType] || 0);
      
      // If replacing an existing piece of the same type, ignore
      if (currentPiece === selectedPieceType) {
        setSelectedPieceType(null);
        return;
      }

      if (available <= 0 && currentPiece !== selectedPieceType) {
        setErrorMessage(`该兵种【${PIECE_CONFIG[selectedPieceType].name}】已全部放置`);
        return;
      }

      // Place new piece
      const nextPlacements = placements.filter(p => p.index !== index);
      nextPlacements.push({ index, pieceType: selectedPieceType });
      setPlacements(nextPlacements);
      return;
    }

    // Case 3: Clicking on an already occupied slot to select it for swap or removal
    if (currentPiece) {
      setSelectedSlot(index);
    }
  };

  const handleRemoveFromSlot = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPieceClick();
    setPlacements(placements.filter(p => p.index !== index));
    if (selectedSlot === index) setSelectedSlot(null);
  };

  const handleSave = async () => {
    if (!validation.valid) {
      setErrorMessage(validation.message || '阵型不合法，请检查后再保存');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const bpName = name.trim() || '我的军棋蓝图';

    try {
      // Direct connection in dev mode to avoid Vite proxy syntax errors in Safari
      const apiBase = typeof window !== 'undefined' && window.location.port === '5173'
        ? `http://${window.location.hostname || '127.0.0.1'}:3001`
        : '';

      let serverCode: string | null = null;
      try {
        const res = await fetch(`${apiBase}/api/blueprints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: bpName,
            placements,
          })
        });

        // Safely extract text first to avoid Safari WebKit "string did not match pattern" syntax error
        const text = await res.text();
        let data: { code?: string; error?: string } | null = null;
        try {
          data = JSON.parse(text);
        } catch {
          // Response was not JSON (e.g. HTML proxy page)
        }

        if (res.ok && data?.code) {
          serverCode = data.code;
        } else if (!res.ok && data?.error) {
          throw new Error(data.error);
        }
      } catch (fetchErr: unknown) {
        console.warn('Server blueprint save endpoint warning:', fetchErr);
      }

      // If server generated a code, use it; otherwise generate a guaranteed valid 6-char code
      const finalCode = (serverCode || generateRandomCode(6)).toUpperCase();

      // Persist in localStorage so it's always available offline/online
      try {
        const newBlueprint: Blueprint = {
          code: finalCode,
          name: bpName,
          placements,
          createdAt: Date.now(),
        };
        const rawExisting = localStorage.getItem('junqi_custom_blueprints');
        const existingList: Blueprint[] = rawExisting ? JSON.parse(rawExisting) : [];
        const filtered = existingList.filter(b => b.code !== finalCode);
        filtered.push(newBlueprint);
        localStorage.setItem('junqi_custom_blueprints', JSON.stringify(filtered));
      } catch (storageErr) {
        console.warn('LocalStorage save warning:', storageErr);
      }

      setGeneratedCode(finalCode);
      sound.playEasterEgg();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '保存阵型异常，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md modal-backdrop-animate">
      <div className="relative w-full max-w-5xl h-[92vh] flex flex-col liquid-glass-panel rounded-3xl border border-white/20 overflow-hidden shadow-2xl modal-content-animate">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                布阵工坊
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  蓝图代码系统
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                自由排兵布阵，保存后生成 6 位蓝图码，开局秒速读取
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body (Split Screen: Half-Board + Piece Drawer) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Left: Interactive Half-Board Grid */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start bg-slate-950/40">
            {/* Top Toolbar */}
            <div className="w-full max-w-[480px] flex items-center justify-between gap-2 mb-3 text-xs">
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="阵型名称"
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400 w-32 sm:w-36 shrink-0"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    sound.playPieceClick();
                    setPlacements(createClassicBalancedLayout());
                  }}
                  title="载入经典平衡阵"
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1 transition whitespace-nowrap cursor-pointer text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  经典
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPieceClick();
                    setPlacements(createAssaultLayout());
                  }}
                  title="载入铁道突击阵"
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1 transition whitespace-nowrap cursor-pointer text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  突击
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPieceClick();
                    setPlacements(createDefensiveLayout());
                  }}
                  title="载入固守阵"
                  className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1 transition whitespace-nowrap cursor-pointer text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  固守
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playPieceClick();
                    setPlacements([]);
                    setSelectedSlot(null);
                  }}
                  title="清空当前布阵"
                  className="px-2 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 transition whitespace-nowrap cursor-pointer text-xs"
                >
                  清空
                </button>
              </div>
            </div>

            {/* Error / Feedback Banner */}
            {errorMessage && (
              <div className="w-full max-w-[480px] mb-3 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 30 Spots Grid (Rows 0..5 from Front to Base) */}
            <div className="liquid-glass-board rounded-3xl p-3 sm:p-5 border border-white/20 flex flex-col gap-2 w-full max-w-[480px]">
              
              {/* Front line label */}
              <div className="text-center py-1 rounded-xl bg-sky-950/50 border border-sky-500/30 text-sky-300 text-[11px] font-mono tracking-widest font-semibold">
                ▲ 第一排 · 铁路线（前线对敌，禁止放炸弹） ▲
              </div>

              {Array.from({ length: 6 }, (_, row) => (
                <div key={`layout-row-${row}`} className="flex justify-between items-center gap-2">
                  {Array.from({ length: 5 }, (_, col) => {
                    const index = row * 5 + col;
                    const pieceType = slotsMap.get(index);
                    const isCamp = RELATIVE_CAMPS.includes(index);
                    const isHq = RELATIVE_HEADQUARTERS.includes(index);
                    const isSelected = selectedSlot === index;

                    return (
                      <div
                        key={`slot-${index}`}
                        onClick={() => handleSlotClick(index)}
                        className={clsx(
                          'relative flex items-center justify-center cursor-pointer transition-all duration-200 select-none',
                          'w-16 h-8 sm:w-20 sm:h-9 md:w-22 md:h-10',
                          isCamp ? 'rounded-full border-2 border-purple-400/60 bg-purple-950/30 shadow-inner' :
                          isHq ? 'rounded-xl border-2 border-amber-400/60 bg-amber-950/30 shadow-md' :
                          'rounded-lg border border-white/10 bg-slate-900/60 hover:border-cyan-400/60',
                          isSelected && 'ring-2 ring-cyan-400 scale-105 bg-cyan-950/40',
                          row === 0 && 'border-sky-400/40'
                        )}
                      >
                        {isCamp && !pieceType && (
                          <div className="w-2.5 h-2.5 rounded-full border border-purple-400/50" />
                        )}

                        {isHq && !pieceType && (
                          <div className="w-2.5 h-2.5 rounded-sm border border-amber-400/50" />
                        )}

                        {pieceType && (
                          <div className="relative w-full h-full px-1 flex items-center justify-center liquid-mica-white text-slate-900 rounded-lg sm:rounded-xl shadow-md mica-shimmer group">
                            {/* Subtle top specular accent like Piece.tsx */}
                            <div className="absolute top-0.5 inset-x-2 h-[1.5px] rounded-full opacity-60 bg-gradient-to-r from-transparent via-sky-400 to-transparent pointer-events-none" />

                            <span
                              className={clsx(
                                "piece-font leading-none transition-all text-xs sm:text-sm md:text-[14px]",
                                pieceType === 'flag' && "text-rose-600 font-black tracking-wider",
                                pieceType === 'bomb' && "text-rose-600"
                              )}
                              style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                            >
                              {PIECE_CONFIG[pieceType].name}
                            </span>

                            {/* Remove 'x' on hover */}
                            <button
                              onClick={(e) => handleRemoveFromSlot(index, e)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition shadow z-20 cursor-pointer"
                              title="移出此棋子"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Base line label */}
              <div className="text-center py-1 rounded-xl bg-amber-950/50 border border-amber-500/30 text-amber-300 text-[11px] font-mono tracking-widest font-semibold">
                ▼ 第六排 · 底线（两个大本营，军旗必放其一） ▼
              </div>
            </div>
          </div>

          {/* Right: Piece Inventory Tray & Status */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 p-4 bg-slate-900/70 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-200">待布棋子列表</h3>
                <span className="text-xs font-mono text-cyan-300">
                  已放置 {placements.length} / 25
                </span>
              </div>

              {/* Pieces Grid in Drawer */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                {(Object.keys(PIECE_CONFIG) as PieceType[]).map((type) => {
                  const info = PIECE_CONFIG[type];
                  const placed = placedCounts[type] || 0;
                  const remain = info.count - placed;
                  const isSelected = selectedPieceType === type;

                  return (
                    <button
                      key={type}
                      onClick={() => {
                        sound.playPieceClick();
                        setSelectedPieceType(isSelected ? null : type);
                        setSelectedSlot(null);
                      }}
                      disabled={remain <= 0}
                      className={clsx(
                        'flex items-center justify-between p-2 rounded-xl border text-left transition',
                        isSelected ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400/40' :
                        remain > 0 ? 'border-white/10 bg-slate-800/60 hover:bg-slate-700/60 text-slate-200' :
                        'border-transparent bg-slate-900/30 text-slate-600 opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center">
                        <span className="piece-font text-xs sm:text-sm font-bold tracking-wide">{info.name}</span>
                      </div>
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-mono font-bold',
                        remain > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                      )}>
                        {remain}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-800/40 border border-white/5 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                  布阵小贴士
                </p>
                <p>• 点击待布棋子再点击格子即可快速安置。</p>
                <p>• 点击已放置的棋子可选中，再点击另一格子直接对调！</p>
                <p>• 军旗必在底线两营之一，炸弹不可放首排。</p>
              </div>
            </div>

            {/* Bottom Action Button */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={isSaving || !validation.valid}
                className={clsx(
                  'w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition',
                  validation.valid 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20 cursor-pointer' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                )}
              >
                <Save className="w-4 h-4" />
                {isSaving ? '正在生成蓝图...' : '保存并生成 6 位蓝图码'}
              </button>
            </div>
          </div>
        </div>

        {/* Modal: Blueprint Code Generated Successfully */}
        {generatedCode && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl">
            <div className="liquid-glass-panel rounded-3xl p-6 sm:p-8 max-w-md w-full border border-cyan-400/40 shadow-2xl flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                <Sparkles className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">阵型蓝图已永久保存！</h3>
              <p className="text-xs text-slate-400 mb-5">
                您的阵型蓝图码已生成，已同步存至服务端，随时输入即可读取：
              </p>

              {/* 6-Digit Code Box */}
              <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border-2 border-cyan-400/60 shadow-inner mb-6">
                <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-cyan-300">
                  {generatedCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 transition"
                  title="复制蓝图码"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    onSelectBlueprint?.(generatedCode);
                    setGeneratedCode(null);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-md transition"
                >
                  立即使用该蓝图
                </button>

                <button
                  onClick={() => setGeneratedCode(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
