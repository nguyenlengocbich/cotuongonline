
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Player } from '../types';
import { AvatarBox, RankIcon, Badge } from './Shared';
import { DEFAULT_GAME_ICON, RANK_UI_DATA } from '../constants';
import { Home, Trophy, Users, History, BookOpen } from 'lucide-react';

export const Navbar = ({ user, onLogout }: { user: Player | null, onLogout: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  return (
    <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-2xl mx-auto">
        <div className="flex items-center gap-2 select-none">
          <img src={DEFAULT_GAME_ICON} alt="Logo" className="w-8 h-8 rounded-full shadow-lg border border-yellow-600 object-cover" />
          <h1 className="text-xl font-bold tracking-wider">Cờ Tướng Online</h1>
        </div>
        {user && isHome && (
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end hidden sm:flex cursor-pointer" onClick={() => navigate('/profile')}>
                <span className="text-sm font-semibold">{user.name}</span>
                <span className={`text-[10px] font-black uppercase flex items-center gap-1.5 ${RANK_UI_DATA[user.rankTier].color}`}>
                    <RankIcon tier={user.rankTier} subRank={user.subRank} size="sm" /> {user.rankTier}
                </span>
             </div>
             <div className="cursor-pointer" onClick={() => navigate('/profile')}>
                <AvatarBox avatar={user.avatar} className="w-10 h-10 border border-slate-700" />
             </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export const BottomNav = ({ unreadCount = 0 }: { unreadCount?: number }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname;

  const tabs = [
    { path: '/', icon: Home, label: 'Sảnh' },
    { path: '/leaderboard', icon: Trophy, label: 'BXH' },
    { path: '/friends', icon: Users, label: 'Bạn bè', hasBadge: unreadCount > 0 },
    { path: '/history', icon: History, label: 'Lịch sử' },
    { path: '/rules', icon: BookOpen, label: 'Luật chơi' },
  ];

  return (
    <div className="bg-slate-900 border-t border-slate-800 pb-safe pt-2 px-2 flex justify-around items-center sticky bottom-0 z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 relative ${
              isActive ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'fill-red-500/10' : ''}`} />
            {tab.hasBadge && <Badge count={unreadCount} className="!-top-0.5 !-right-0.5" />}
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
