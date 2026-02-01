
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player, getRomanNumeral } from '../types';
import { AvatarBox, RankIcon } from '../components/Shared';
import { RANK_UI_DATA } from '../constants';
import { Camera, Check, Edit3, LogOut, Key, Trophy, Swords, XCircle, Hash } from 'lucide-react';

const ProfileScreen = ({ user, onUpdateAvatar, onUpdateName, onLogout }: { user: Player, onUpdateAvatar: (url: string) => void, onUpdateName: (name: string) => void, onLogout: () => void }) => {
    const navigate = useNavigate();
    const [newName, setNewName] = useState(user.name);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const totalMatches = (user.wins || 0) + (user.losses || 0);
    const winRate = totalMatches > 0 ? ((user.wins / totalMatches) * 100).toFixed(1) : "0.0";

    return (
        <div className="p-6 max-w-md mx-auto space-y-6 animate-fade-in pb-24">
            {/* Header / Avatar */}
            <div className="text-center">
              <div className="relative inline-block group">
                <AvatarBox avatar={user.avatar} className="w-32 h-32 border-4 border-slate-700 shadow-2xl" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 p-3 rounded-full border-4 border-[#1a1a1a] shadow-lg active:scale-90 transition-transform"><Camera className="w-5 h-5 text-white" /></button>
                <input type="file" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => onUpdateAvatar(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} accept="image/*" className="hidden" />
              </div>
              <div className="mt-6 flex flex-col items-center">
                {isEditing ? (
                    <div className="flex gap-2 w-full max-w-xs mt-2 animate-slide-down">
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-slate-900 border border-slate-700 p-3 rounded-xl flex-1 text-white text-sm outline-none focus:border-blue-500" autoFocus />
                      <button onClick={() => { onUpdateName(newName); setIsEditing(false); }} className="bg-green-600 px-5 rounded-xl text-white active:scale-95 transition-all"><Check className="w-5 h-5" /></button>
                    </div>
                ) : ( 
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{user.name}</h2>
                    <button onClick={() => setIsEditing(true)} className="text-slate-500 p-2 hover:text-white transition-colors"><Edit3 className="w-4 h-4" /></button>
                  </div>
                )}
                <div className={`mt-3 font-black uppercase text-[10px] tracking-[0.2em] ${RANK_UI_DATA[user.rankTier].color} flex items-center gap-2 bg-slate-900/50 px-5 py-2 rounded-full border border-slate-800 shadow-sm`}>
                   <RankIcon tier={user.rankTier} subRank={user.subRank} size="sm" /> {user.rankTier} {getRomanNumeral(user.subRank)}
                </div>
              </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 text-center shadow-lg backdrop-blur-sm">
                <div className="text-2xl font-black text-white">{user.points}</div>
                <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Điểm Hạng</div>
              </div>
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 text-center shadow-lg backdrop-blur-sm">
                <div className="text-2xl font-black text-blue-400">{winRate}%</div>
                <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Tỷ lệ thắng</div>
              </div>
            </div>

            {/* Detailed Match Stats */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-[2rem] shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-5 flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5" /> Chỉ số chiến đấu
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-800/40 border border-white/5">
                        <Hash className="w-4 h-4 text-slate-500 mb-2" />
                        <span className="text-lg font-black text-white leading-none">{totalMatches}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Tổng trận</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                        <Swords className="w-4 h-4 text-green-500 mb-2" />
                        <span className="text-lg font-black text-green-500 leading-none">{user.wins}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Thắng</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <XCircle className="w-4 h-4 text-red-500 mb-2" />
                        <span className="text-lg font-black text-red-500 leading-none">{user.losses}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Thua</span>
                    </div>
                </div>
            </div>

            {/* Settings & Logout */}
            <div className="space-y-3 pt-2">
                <button 
                    onClick={() => navigate('/change-password')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 p-5 rounded-2xl font-bold flex items-center justify-between border border-slate-700 transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                            <Key className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black uppercase tracking-tight">Đổi mật khẩu</span>
                    </div>
                    <Edit3 className="w-4 h-4 text-slate-600" />
                </button>

                <button 
                    onClick={onLogout} 
                    className="w-full bg-red-900/10 hover:bg-red-900/20 text-red-500 p-5 rounded-2xl font-bold flex items-center justify-center gap-3 border border-red-500/20 uppercase text-xs tracking-widest transition-all active:scale-[0.98]"
                >
                    <LogOut className="w-5 h-5" /> Thoát tài khoản
                </button>
            </div>
        </div>
    );
};

export default ProfileScreen;
