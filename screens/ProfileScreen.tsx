
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player, getRomanNumeral } from '../types';
import { AvatarBox, RankIcon } from '../components/Shared';
import { RANK_UI_DATA } from '../constants';
import { Camera, Check, Edit3, LogOut } from 'lucide-react';

const ProfileScreen = ({ user, onUpdateAvatar, onUpdateName, onLogout }: { user: Player, onUpdateAvatar: (url: string) => void, onUpdateName: (name: string) => void, onLogout: () => void }) => {
    const [newName, setNewName] = useState(user.name);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const winRate = (user.wins + user.losses) > 0 ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1) : "0.0";

    return (
        <div className="p-6 max-w-md mx-auto space-y-8 animate-fade-in pb-24">
            <div className="text-center">
              <div className="relative inline-block group">
                <AvatarBox avatar={user.avatar} className="w-32 h-32 border-4 border-slate-700" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 p-3 rounded-full border-4 border-[#1a1a1a]"><Camera className="w-5 h-5 text-white" /></button>
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
                    <div className="flex gap-2 w-full max-w-xs mt-2">
                      <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="bg-slate-900 border border-slate-700 p-3 rounded-xl flex-1 text-white text-sm" />
                      <button onClick={() => { onUpdateName(newName); setIsEditing(false); }} className="bg-green-600 px-5 rounded-xl text-white"><Check className="w-5 h-5" /></button>
                    </div>
                ) : ( 
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold text-white">{user.name}</h2>
                    <button onClick={() => setIsEditing(true)} className="text-slate-500 p-2"><Edit3 className="w-4 h-4" /></button>
                  </div>
                )}
                <div className={`mt-2 font-black uppercase text-[10px] tracking-[0.2em] ${RANK_UI_DATA[user.rankTier].color} flex items-center gap-2 bg-slate-900/50 px-4 py-1.5 rounded-full`}>
                   <RankIcon tier={user.rankTier} subRank={user.subRank} size="sm" /> {user.rankTier} {getRomanNumeral(user.subRank)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 text-center"><div className="text-2xl font-black text-white">{user.points}</div><div className="text-[9px] text-slate-500 uppercase font-black">Điểm</div></div>
              <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 text-center"><div className="text-2xl font-black text-blue-400">{winRate}%</div><div className="text-[9px] text-slate-500 uppercase font-black">Thắng</div></div>
            </div>
            <button 
                onClick={onLogout} 
                className="w-full bg-red-900/10 text-red-500 p-5 rounded-3xl font-bold flex items-center justify-center gap-3 border border-red-500/20 uppercase text-xs tracking-widest"
            >
                <LogOut className="w-5 h-5" /> Thoát tài khoản
            </button>
        </div>
    );
};

export default ProfileScreen;
