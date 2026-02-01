
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
    <div className="flex flex-col min-h-full justify-center p-4 w-full max-w-2xl mx-auto animate-slide-up space-y-6 sm:space-y-8">
        {/* User Card - Optimized for Mobile */}
        <div 
            onClick={() => navigate('/profile')} 
            className="bg-slate-900/95 border border-slate-700 p-5 sm:p-7 rounded-[2rem] shadow-2xl flex items-center gap-4 sm:gap-6 cursor-pointer hover:bg-slate-800 transition-all active:scale-[0.98] group"
        >
            <AvatarBox avatar={user.avatar} className="w-16 h-16 sm:w-24 sm:h-24 border-2 border-slate-600 flex-shrink-0 shadow-lg group-hover:border-red-500 transition-colors" />
            
            <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex items-center justify-between mb-2 gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{user.name}</h2>
                    <span className={`text-[10px] sm:text-xs font-black uppercase italic ${RANK_UI_DATA[user.rankTier].color} flex-shrink-0 flex items-center gap-1.5 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800`}>
                        <RankIcon tier={user.rankTier} subRank={user.subRank} size="sm" /> 
                        <span className="hidden xs:inline">{user.rankTier}</span> {getRomanNumeral(user.subRank)}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-mono bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5 truncate">
                    <span className="opacity-50">ID:</span> {shortId}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-800/50 pt-4">
                  <div className="flex flex-col items-center sm:items-start">
                      <span className="text-white font-black text-sm sm:text-base">{totalMatches}</span>
                      <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase font-black tracking-widest">Trận</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800"></div>
                  <div className="flex flex-col items-center sm:items-start">
                      <span className="text-blue-400 font-black text-sm sm:text-base">{winRate}%</span>
                      <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase font-black tracking-widest">Thắng</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800"></div>
                  <div className="flex flex-col items-center sm:items-start">
                      <span className="text-orange-400 font-black text-sm sm:text-base">{user.points}</span>
                      <span className="text-[8px] sm:text-[10px] text-slate-500 uppercase font-black tracking-widest">Điểm</span>
                  </div>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 sm:w-7 h-7 text-slate-700 group-hover:text-red-500 transition-colors flex-shrink-0" />
        </div>

        {/* Game Modes Container */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5">
            <div 
                onClick={() => navigate('/matchmaking')} 
                className="bg-slate-800/50 p-5 sm:p-8 rounded-[1.5rem] border border-slate-700 hover:border-blue-500 cursor-pointer transition-all flex items-center gap-5 sm:gap-8 shadow-lg active:scale-95 group"
            >
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-all shadow-inner">
                    <Globe className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Đấu Online</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Tìm đối thủ xứng tầm ngay lập tức</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-700 opacity-0 group-hover:opacity-100 transition-all" />
            </div>

            <div 
                onClick={() => navigate('/room')} 
                className="bg-slate-800/50 p-5 sm:p-8 rounded-[1.5rem] border border-slate-700 hover:border-orange-500 cursor-pointer transition-all flex items-center gap-5 sm:gap-8 shadow-lg active:scale-95 group"
            >
                <div className="p-4 sm:p-5 rounded-2xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20 transition-all shadow-inner">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Phòng Đấu</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Tạo không gian riêng cùng bạn bè</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-700 opacity-0 group-hover:opacity-100 transition-all" />
            </div>

            <div 
                onClick={() => navigate('/practice')} 
                className="bg-slate-800/50 p-5 sm:p-8 rounded-[1.5rem] border border-slate-700 hover:border-purple-500 cursor-pointer transition-all flex items-center gap-5 sm:gap-8 shadow-lg active:scale-95 group"
            >
                <div className="p-4 sm:p-5 rounded-2xl bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20 transition-all shadow-inner">
                    <Cpu className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Đấu với máy</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Luyện tập với bot</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-700 opacity-0 group-hover:opacity-100 transition-all" />
            </div>
        </div>

        {/* Decorative element to maintain visual balance at bottom if needed */}
        <div className="h-4"></div>
    </div>
  );
};

export default HomeScreen;
