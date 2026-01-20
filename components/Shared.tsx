
import React from 'react';
import { RankTier, getRomanNumeral } from '../types';
import { DEFAULT_GAME_ICON, RANK_UI_DATA } from '../constants';
import { Shield, ChevronUp, Trophy, Star, Gem, Swords, Crown } from 'lucide-react';

export const LoadingIndicator = ({ message = "Đang tải dữ liệu..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in text-slate-500">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-slate-800 rounded-full"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">{message}</span>
  </div>
);

export const SplashLoading = ({ message = "Đang kết nối kỳ đài..." }: { message?: string }) => (
  <div className="fixed inset-0 z-[1000] bg-[#1a1a1a] flex flex-col items-center justify-center p-6 animate-fade-in">
    <div className="relative mb-12">
      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-yellow-600 shadow-[0_0_50px_rgba(183,28,28,0.4)] animate-float">
        <img src={DEFAULT_GAME_ICON} alt="Logo" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-yellow-500 animate-ping opacity-20"></div>
    </div>
    
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">Cờ Tướng Online</h1>
      <div className="flex flex-col items-center gap-2">
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-600 animate-progress-loading"></div>
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{message}</p>
      </div>
    </div>

    <style>{`
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      .animate-float { animation: float 3s ease-in-out infinite; }
      @keyframes progress-loading {
        0% { width: 0%; transform: translateX(-100%); }
        50% { width: 70%; transform: translateX(0); }
        100% { width: 100%; transform: translateX(100%); }
      }
      .animate-progress-loading { 
        animation: progress-loading 2s infinite ease-in-out;
        box-shadow: 0 0 10px rgba(220,38,38,0.5);
      }
    `}</style>
  </div>
);

export const AvatarBox = ({ avatar, className = "w-10 h-10", isOnline = false }: { avatar: string, className?: string, isOnline?: boolean }) => {
  const isEmoji = avatar && avatar.length <= 4;

  return (
    <div className="relative inline-block">
      <div className={`bg-slate-800 rounded-full flex items-center justify-center overflow-hidden shadow-inner border border-slate-700 ${className}`}>
        {isEmoji ? (
          <span className={className.includes('w-10') ? 'text-xl' : className.includes('w-14') ? 'text-2xl' : className.includes('w-16') ? 'text-3xl' : className.includes('w-20') ? 'text-4xl' : className.includes('w-32') ? 'text-6xl' : 'text-base'}>
            {avatar}
          </span>
        ) : (
          <img 
            src={avatar || DEFAULT_GAME_ICON} 
            alt="Avatar" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_GAME_ICON;
            }}
          />
        )}
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a1a1a] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
      )}
    </div>
  );
};

export const RankIcon = ({ tier, subRank, size = "md" }: { tier: RankTier, subRank: number, size?: "sm" | "md" | "lg" }) => {
  const containerSize = size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : "w-32 h-32";
  const ui = RANK_UI_DATA[tier];
  const numeral = getRomanNumeral(subRank);
  return (
    <div className={`relative flex items-center justify-center ${ui.color} ${containerSize}`}>
      <Shield className="w-full h-full" strokeWidth={size === "lg" ? 2 : 1.5} />
      <div className={`absolute flex items-center justify-center ${size === "sm" ? "-translate-y-1.5" : size === "md" ? "-translate-y-2.5" : "-translate-y-6"}`}>
         {tier === RankTier.BRONZE && <div className={`${size === "sm" ? "w-1 h-1" : size === "md" ? "w-1.5 h-1.5" : "w-4 h-4"} bg-current rounded-full`} />}
         {tier === RankTier.SILVER && <ChevronUp className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.GOLD && <Trophy className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.PLATINUM && <Star className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.DIAMOND && <Gem className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.MASTER && <Swords className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.GRANDMASTER && <Crown className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${size === "sm" ? "pt-1" : size === "md" ? "pt-1.5" : "pt-4"}`}>
        <span className={`font-black leading-none ${size === "sm" ? "text-[11px]" : size === "md" ? "text-[16px]" : "text-[42px]"} tracking-tight drop-shadow-md select-none`}>
          {numeral}
        </span>
      </div>
    </div>
  );
};
