
import React, { useState, useEffect, useRef } from 'react';
import { Color, Player, getRomanNumeral } from '../types';
import { AvatarBox, RankIcon } from './Shared';
import { Swords } from 'lucide-react';
import { RANK_UI_DATA } from '../constants';

const PlayerCard = ({ player, side, isMe }: { player: any, side: 'left' | 'right', isMe: boolean }) => {
  if (!player) return null;
  
  const rankTier = player.rankTier || 'Đồng';
  const subRank = player.subRank || 1;
  const ui = RANK_UI_DATA[rankTier] || RANK_UI_DATA['Đồng'];
  
  return (
    <div className={`flex flex-col items-center gap-2 animate-fade-in`}>
        <div className="relative">
            <AvatarBox 
                avatar={player.avatar} 
                className="w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28 border-2 sm:border-4 border-slate-800 shadow-2xl" 
            />
            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-0.5 border border-slate-800">
                <RankIcon tier={rankTier} subRank={subRank} size="sm" />
            </div>
        </div>
        <div className="text-center">
            <h3 className="text-[10px] xs:text-xs sm:text-base font-black text-white uppercase tracking-tight truncate max-w-[80px] sm:max-w-[120px]">{player.name}</h3>
            <div className="flex flex-col items-center mt-0.5">
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${ui.color}`}>
                    {rankTier} {getRomanNumeral(subRank)}
                </span>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase">{player.points || 0} PTS</span>
            </div>
            {isMe && (
                <div className="mt-1 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full inline-block">
                    <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Bạn</span>
                </div>
            )}
        </div>
    </div>
  );
};

const CoinToss = ({ resultColor, onFinish, user, opponent }: { resultColor: Color, onFinish: () => void, user?: Player, opponent?: any }) => {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showResultText, setShowResultText] = useState(false);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    if (hasFinishedRef.current) return;

    const animationDuration = 2000;
    
    const animTimer = setTimeout(() => {
      setIsAnimating(false);
      setShowResultText(true);
      
      const finishTimer = setTimeout(() => {
        if (!hasFinishedRef.current) {
          hasFinishedRef.current = true;
          onFinish();
        }
      }, 1500);
      
      return () => clearTimeout(finishTimer);
    }, animationDuration);

    return () => clearTimeout(animTimer);
  }, [onFinish]);

  const animationClass = resultColor === Color.RED ? 'animate-spin-to-red' : 'animate-spin-to-black';

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-fade-in overflow-hidden">
      {/* Background decor */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-4xl px-4 flex flex-col items-center gap-12">
        
        {/* Horizontal VS Layout */}
        <div className="flex flex-row items-center justify-center w-full gap-2 xs:gap-4 sm:gap-12 relative">
            
            {/* Player 1 - Left */}
            <div className="flex-1 flex justify-end">
                <PlayerCard player={user} side="left" isMe={true} />
            </div>

            {/* Center: Coin & VS Icon */}
            <div className="flex flex-col items-center gap-4 sm:gap-8 z-10 shrink-0">
                <div className="relative group">
                    <div className="absolute inset-0 bg-yellow-500/15 rounded-full blur-xl animate-pulse"></div>
                    <div className={`relative w-20 h-20 xs:w-24 xs:h-24 sm:w-40 sm:h-40 preserve-3d transition-transform duration-700 ${isAnimating ? animationClass : (resultColor === Color.RED ? 'rotate-y-0' : 'rotate-y-180')}`}>
                        {/* Mặt Đỏ (帥) */}
                        <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-gradient-to-br from-[#f7f1e3] to-[#eecfa1] rounded-full border-4 sm:border-8 border-yellow-600 shadow-[0_0_30px_rgba(183,28,28,0.4)] ring-2 sm:ring-4 ring-yellow-500/20">
                            <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 border-red-600 flex items-center justify-center text-red-600 font-black text-2xl xs:text-3xl sm:text-6xl bg-[#f7f1e3] shadow-inner">帥</div>
                        </div>
                        
                        {/* Mặt Đen (將) */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center bg-gradient-to-br from-[#f7f1e3] to-[#eecfa1] rounded-full border-4 sm:border-8 border-yellow-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] ring-2 sm:ring-4 ring-yellow-500/20">
                            <div className="w-12 h-12 xs:w-14 xs:h-14 sm:w-24 sm:h-24 rounded-full border-2 sm:border-4 border-slate-900 flex items-center justify-center text-slate-900 font-black text-2xl xs:text-3xl sm:text-6xl bg-[#f7f1e3] shadow-inner">將</div>
                        </div>
                    </div>
                </div>

                <div className={`transition-all duration-700 ${isAnimating ? 'opacity-30 scale-90' : 'opacity-100 scale-100'}`}>
                    <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 p-2 sm:p-3 rounded-full shadow-xl">
                        <Swords className={`w-4 h-4 sm:w-6 sm:h-6 ${isAnimating ? 'text-slate-500 animate-pulse' : 'text-yellow-500'}`} />
                    </div>
                </div>
            </div>

            {/* Player 2 - Right */}
            <div className="flex-1 flex justify-start">
                <PlayerCard player={opponent} side="right" isMe={false} />
            </div>

        </div>

        {/* Result Text */}
        <div className={`text-center transition-all duration-700 transform ${showResultText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-white/30 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-2 sm:mb-4">Phân Định Lượt Đi</h2>
            <p className={`text-3xl sm:text-6xl font-black uppercase tracking-tighter ${resultColor === Color.RED ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-slate-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]'}`}>
              Bên {resultColor === Color.RED ? 'Đỏ' : 'Đen'}
            </p>
            <div className="mt-4 sm:mt-6 flex flex-col items-center gap-1 sm:gap-2">
                <div className="w-8 sm:w-12 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
                <p className="text-white font-bold text-[9px] sm:text-xs uppercase tracking-[0.1em] opacity-70">
                  {resultColor === Color.RED ? 'Bạn khai cuộc!' : 'Đối thủ đi nước đầu!'}
                </p>
            </div>
        </div>

      </div>

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-0 { transform: rotateY(0deg); }
        .rotate-y-180 { transform: rotateY(180deg); }

        @keyframes spin-to-red {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(2160deg); }
        }

        @keyframes spin-to-black {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(2340deg); }
        }

        .animate-spin-to-red { animation: spin-to-red 2s cubic-bezier(0.15, 0, 0.1, 1) forwards; }
        .animate-spin-to-black { animation: spin-to-black 2s cubic-bezier(0.15, 0, 0.1, 1) forwards; }
        
        @media (min-width: 380px) {
          .xs\:w-20 { width: 5rem; }
          .xs\:h-20 { height: 5rem; }
          .xs\:w-24 { width: 6rem; }
          .xs\:h-24 { height: 6rem; }
          .xs\:text-xs { font-size: 0.75rem; }
          .xs\:text-3xl { font-size: 1.875rem; }
        }
      `}</style>
    </div>
  );
};

export default CoinToss;
