
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player } from '../types';
import { INITIAL_BOARD_SETUP } from '../services/xiangqiRules';
import { AvatarBox, LoadingIndicator, SplashLoading, RankIcon } from '../components/Shared';
import { AlertModal } from '../components/Modals';
import { RANK_UI_DATA } from '../constants';
import { 
    Plus, 
    List, 
    Search, 
    ArrowLeft, 
    UserPlus, 
    LogOut, 
    Check,
    DoorOpen,
    Users,
    X,
    Send,
    RefreshCw,
    PlayCircle
} from 'lucide-react';

interface Room {
    id: string;
    code: string;
    red_player_id: string;
    black_player_id: string | null;
    status: string;
    is_public: boolean;
    red?: any;
    black?: any;
}

const InviteModal = ({ isOpen, onClose, user, roomCode, roomId }: { isOpen: boolean, onClose: () => void, user: Player, roomCode: string, roomId: string }) => {
    const [onlineFriends, setOnlineFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sentIds, setSentIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) fetchOnlineFriends();
    }, [isOpen]);

    const fetchOnlineFriends = async () => {
        setLoading(true);
        try {
            const { data: friendships } = await supabase.from('friendships')
                .select('*')
                .eq('status', 'accepted')
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

            if (!friendships) return;

            const friendIds = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
            
            if (friendIds.length === 0) {
                setOnlineFriends([]);
                return;
            }

            const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
            const { data: profiles } = await supabase.from('profiles')
                .select('*')
                .in('id', friendIds)
                .eq('is_online', true)
                .gt('last_seen', twoMinutesAgo);

            setOnlineFriends(profiles || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const sendInvite = async (friend: any) => {
        try {
            // Cấu trúc tin nhắn mới: JSON object
            const invitePayload = JSON.stringify({
                type: 'invite',
                text: `${user.name} có lời mời bạn vào phòng ${roomCode}`,
                roomCode: roomCode,
                roomId: roomId
            });

            await supabase.from('messages').insert([{
                sender_id: user.id,
                receiver_id: friend.id,
                content: invitePayload
            }]);
            setSentIds(prev => new Set([...prev, friend.id]));
        } catch (e) {
            console.error("Invite send failed", e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 w-full max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl flex flex-col max-h-[70vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-white uppercase tracking-wider text-sm">Mời Bạn Bè</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <LoadingIndicator message="Đang tìm bạn..." /> : onlineFriends.length === 0 ? (
                        <div className="py-10 text-center">
                            <Users className="w-12 h-12 text-slate-800 mx-auto mb-2 opacity-20" />
                            <p className="text-xs text-slate-600 font-bold uppercase">Không có bạn bè online</p>
                        </div>
                    ) : onlineFriends.map(friend => (
                        <div key={friend.id} className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AvatarBox avatar={friend.avatar} className="w-10 h-10" isOnline={true} />
                                <span className="text-xs font-bold text-white">{friend.name}</span>
                            </div>
                            <button 
                                disabled={sentIds.has(friend.id)}
                                onClick={() => sendInvite(friend)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sentIds.has(friend.id) ? 'bg-slate-700 text-slate-500 cursor-default' : 'bg-blue-600 text-white active:scale-95 shadow-lg'}`}
                            >
                                {sentIds.has(friend.id) ? 'Đã gửi' : 'Mời'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const RoomLobbyScreen = ({ user }: { user: Player }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [view, setView] = useState<'lobby' | 'list' | 'detail'>('lobby');
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [inputCode, setInputCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'error' | 'info'} | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const joinCode = params.get('join');
        if (joinCode && view === 'lobby') {
            handleJoinByCode(joinCode);
        }
    }, [location.search]);

    // Fetch rooms when switching to list view
    useEffect(() => {
        if (view === 'list') {
            fetchAvailableRooms();
            // Realtime subscription for new rooms
            const channel = supabase.channel('public-rooms')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
                    fetchAvailableRooms();
                })
                .subscribe();
            return () => { channel.unsubscribe(); };
        }
    }, [view]);

    const fetchAvailableRooms = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase.from('rooms')
                .select('*, red:red_player_id(*)') // Lấy thông tin chủ phòng
                .eq('status', 'waiting') // Chỉ lấy phòng đang chờ
                .is('black_player_id', null) // Chưa có người thứ 2
                .neq('red_player_id', user.id) // Không hiện phòng do chính mình tạo (nếu có lỗi logic nào đó)
                .order('created_at', { ascending: false });
            
            if (data) setAvailableRooms(data);
        } catch (e) {
            console.error("Fetch rooms error", e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCreateRoom = async () => {
        if (isLoading) return;
        setIsLoading(true);
        const code = Math.floor(1000 + Math.random() * 8999).toString();
        
        try {
            const { data, error } = await supabase.from('rooms').insert([{ 
                code, 
                red_player_id: user.id, 
                status: 'waiting',
                board_state: INITIAL_BOARD_SETUP,
                turn: 'red'
            }]).select().single();
            
            if (error) throw error;
            
            if (data) {
                const roomWithRed = { ...data, red: user };
                setCurrentRoom(roomWithRed);
                setLogs([`[*] Phòng #${code} được tạo bởi ${user.name}`]);
                setView('detail');
            }
        } catch (err: any) {
            setAlertConfig({
              title: "Lỗi Tạo Phòng",
              message: "Không thể khởi tạo phòng đấu. Vui lòng thử lại!",
              type: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinByCode = async (code?: string) => {
        const targetCode = (code || inputCode).trim();
        if (!targetCode) return;
        
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('rooms')
                .select('*, red:red_player_id(*), black:black_player_id(*)')
                .eq('code', targetCode)
                .eq('status', 'waiting')
                .maybeSingle();
                
            if (error) throw error;

            if (data) {
                if (data.red_player_id === user.id) {
                    setCurrentRoom(data);
                    setView('detail');
                } else {
                    const { error: joinError } = await supabase.from('rooms')
                        .update({ black_player_id: user.id })
                        .eq('id', data.id);
                    if (!joinError) {
                        setCurrentRoom({ ...data, black_player_id: user.id, black: user });
                        setLogs(prev => [...prev, `[+] ${user.name} đã tham gia`]);
                        setView('detail');
                    }
                }
            } else {
              setAlertConfig({
                title: "Phòng Không Tồn Tại",
                message: `Không tìm thấy phòng #${targetCode} hoặc phòng đã bắt đầu chơi.`,
                type: "error"
              });
            }
        } catch (err) {
            console.error("Join failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (view !== 'detail' || !currentRoom) return;

        const fetchLatestData = async () => {
            const { data } = await supabase.from('rooms')
                .select('*, red:red_player_id(*), black:black_player_id(*)')
                .eq('id', currentRoom.id)
                .single();
            if (data) {
                if (!currentRoom.black_player_id && data.black_player_id) {
                    setLogs(prev => [...prev, `[+] ${data.black?.name || 'Đối thủ'} đã vào`]);
                }
                setCurrentRoom(data);
                if (data.status === 'playing') {
                    navigate(`/game/online/${data.id}?mode=room`);
                }
            }
        };

        const channel = supabase.channel(`room-sync-${currentRoom.id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'rooms', 
                filter: `id=eq.${currentRoom.id}` 
            }, (p) => {
                if (p.new.status === 'playing') {
                    navigate(`/game/online/${currentRoom.id}?mode=room`);
                } else {
                    fetchLatestData();
                }
            })
            .on('postgres_changes', {
                event: 'DELETE', 
                schema: 'public', 
                table: 'rooms', 
                filter: `id=eq.${currentRoom.id}` 
            }, () => {
                setView('lobby');
                setCurrentRoom(null);
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [view, currentRoom?.id, navigate]);

    const handleStartGame = async () => {
        if (!currentRoom || currentRoom.red_player_id !== user.id || !currentRoom.black_player_id) return;
        setIsLoading(true);

        try {
            const coinResult = Math.floor(Math.random() * 2);
            let finalRedId = currentRoom.red_player_id;
            let finalBlackId = currentRoom.black_player_id;

            if (coinResult === 1) {
                finalRedId = currentRoom.black_player_id;
                finalBlackId = currentRoom.red_player_id;
            }

            await supabase.from('rooms').update({ 
                status: 'playing',
                red_player_id: finalRedId,
                black_player_id: finalBlackId,
                board_state: INITIAL_BOARD_SETUP,
                turn: 'red'
            }).eq('id', currentRoom.id);
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        if (!currentRoom) return;
        setIsLoading(true);
        if (currentRoom.red_player_id === user.id) {
            await supabase.from('rooms').delete().eq('id', currentRoom.id);
        } else {
            await supabase.from('rooms').update({ black_player_id: null }).eq('id', currentRoom.id);
        }
        setIsLoading(false);
        setView('lobby');
        setCurrentRoom(null);
    };

    if (view === 'lobby') {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] animate-fade-in overflow-hidden">
                {isLoading && <SplashLoading message="Đang xử lý..." />}
                {alertConfig && <AlertModal title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
                
                <div className="p-4 flex items-center">
                    <button onClick={() => navigate('/')} className="p-2 text-slate-400">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 text-center pr-10">
                        <h2 className="text-[#a855f7] font-black italic tracking-widest text-xl uppercase">Phòng Đấu</h2>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Lựa chọn</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                    <div className="w-32 h-32 bg-[#1a1325] rounded-3xl border border-[#a855f7]/20 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.1)]">
                        <DoorOpen className="w-16 h-16 text-[#a855f7]/60" />
                    </div>

                    <div className="w-full max-w-xs flex flex-col gap-4">
                        <button onClick={handleCreateRoom} className="w-full bg-[#a855f7] py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase text-sm shadow-xl active:scale-95 transition-all"><Plus className="w-5 h-5" /> Tạo Phòng</button>
                        <button onClick={() => setView('list')} className="w-full bg-[#111827] border border-[#1f2937] py-5 rounded-2xl flex items-center justify-center gap-3 text-slate-300 font-black uppercase text-sm active:scale-95"><List className="w-5 h-5" /> Danh sách phòng</button>
                        <div className="relative group">
                            <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()} placeholder="NHẬP MÃ PHÒNG" className="w-full bg-[#111827] border border-[#1f2937] py-5 rounded-2xl px-12 text-center text-sm font-black text-[#a855f7] placeholder:text-slate-800 outline-none focus:border-[#a855f7]/50 transition-all uppercase" />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-800" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'detail' && currentRoom) {
        const isHost = currentRoom.red_player_id === user.id;
        const canStart = currentRoom.black_player_id !== null;

        return (
            <div className="flex flex-col h-full bg-[#12100e] animate-fade-in overflow-hidden">
                {isLoading && <SplashLoading message="Đang xử lý..." />}
                
                <InviteModal 
                    isOpen={isInviteOpen} 
                    onClose={() => setIsInviteOpen(false)} 
                    user={user} 
                    roomCode={currentRoom.code} 
                    roomId={currentRoom.id}
                />

                <div className="p-6 flex items-center justify-between">
                    <button onClick={handleLeaveRoom} className="p-2 text-slate-400"><LogOut className="w-6 h-6 rotate-180" /></button>
                    <div className="text-center">
                        <h2 className="text-[#f59e0b] font-black text-lg uppercase italic tracking-wider">PHÒNG ĐẤU #{currentRoom.code}</h2>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ĐANG CHỜ...</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsInviteOpen(true)}
                        className="p-2 text-[#f59e0b] bg-[#f59e0b]/10 rounded-xl"
                    >
                        <UserPlus className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col p-4 gap-6 overflow-hidden">
                    <div className="bg-[#1a1a14] border border-[#f59e0b]/20 rounded-[2rem] p-6 shadow-2xl">
                        <div className="flex items-center justify-around gap-4">
                            <div className="flex flex-col items-center gap-3 flex-1">
                                <div className="relative">
                                    <AvatarBox avatar={currentRoom.red?.avatar || ''} className="w-20 h-20 border-2 border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.2)]" />
                                    <div className="absolute -bottom-1 -right-1 bg-[#f59e0b] rounded-full p-1 border-2 border-[#1a1a14]">
                                        <Check className="w-4 h-4 text-white stroke-[4px]" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-white font-black uppercase text-xs truncate max-w-[100px]">{currentRoom.red?.name}</div>
                                    <div className="text-[9px] text-[#f59e0b] font-black uppercase tracking-widest mt-1">Chủ Phòng</div>
                                </div>
                            </div>

                            <div className="flex flex-col items-center">
                                <div className="w-px h-10 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
                                <div className="bg-slate-800 border border-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 my-2 italic">VS</div>
                                <div className="w-px h-10 bg-gradient-to-t from-transparent via-slate-700 to-transparent"></div>
                            </div>

                            <div className="flex flex-col items-center gap-3 flex-1">
                                {currentRoom.black_player_id ? (
                                    <div className="animate-fade-in flex flex-col items-center gap-3">
                                        <AvatarBox avatar={currentRoom.black?.avatar || ''} className="w-20 h-20 border-2 border-slate-700" />
                                        <div className="text-center">
                                            <div className="text-white font-black uppercase text-xs truncate max-w-[100px]">{currentRoom.black?.name}</div>
                                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Đối Thủ</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-800 animate-pulse">
                                            <UserPlus className="w-8 h-8 opacity-20" />
                                        </div>
                                        <div className="text-[9px] text-slate-700 font-black uppercase tracking-widest mt-1">Đang Đợi...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a14]/50 border border-white/5 rounded-[2rem] p-5">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Users className="w-4 h-4 text-slate-500" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nhật Ký Phòng</h3>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                            {logs.map((log, i) => (
                                <div key={i} className="bg-[#1a1a14] p-3 rounded-2xl border border-white/5 text-[9px] font-bold text-slate-500 leading-normal animate-slide-up">
                                    <span className="text-[#f59e0b]/50 mr-2">#{i+1}</span>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {isHost ? (
                        <button 
                            disabled={!canStart || isLoading}
                            onClick={handleStartGame}
                            className={`w-full py-5 rounded-3xl font-black uppercase text-sm tracking-[0.15em] transition-all shadow-2xl ${
                                canStart && !isLoading
                                ? 'bg-[#f59e0b] text-[#1a1a14] active:scale-[0.98]' 
                                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed opacity-60'
                            }`}
                        >
                            {isLoading ? 'ĐANG KHỞI TẠO...' : 'TUNG XU & BẮT ĐẦU'}
                        </button>
                    ) : (
                        <div className="w-full py-5 rounded-3xl bg-slate-900/40 border border-slate-800 text-center animate-pulse">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">CHỜ CHỦ PHÒNG BẮT ĐẦU...</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'list') {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] animate-fade-in overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView('lobby')} className="p-2 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-6 h-6" /></button>
                        <h2 className="text-white font-black uppercase tracking-widest text-sm">Phòng Đang Chờ</h2>
                    </div>
                    <button onClick={fetchAvailableRooms} className="p-2 text-[#a855f7] bg-[#a855f7]/10 rounded-xl hover:bg-[#a855f7]/20 transition-all active:scale-95">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {isLoading && availableRooms.length === 0 ? (
                    <LoadingIndicator message="Đang tải danh sách..." />
                ) : availableRooms.length === 0 ? (
                     <div className="flex flex-col items-center justify-center flex-1 opacity-20 gap-4">
                        <List className="w-16 h-16" />
                        <p className="text-xs font-black uppercase tracking-widest">Không có phòng trống</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
                        {availableRooms.map((room) => (
                            <div key={room.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between animate-slide-up hover:border-[#a855f7]/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <AvatarBox avatar={room.red?.avatar} className="w-12 h-12 border-2 border-slate-700" />
                                        <div className="absolute -bottom-1 -right-1 bg-slate-800 p-0.5 rounded-full border border-slate-700">
                                            <RankIcon tier={room.red?.rank_tier || 'Đồng'} subRank={room.red?.sub_rank || 5} size="sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-bold text-sm">{room.red?.name}</h3>
                                            <span className="px-2 py-0.5 rounded bg-[#a855f7]/10 text-[#a855f7] text-[9px] font-black uppercase tracking-wider">#{room.code}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Đang chờ đối thủ...</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleJoinByCode(room.code)}
                                    className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl text-white shadow-lg active:scale-95 transition-all"
                                >
                                    <PlayCircle className="w-5 h-5 fill-current" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default RoomLobbyScreen;
