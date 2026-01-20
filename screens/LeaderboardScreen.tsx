
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Player, getRankFromPoints, getRomanNumeral } from '../types';
import { AvatarBox, LoadingIndicator, RankIcon } from '../components/Shared';
import { RANK_UI_DATA } from '../constants';
import { Trophy } from 'lucide-react';

const LeaderboardScreen = ({ user }: { user: Player | null }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { supabase.from('profiles').select('*').order('points', { ascending: false }).limit(20).then(({ data }) => { if (data) setPlayers(data); setIsLoading(false); }); }, []);
  return (
    <div className="p-4 max-w-md mx-auto space-y-3 animate-fade-in pb-20">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Trophy className="text-yellow-500" /> BXH</h2>
      {isLoading ? <LoadingIndicator message="Đang tải..." /> : players.map((p, i) => {
        const { tier, subRank } = getRankFromPoints(p.points || 0);
        return (
          <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border ${p.id === user?.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800/60 border-slate-700'}`}>
            <div className="flex items-center gap-3">
              <span className={`font-black w-6 text-center ${i < 3 ? 'text-yellow-500 text-lg' : 'text-slate-500 text-sm'}`}>{i+1}</span>
              <AvatarBox avatar={p.avatar} className="w-10 h-10 border border-slate-700" />
              <div><div className="font-bold text-white text-sm">{p.name}</div><div className={`text-[9px] font-black uppercase tracking-widest ${RANK_UI_DATA[tier].color}`}>{tier} {getRomanNumeral(subRank)}</div></div>
            </div>
            <div className="font-black text-orange-400 text-sm">{p.points} Pts</div>
          </div>
        );
      })}
    </div>
  );
};

export default LeaderboardScreen;
