import React from 'react';
import { PlayingCard, CardUpgrade } from '../types';
import { getSuitColor, getSuitSymbol } from '../utils/gameLogic';
import { Star, Zap, Coins, Shield } from 'lucide-react';

interface CardProps {
  card: PlayingCard;
  hidden?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ card, hidden, className = '' }) => {
  // Safety check to prevent crashing if undefined card is passed
  if (!card) return null;

  if (hidden) {
    return (
      <div className={`relative w-24 h-36 bg-black border-2 border-dashed border-slate-700 rounded flex items-center justify-center transform hover:-translate-y-1 transition-all duration-300 ${className}`}>
        <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
           <div className="text-4xl text-slate-700 font-mono animate-pulse">?</div>
           <div className="text-xs text-slate-800 mt-2 font-mono">UNKNOWN</div>
        </div>
        {/* Scan line effect on card */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/10 to-transparent opacity-20 pointer-events-none" />
      </div>
    );
  }

  const hasUpgrades = card.upgrades ? card.upgrades.length > 0 : false;
  const suitColor = getSuitColor(card.suit);
  const borderColor = hasUpgrades ? 'border-amber-500' : (card.suit === 'hearts' || card.suit === 'diamonds' ? 'border-orange-900' : 'border-teal-900');
  const glowClass = hasUpgrades ? 'shadow-[0_0_15px_rgba(245,158,11,0.3)]' : '';

  // Group upgrades by ID for tooltip summary
  const upgradesSummary = card.upgrades ? Object.values(card.upgrades.reduce((acc, item) => {
      if (!acc[item.id]) acc[item.id] = { ...item, count: 0 };
      acc[item.id].count++;
      return acc;
  }, {} as Record<string, CardUpgrade & { count: number }>)) as (CardUpgrade & { count: number })[] : [];

  return (
    <div className={`group relative w-24 h-36 bg-[#0a0a0a] border-2 ${borderColor} rounded transition-all duration-300 transform hover:-translate-y-2 select-none ${className} ${glowClass}`}>
      
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
      </div>

      {/* Top Header */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-black/50 border-b border-white/5 flex items-center justify-between px-2 z-10">
        <span className={`font-bold text-xl font-mono leading-none ${suitColor} text-glow-sm`}>{card.rank}</span>
      </div>

      {/* Center Art */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <span className={`text-6xl ${suitColor} opacity-20 text-glow`}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>

      {/* Bottom Footer */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-black/50 border-t border-white/5 flex items-center justify-between px-2 transform rotate-180 z-10">
        <span className={`font-bold text-xl font-mono leading-none ${suitColor} text-glow-sm`}>{card.rank}</span>
      </div>

      {/* Upgrade List - Rendered directly on card (Simplified) */}
      <div className="absolute top-8 bottom-8 left-0.5 right-0.5 flex flex-col justify-end gap-0.5 pointer-events-none z-20 overflow-hidden">
        {card.upgrades && card.upgrades.map((u, i) => {
             let icon = null;
             let colorClass = "";
             // Extract text color class for text styling
             let textClass = "";
             
             if (u.effectType === 'bonus_credits') { 
                 icon = <Coins size={8} />; 
                 colorClass = "border-yellow-600/50 bg-yellow-900/20"; 
                 textClass = "text-yellow-500";
             }
             else if (u.effectType === 'bonus_essence') { 
                 icon = <Zap size={8} />; 
                 colorClass = "border-purple-600/50 bg-purple-900/20"; 
                 textClass = "text-purple-500";
             }
             else if (u.effectType === 'critical') { 
                 icon = <Star size={8} />; 
                 colorClass = "border-red-600/50 bg-red-900/20"; 
                 textClass = "text-red-500";
             }
             else if (u.effectType === 'shield') { 
                 icon = <Shield size={8} />; 
                 colorClass = "border-blue-600/50 bg-blue-900/20"; 
                 textClass = "text-blue-500";
             }

             return (
               <div key={i} className={`flex flex-col p-0.5 border rounded-sm backdrop-blur-md ${colorClass}`}>
                  <div className={`flex items-center gap-1 border-b border-white/10 pb-0.5 mb-0.5 ${textClass}`}>
                      {icon}
                      <span className="text-[6px] font-bold uppercase leading-none truncate">{u.name}</span>
                  </div>
               </div>
             );
        })}
      </div>

      {/* DETAILED TOOLTIP ON HOVER - IMPROVED VISIBILITY */}
      {upgradesSummary.length > 0 && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-slate-950 border-2 border-amber-500/50 p-3 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-[0_0_30px_rgba(0,0,0,0.9)] backdrop-blur-xl rounded-sm">
             <div className="text-sm font-bold text-amber-500 border-b border-amber-900/50 mb-2 pb-1 tracking-widest">MODIFICATIONS</div>
             {upgradesSummary.map(u => (
                 <div key={u.id} className="mb-3 last:mb-0">
                     <div className="flex justify-between items-center text-xs text-slate-200 mb-1">
                         <span className="font-bold">{u.name} {u.count > 1 ? `x${u.count}` : ''}</span>
                         {u.effectType === 'bonus_credits' && <span className="text-yellow-400 font-mono font-bold">+{u.value * u.count} CR</span>}
                         {u.effectType === 'bonus_essence' && <span className="text-purple-400 font-mono font-bold">+{u.value * u.count} ESS</span>}
                         {u.effectType === 'critical' && <span className="text-red-400 font-mono font-bold">+{Math.round(u.value * u.count * 100)}% PAY</span>}
                         {u.effectType === 'shield' && <span className="text-blue-400 font-mono font-bold">{Math.round(u.value * 100)}% SAVE</span>}
                     </div>
                     <div className="text-[11px] text-slate-400 leading-tight">{u.description}</div>
                 </div>
             ))}
          </div>
      )}
      
      {/* Corner decoration */}
      <div className="absolute top-1 right-1 w-1 h-1 bg-white/20 z-10"></div>
      <div className="absolute bottom-1 left-1 w-1 h-1 bg-white/20 z-10"></div>
    </div>
  );
};