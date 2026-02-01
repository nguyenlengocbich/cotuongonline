
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player } from '../types';
import { LoadingIndicator } from '../components/Shared';
import { History, Globe, Users, Save, Play, Trash2 } from 'lucide-react';

const HistoryScreen = ({ user }: { user: Player }) => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [savedMatches, setSavedMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');

    // RESET SCROLL ON INTERNAL TAB CHANGE
    useEffect(() => {
        const performReset = () => {
            const container = document.getElementById('main-scroll-container');
            if (container) container.scrollTop = 0;
        };
        performReset();
        const frameId = requestAnimationFrame(performReset);
        return () => cancelAnimationFrame(frameId);
    }, [activeTab]);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('matches')
                .select('*')
                .eq('player_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (data) setMatches(data);
        } catch (e) {
            console.error("Load history exception:", e);
        } finally {
            setIsLoading(false); 
        }
    };

    const fetchSaved = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase.from('saved_matches')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setSavedMatches(data);
        } catch (e) {
            console.error("Load saved matches exception:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        if (activeTab === 'all') fetchHistory();
        else fetchSaved();
    }, [user.id, activeTab]);

    const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const { error } = await supabase.from('saved_matches').delete().eq('id', id);
            if (!error) setSavedMatches(prev => prev.filter(m => m.id !== id));
        } catch (e) {}
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    return (
        <div className="p-4 max-w-md mx-auto space-y-4 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    {activeTab === 'all' ? <History className="text-orange-500" /> : <Save className="text-emerald-500" />}
                    {activeTab === 'all' ? 'Lịch sử đấu' : 'Ván đấu đã lưu'}
                </h2>
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'all' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                        Tất cả
                    </button>
                    <button 
                        onClick={() => setActiveTab('saved')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'saved' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                        Đã lưu
                    </button>
                </div>
            </div>

            {isLoading ? <LoadingIndicator message="Đang tải..." /> : (
                <div className="space-y-3">
                {activeTab === 'all' ? (
                    matches.length === 0 ? <div className="text-center py-20 text-slate-600 text-xs font-bold uppercase tracking-widest">Chưa có dữ liệu</div> : matches.map((m, i) => (
                        <div key={m.id || i} className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl flex items-center justify-between animate-slide-up">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${m.result === 'win' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {m.result === 'win' ? 'W' : 'L'}
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">vs {m.opponent_name || 'Đối thủ'}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`flex items-center gap-1 text-[9px] font-black uppercase ${m.mode === 'online' ? 'text-blue-400' : 'text-orange-400'}`}>
                                            {m.mode === 'online' ? <Globe className="w-2.5 h-2.5" /> : <Users className="w-2.5 h-2.5" />}
                                            {m.mode === 'online' ? 'Đấu Online' : 'Đấu Phòng'}
                                        </span>
                                        <span className="text-[9px] text-slate-600 px-1">•</span>
                                        <span className="text-[9px] text-slate-500">{formatDate(m.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            {m.points_delta !== undefined && m.points_delta !== null && (
                                <div className={`font-black text-sm ${m.points_delta > 0 ? 'text-green-500' : m.points_delta < 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                    {m.points_delta > 0 ? `+${m.points_delta}` : m.points_delta === 0 ? '0' : m.points_delta}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    savedMatches.length === 0 ? <div className="text-center py-20 text-slate-600 text-xs font-bold uppercase tracking-widest">Chưa có ván đấu nào được lưu</div> : savedMatches.map((m, i) => (
                        <div key={m.id || i} className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl flex items-center justify-between animate-slide-up group">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${m.result === 'win' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                                    {m.result === 'win' ? 'W' : 'L'}
                                </div>
                                <div>
                                    <div className="text-white font-bold text-sm">vs {m.opponent_name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">{m.moves?.length || 0} Nước đi</span>
                                        <span className="text-[9px] text-slate-600 px-1">•</span>
                                        <span className="text-[9px] text-slate-500">{formatDate(m.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => navigate(`/replay/${m.id}`)}
                                    className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg active:scale-95 transition-all"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteSaved(m.id, e)}
                                    className="p-3 bg-slate-700 text-slate-400 rounded-xl hover:bg-red-900/20 hover:text-red-500 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
                </div>
            )}
        </div>
    );
};

export default HistoryScreen;
