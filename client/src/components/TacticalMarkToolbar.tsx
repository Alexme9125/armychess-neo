import React, { useState } from 'react';
import clsx from 'clsx';
import { Eraser, Trash2, Tag } from 'lucide-react';
import { sound } from '../hooks/useAudio';

export type TacticalMarkType = '!' | '?' | '×' | '+' | '-';

export interface TacticalMarkToolbarProps {
  activeTool: TacticalMarkType | 'eraser' | null;
  onSelectTool: (tool: TacticalMarkType | 'eraser' | null) => void;
  onClearAll: () => void;
  marksCount: number;
  theme: 'dark' | 'light';
}

interface MarkItem {
  id: TacticalMarkType;
  symbol: string;
  name: string;
  hint: string;
  colorClass: string;
  activeClass: string;
}

const MARK_TOOLS: MarkItem[] = [
  {
    id: '!',
    symbol: '!',
    name: '感叹号',
    hint: '大将/重点警戒',
    colorClass: 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-rose-500/40',
    activeClass: 'bg-rose-600 text-white border-rose-300 ring-2 ring-rose-400 shadow-rose-900/50 shadow-lg scale-105',
  },
  {
    id: '?',
    symbol: '?',
    name: '问号',
    hint: '存疑/未探明',
    colorClass: 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 border-sky-500/40',
    activeClass: 'bg-sky-600 text-white border-sky-300 ring-2 ring-sky-400 shadow-sky-900/50 shadow-lg scale-105',
  },
  {
    id: '×',
    symbol: '×',
    name: '叉号',
    hint: '排除/查无大威胁',
    colorClass: 'text-slate-700 dark:text-slate-300 hover:bg-slate-500/20 border-slate-500/40',
    activeClass: 'bg-slate-700 text-rose-300 border-slate-400 ring-2 ring-slate-400 shadow-black/60 shadow-lg scale-105',
  },
  {
    id: '+',
    symbol: '+',
    name: '加号',
    hint: '怀疑地雷/炸弹',
    colorClass: 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/40',
    activeClass: 'bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400 shadow-amber-900/50 shadow-lg scale-105',
  },
  {
    id: '-',
    symbol: '-',
    name: '减号',
    hint: '工兵/低阶小卒',
    colorClass: 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/40',
    activeClass: 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400 shadow-emerald-900/50 shadow-lg scale-105',
  },
];

export const TacticalMarkToolbar: React.FC<TacticalMarkToolbarProps> = ({
  activeTool,
  onSelectTool,
  onClearAll,
  marksCount,
  theme,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToolClick = (tool: TacticalMarkType | 'eraser') => {
    sound.playPieceClick();
    if (activeTool === tool) {
      onSelectTool(null); // Deselect
    } else {
      onSelectTool(tool);
    }
  };

  const isLight = theme === 'light';

  return (
    <div
      className={clsx(
        "fixed right-3 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 select-none",
        "drop-shadow-2xl"
      )}
    >
      <div
        className={clsx(
          "flex flex-col items-center py-2.5 px-1.5 sm:px-2 rounded-2xl sm:rounded-3xl border shadow-2xl backdrop-blur-xl transition-all duration-300",
          isLight
            ? "bg-white/95 border-slate-300 shadow-slate-500/25 text-slate-800"
            : "liquid-glass-panel border-white/20 shadow-black/80 text-slate-100"
        )}
      >
        {/* Header / Collapse Toggle */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={clsx(
            "p-1.5 mb-1.5 rounded-xl transition flex items-center justify-center cursor-pointer",
            isLight ? "hover:bg-slate-100 text-slate-600" : "hover:bg-white/10 text-slate-400 hover:text-white"
          )}
          title={isCollapsed ? "展开标记面板" : "收起标记面板"}
        >
          <Tag className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
        </button>

        {!isCollapsed && (
          <>
            {/* Title Badge */}
            <div className="flex flex-col items-center mb-2">
              <span
                className={clsx(
                  "text-[9px] font-bold tracking-widest leading-none [writing-mode:vertical-rl]",
                  isLight ? "text-slate-500" : "text-cyan-300/80"
                )}
              >
                标记
              </span>
            </div>

            {/* Tactical Mark Symbols: !, ?, ×, +, - */}
            <div className="flex flex-col gap-1.5">
              {MARK_TOOLS.map((tool) => {
                const isActive = activeTool === tool.id;

                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleToolClick(tool.id)}
                    title={`${tool.name}（${tool.hint}）`}
                    className={clsx(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-base sm:text-lg border transition-all cursor-pointer transform active:scale-95",
                      isActive
                        ? tool.activeClass
                        : clsx(
                            tool.colorClass,
                            isLight
                              ? "bg-slate-100/90 border-slate-300 hover:bg-slate-200/90"
                              : "bg-slate-800/70 border-white/10"
                          )
                    )}
                  >
                    {tool.symbol}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div
              className={clsx(
                "w-5 h-[1px] my-2",
                isLight ? "bg-slate-200" : "bg-white/10"
              )}
            />

            {/* Actions: Eraser & Clear All */}
            <div className="flex flex-col gap-1.5">
              {/* Eraser */}
              <button
                type="button"
                onClick={() => handleToolClick('eraser')}
                title="橡皮擦：点击敌方棋子清除标记"
                className={clsx(
                  "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer transform active:scale-95",
                  activeTool === 'eraser'
                    ? "bg-purple-600 text-white border-purple-300 ring-2 ring-purple-400 shadow-lg scale-105"
                    : isLight
                    ? "bg-slate-100/80 hover:bg-purple-50 text-slate-600 hover:text-purple-600 border-slate-300"
                    : "bg-slate-800/60 hover:bg-purple-950/40 text-slate-400 hover:text-purple-300 border-white/10"
                )}
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>

              {/* Clear All Marks */}
              {marksCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playPieceClick();
                    onClearAll();
                  }}
                  title={`清空全盘标记 (已标记 ${marksCount} 枚)`}
                  className={clsx(
                    "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer transform active:scale-95",
                    isLight
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                      : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Hint counter */}
            {marksCount > 0 && (
              <span className="mt-1.5 text-[9px] font-mono font-bold text-cyan-400 px-1 py-0.2 rounded-full bg-cyan-500/10">
                {marksCount}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
};
