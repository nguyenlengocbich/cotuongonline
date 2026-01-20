
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, getRomanNumeral } from '../types';
import { AvatarBox, RankIcon } from '../components/Shared';
import { RANK_UI_DATA } from '../constants';
import { ChevronRight, Globe, Users, Cpu } from 'lucide-react';

const HomeScreen = ({ user }: { user: Player }) => {
  const navigate = useNavigate();
  const totalMatches = (user.wins || 0) + (user.losses || 0);
  const winRate = totalMatches > 0 ? ((user.wins / totalMatches) * 100).toFixed(1) : "0.0";
  const shortId = user.id.substring(0, 8).toUpperCase();

  return (
    <div className="p-4 w-full max-w-2xl mx-auto space-y-4 sm:space-y-6 animate-slide-up">
        {/* User Card - Optimized for Mobile */}
        <div onClick={() => navigate('/profile')} className="bg-slate-900/95 border border-slate-700 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex items-center gap-3 sm:gap-6 cursor-pointer hover:bg-slate-800 transition-all active:scale-[0.98] group">
            <AvatarBox avatar={user.avatar} className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-slate-600 flex-shrink-0 shadow-lg group-hover:border-red-500 transition-colors" />
            
            {/* min-w-0 is CRITICAL for truncate to work inside flex items on mobile */}
            <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex items-center justify-between mb-1 sm:mb-2 gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">{user.name}</h2>
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase italic ${RANK_UI_DATA[user.rankTier].color} flex-shrink-0 flex items-center gap-1 bg-slate-950/50 px-2 py-1 rounded-lg border border-slate-800`}>
                        <RankIcon tier={user.rankTier} subRank={user.subRank} size="sm" /> 
                        <span className="hidden xs:inline">{user.rankTier}</span> {getRomanNumeral(user.subRank)}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="text-[9px] sm:text-[10px] text-slate-500 font-mono bg-slate-950/80 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-slate-800 flex items-center gap-1.5 truncate">
                    <span className="opacity-50">ID:</span> {shortId}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800/50 pt-2 sm:pt-3">
                  <div className="flex flex-col items-center sm:items-start">
                      <span className="text-white font-black text-xs sm:text-sm">{totalMatches}</span>
                      <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-black tracking-widest">Trận</span>
                  </div>
                  <div className="w-px h-5 bg-slate-800"></div>
                  <div className="flex flex-col items-center sm:items-start">
                      <span className="text-blue-400 font-black text-xs sm:text-sm">{winRate}%</span>
                      <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-black tracking-widest">Thắng</span>
                  </div>
                  <div className="w-px h-5 bg-slate-800"></div>
                  <div className="flex flex-col items-center sm:items-start">
                      <span className="text-orange-400 font-black text-xs sm:text-sm">{user.points}</span>
                      <span className="text-[8px] sm:text-[9px] text-slate-500 uppercase font-black tracking-widest">Điểm</span>
                  </div>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700 group-hover:text-red-500 transition-colors flex-shrink-0" />
        </div>

        {/* Game Modes */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div onClick={() => navigate('/matchmaking')} className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700 hover:border-blue-500 cursor-pointer transition-all flex items-center gap-4 sm:gap-6 shadow-lg active:scale-95 group">
                <div className="p-3 sm:p-4 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-all"><Globe className="w-8 h-8 sm:w-10 sm:h-10" /></div>
                <div className="flex-1"><h3 className="text-lg sm:text-xl font-bold text-white">Đấu Online</h3><p className="text-xs sm:text-sm text-slate-500">Tìm đối thủ xứng tầm ngay lập tức</p></div>
            </div>
            <div onClick={() => navigate('/room')} className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700 hover:border-orange-500 cursor-pointer transition-all flex items-center gap-4 sm:gap-6 shadow-lg active:scale-95 group">
                <div className="p-3 sm:p-4 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20 transition-all"><Users className="w-8 h-8 sm:w-10 sm:h-10" /></div>
                <div className="flex-1"><h3 className="text-lg sm:text-xl font-bold text-white">Đấu Phòng</h3><p className="text-xs sm:text-sm text-slate-500">Tạo không gian riêng cùng bạn bè</p></div>
            </div>
            <div onClick={() => navigate('/practice')} className="bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-700 hover:border-purple-500 cursor-pointer transition-all flex items-center gap-4 sm:gap-6 shadow-lg active:scale-95 group">
                <div className="p-3 sm:p-4 rounded-xl bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20 transition-all"><Cpu className="w-8 h-8 sm:w-10 sm:h-10" /></div>
                <div className="flex-1"><h3 className="text-lg sm:text-xl font-bold text-white">Đấu với máy</h3><p className="text-xs sm:text-sm text-slate-500">Luyện tập cùng AI Gemini thông minh</p></div>
            </div>
        </div>
    </div>
  );
};

export default HomeScreen;
