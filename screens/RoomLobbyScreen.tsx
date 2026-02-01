
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player } from '../types';
import { INITIAL_BOARD_SETUP } from '../services/xiangqiRules';
import { AvatarBox, LoadingIndicator, SplashLoading } from '../components/Shared';
import { AlertModal, KickConfirmModal } from '../components/Modals';
import { 
    Plus, List, Search, ArrowLeft, UserPlus, LogOut, Check, DoorOpen, Users, X, RefreshCw, PlayCircle
} from 'lucide-react';

interface Room {
    id: string; code: string; red_player_id: string; black_player_id: string | null; status: string;
    red?: any; black?: any;
}

const InviteModal = ({ isOpen, onClose, user, roomCode, roomId, blackPlayerId }: { isOpen: boolean, onClose: () => void, user: Player, roomCode: string, roomId: string, blackPlayerId: string | null }) => {
    const [onlineFriends, setOnlineFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inviteCooldowns, setInviteCooldowns] = useState<Record<string, number>>({});
    const [now, setNow] = useState(Date.now());

    // Fetch on open
    useEffect(() => { if (isOpen) fetchOnlineFriends(); }, [isOpen]);

    // Auto refresh every 5s while open
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setNow(Date.now());
            // Fetch silently (without spinner) to keep list updated
            fetchOnlineFriends(true);
        }, 5000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const fetchOnlineFriends = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { data: friendships } = await supabase.from('friendships').select('*').eq('status', 'accepted').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            if (!friendships) return;
            const friendIds = friendships.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
            if (friendIds.length === 0) { setOnlineFriends([]); return; }
            
            // Check for activity within last 2 minutes
            const twoMinutesAgo = new Date(Date.now() - 120000).toISOString();
            const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds).eq('is_online', true).gt('last_seen', twoMinutesAgo);
            setOnlineFriends(profiles || []);
        } catch (e) {} finally { if (!silent) setLoading(false); }
    };

    const sendInvite = async (friend: any) => {
        console.log(`[Invite] Sending direct broadcast invite to: ${friend.id}`);
        
        const invitePayload = {
            senderId: user.id,
            senderName: user.name,
            senderAvatar: user.avatar,
            roomCode: roomCode,
            roomId: roomId
        };

        try {
            // 1. Gửi qua kênh Broadcast của người nhận (Ưu tiên)
            const targetChannel = supabase.channel(`invites-${friend.id}`);
            targetChannel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await targetChannel.send({
                        type: 'broadcast',
                        event: 'game-invite',
                        payload: invitePayload
                    });
                    console.log("[Invite] Broadcast sent to recipient channel");
                    // Chờ một lát để đảm bảo message được gửi đi trước khi xóa kênh tạm
                    setTimeout(() => supabase.removeChannel(targetChannel), 2000);
                }
            });

            // 2. Gửi qua DB (Dự phòng cho người nhận không online ngay lúc đó)
            await supabase.from('messages').insert([{ 
                sender_id: user.id, 
                receiver_id: friend.id, 
                content: JSON.stringify({ type: 'invite', ...invitePayload })
            }]);

            setInviteCooldowns(prev => ({ ...prev, [friend.id]: Date.now() }));
        } catch (e) {
            console.error("[Invite] Error:", e);
        }
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 w-full max-sm:max-w-sm rounded-[2rem] border border-slate-700 shadow-2xl flex flex-col max-h-[70vh]">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-white uppercase text-sm">Mời Bạn</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? <LoadingIndicator message="Đang tìm..." /> : onlineFriends.length === 0 ? <div className="py-10 text-center text-xs text-slate-600 font-bold uppercase">Không có bạn online</div> : onlineFriends.map(friend => {
                        const isInRoom = blackPlayerId === friend.id;
                        const sentTime = inviteCooldowns[friend.id] || 0;
                        const diff = now - sentTime;
                        const isCoolingDown = diff < 30000;
                        const remainingSec = isCoolingDown ? Math.ceil((30000 - diff) / 1000) : 0;

                        return (
                            <div key={friend.id} className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AvatarBox avatar={friend.avatar} className="w-10 h-10" isOnline={true} />
                                    <span className="text-xs font-bold text-white">{friend.name}</span>
                                </div>
                                <button 
                                    disabled={isInRoom || isCoolingDown} 
                                    onClick={() => sendInvite(friend)} 
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all min-w-[80px] flex items-center justify-center ${
                                        isInRoom ? 'bg-emerald-600/20 text-emerald-500' :
                                        isCoolingDown ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed' : 
                                        'bg-blue-600 text-white active:scale-95 shadow-lg'
                                    }`}
                                >
                                    {isInRoom ? 'Trong phòng' : isCoolingDown ? `${remainingSec}s` : 'Mời'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const RoomLobbyScreen = ({ user }: { user: Player }) => {
    const navigate = useNavigate(); 
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const joinCodeFromUrl = queryParams.get('join');

    const [view, setView] = useState<'lobby' | 'list' | 'detail'>(joinCodeFromUrl ? 'detail' : 'lobby');
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const currentRoomRef = useRef<Room | null>(null);
    const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
    const [inputCode, setInputCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [showKickConfirm, setShowKickConfirm] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'error' | 'info'} | null>(null);

    useEffect(() => { currentRoomRef.current = currentRoom; }, [currentRoom]);

    useEffect(() => {
        return () => {
            const room = currentRoomRef.current;
            if (room && room.status === 'waiting' && !joinCodeFromUrl) {
                // Chỉ xóa phòng khi unmount nếu KHÔNG PHẢI là đang chuyển sang phòng khác qua URL
                if (room.red_player_id === user.id) {
                    supabase.from('rooms').delete().eq('id', room.id).then();
                } else {
                    supabase.from('rooms').update({ black_player_id: null }).eq('id', room.id).then();
                }
            }
        };
    }, [user.id]); // Xóa dependency joinCodeFromUrl để tránh cleanup sai khi URL thay đổi

    // XỬ LÝ CHUYỂN PHÒNG KHI CÓ URL MỚI (INVITE)
    useEffect(() => {
        if (joinCodeFromUrl) {
            const handleSwitchRoom = async () => {
                if (currentRoomRef.current && currentRoomRef.current.code !== joinCodeFromUrl) {
                    setIsLoading(true);
                    // Rời phòng cũ
                    const oldRoom = currentRoomRef.current;
                    try {
                        if (oldRoom.red_player_id === user.id) {
                            await supabase.from('rooms').delete().eq('id', oldRoom.id);
                        } else {
                            await supabase.from('rooms').update({ black_player_id: null }).eq('id', oldRoom.id);
                        }
                    } catch(e) {}
                    setCurrentRoom(null);
                    // Vào phòng mới
                    await handleJoinByCode(joinCodeFromUrl);
                } else if (!currentRoomRef.current) {
                    await handleJoinByCode(joinCodeFromUrl);
                }
            };
            handleSwitchRoom();
        } else {
            // Nếu không có URL join code thì mới check phòng hiện tại (restore session)
            checkCurrentRoom(); 
        }
    }, [joinCodeFromUrl, user.id]);

    const checkCurrentRoom = async () => {
        // Nếu đang có code join thì không restore session cũ nữa để tránh xung đột
        if (joinCodeFromUrl) return; 

        setIsLoading(true);
        try {
            const { data: room, error } = await supabase.from('rooms')
                .select('*, red:red_player_id(*), black:black_player_id(*)')
                .or(`red_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
                .neq('status', 'finished')
                .maybeSingle();
            
            if (room && !error) {
                setCurrentRoom(room);
                setLogs([`[*] Tiếp tục phiên làm việc tại phòng #${room.code}`]);
                setView('detail');
            }
        } catch (e) {} finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (view === 'list') {
            fetchAvailableRooms();
            const channel = supabase.channel('public-rooms').on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchAvailableRooms).subscribe();
            return () => { channel.unsubscribe(); };
        }
    }, [view]);

    const fetchAvailableRooms = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase.from('rooms')
                .select('*, red:red_player_id(*)')
                .eq('status', 'waiting')
                .is('black_player_id', null)
                .not('code', 'is', null) 
                .neq('red_player_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setAvailableRooms(data);
        } catch (e) {} finally { setIsLoading(false); }
    };
    
    const handleCreateRoom = async () => {
        if (isLoading) return; setIsLoading(true);
        const code = Math.floor(1000 + Math.random() * 8999).toString();
        try {
            const { data, error } = await supabase.from('rooms').insert([{ code, red_player_id: user.id, status: 'waiting', board_state: INITIAL_BOARD_SETUP, turn: 'red' }]).select().single();
            if (error) throw error;
            setCurrentRoom({ ...data, red: user }); setLogs([`[*] Phòng #${code} được tạo`]); setView('detail');
        } catch (err) { setAlertConfig({ title: "Lỗi", message: "Không thể tạo phòng.", type: "error" }); } finally { setIsLoading(false); }
    };

    const handleJoinByCode = async (code?: string) => {
        const targetCode = (code || inputCode).trim(); if (!targetCode) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase.from('rooms').select('*, red:red_player_id(*), black:black_player_id(*)').eq('code', targetCode).eq('status', 'waiting').maybeSingle();
            if (data) {
                if (data.red_player_id === user.id) { 
                    setCurrentRoom(data); 
                    setView('detail'); 
                } else if (data.black_player_id && data.black_player_id !== user.id) {
                    setAlertConfig({ title: "Lỗi", message: "Phòng đã đầy người chơi.", type: "error" });
                    setView('lobby');
                } else {
                    const { error: joinError } = await supabase.from('rooms').update({ black_player_id: user.id }).eq('id', data.id);
                    if (!joinError) { 
                        setCurrentRoom({ ...data, black_player_id: user.id, black: user }); 
                        setView('detail'); 
                    }
                }
            } else { 
                setAlertConfig({ title: "Lỗi", message: "Phòng không tồn tại hoặc không còn hiệu lực.", type: "error" }); 
                if (joinCodeFromUrl) navigate('/room'); // Clear invalid url code
                else setView('lobby');
            }
        } catch (err) { setView('lobby'); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (view !== 'detail' || !currentRoom) return;
        const syncRoom = async () => {
            const { data } = await supabase.from('rooms').select('*, red:red_player_id(*), black:black_player_id(*)').eq('id', currentRoom.id).maybeSingle();
            if (data) {
                if (!currentRoom.black_player_id && data.black_player_id) setLogs(prev => [...prev, `[+] ${data.black?.name} đã vào`]);
                setCurrentRoom(data);
                if (data.status === 'playing') { currentRoomRef.current = null; navigate(`/game/online/${data.id}?mode=room`); }
            } else {
                setAlertConfig({ title: "Thông báo", message: "Phòng đấu đã được giải tán bởi chủ phòng.", type: "info" });
                setCurrentRoom(null); setView('lobby');
            }
        };

        const channel = supabase.channel(`room-lobby-${currentRoom.id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` }, (p) => {
                if (p.new.status === 'playing') { currentRoomRef.current = null; navigate(`/game/online/${currentRoom.id}?mode=room`); }
                else if (p.new.black_player_id === null) {
                    if (currentRoomRef.current?.black_player_id === user.id) {
                        setAlertConfig({ title: "Thông báo", message: "Bạn đã bị chủ phòng mời ra khỏi phòng.", type: "info" });
                        setCurrentRoom(null); setView('lobby');
                    } else { setLogs(prev => [...prev, `[-] Đối thủ đã rời phòng`]); syncRoom(); }
                } else syncRoom();
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` }, () => {
                setAlertConfig({ title: "Giải tán", message: "Chủ phòng đã rời đi và giải tán phòng đấu.", type: "info" });
                setCurrentRoom(null); setView('lobby');
            })
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [view, currentRoom?.id, navigate, user.id]);

    const handleStartGame = async () => {
        if (!currentRoom || currentRoom.red_player_id !== user.id || !currentRoom.black_player_id) return;
        setIsLoading(true);
        try { await supabase.from('rooms').update({ status: 'playing', board_state: INITIAL_BOARD_SETUP, turn: 'red' }).eq('id', currentRoom.id); } catch (e) { setIsLoading(false); }
    };

    const handleKickPlayer = async () => {
        if (!currentRoom || !currentRoom.black_player_id || currentRoom.red_player_id !== user.id) return;
        setIsLoading(true);
        try { await supabase.from('rooms').update({ black_player_id: null }).eq('id', currentRoom.id); setLogs(prev => [...prev, `[!] Bạn đã mời đối thủ rời phòng`]); } catch (e) {} finally { setIsLoading(false); setShowKickConfirm(false); }
    };

    const handleLeaveRoom = async () => {
        if (!currentRoom) return;
        setIsLoading(true);
        if (currentRoom.red_player_id === user.id) await supabase.from('rooms').delete().eq('id', currentRoom.id);
        else await supabase.from('rooms').update({ black_player_id: null }).eq('id', currentRoom.id);
        setIsLoading(false); setView('lobby'); setCurrentRoom(null);
    };

    if (view === 'detail') {
        if (!currentRoom) return <SplashLoading message="Đang kết nối phòng đấu..." />;
        const isHost = currentRoom.red_player_id === user.id; 
        const canStart = currentRoom.black_player_id !== null;
        return (
            <div className="flex flex-col h-full bg-[#12100e] animate-fade-in overflow-hidden">
                {isLoading && <SplashLoading message="Đang xử lý..." />}
                {alertConfig && <AlertModal title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
                {showKickConfirm && <KickConfirmModal opponentName={currentRoom.black?.name || 'Người chơi'} onConfirm={handleKickPlayer} onCancel={() => setShowKickConfirm(false)} />}
                <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} user={user} roomCode={currentRoom.code} roomId={currentRoom.id} blackPlayerId={currentRoom.black_player_id} />
                <div className="p-6 flex items-center justify-between">
                    <button onClick={handleLeaveRoom} className="p-2 text-slate-400 active:scale-90 transition-transform"><LogOut className="w-6 h-6 rotate-180" /></button>
                    <div className="text-center">
                        <h2 className="text-[#f59e0b] font-black text-lg uppercase italic">PHÒNG #{currentRoom.code}</h2>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><p className="text-[10px] text-slate-500 font-bold uppercase">ĐANG CHỜ...</p></div>
                    </div>
                    <button onClick={() => setIsInviteOpen(true)} className="p-2 text-[#f59e0b] bg-[#f59e0b]/10 rounded-xl active:scale-95 transition-transform"><UserPlus className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 flex flex-col p-4 gap-6 overflow-hidden">
                    <div className="bg-[#1a1a14] border border-[#f59e0b]/20 rounded-[2rem] p-6 shadow-2xl">
                        <div className="flex items-center justify-around gap-4">
                            <div className="flex flex-col items-center gap-3 flex-1">
                                <AvatarBox avatar={currentRoom.red?.avatar || ''} className="w-20 h-20 border-2 border-[#f59e0b]" />
                                <div className="text-center"><div className="text-white font-black uppercase text-xs truncate max-w-[100px]">{currentRoom.red?.name}</div><div className="text-[9px] text-[#f59e0b] font-black uppercase mt-1">Chủ Phòng</div></div>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 italic">VS</div>
                            <div className="flex flex-col items-center gap-3 flex-1">
                                {currentRoom.black_player_id ? (
                                    <div className="animate-fade-in flex flex-col items-center gap-3 relative">
                                        <div className="relative">
                                            <AvatarBox avatar={currentRoom.black?.avatar || ''} className="w-20 h-20 border-2 border-slate-700" />
                                            {isHost && <button onClick={() => setShowKickConfirm(true)} className="absolute -top-1 -right-1 bg-red-600 p-1.5 rounded-full border-2 border-[#1a1a14] shadow-lg active:scale-90 transition-transform"><X className="w-3 h-3 text-white stroke-[3px]" /></button>}
                                        </div>
                                        <div className="text-center"><div className="text-white font-black uppercase text-xs truncate max-w-[100px]">{currentRoom.black?.name}</div><div className="text-[9px] text-slate-500 font-black uppercase mt-1">Đối Thủ</div></div>
                                    </div>
                                ) : <div className="flex flex-col items-center gap-3"><div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center animate-pulse"><UserPlus className="w-8 h-8 opacity-20" /></div><div className="text-[9px] text-slate-700 font-black uppercase mt-1">Đang Đợi...</div></div>}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1a14]/50 border border-white/5 rounded-[2rem] p-5">
                        <div className="flex items-center gap-2 mb-4 px-2"><Users className="w-4 h-4 text-slate-500" /><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nhật Ký Phòng</h3></div>
                        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                            {logs.map((log, i) => <div key={i} className="bg-[#1a1a14] p-3 rounded-2xl border border-white/5 text-[9px] font-bold text-slate-500 animate-slide-up"><span className="text-[#f59e0b]/50 mr-2">#{i+1}</span>{log}</div>)}
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    {isHost ? <button disabled={!canStart || isLoading} onClick={handleStartGame} className={`w-full py-5 rounded-3xl font-black uppercase text-sm tracking-[0.15em] transition-all ${canStart && !isLoading ? 'bg-[#f59e0b] text-[#1a1a14] active:scale-95 shadow-2xl' : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'}`}>{isLoading ? 'ĐANG KHỞI TẠO...' : 'TUNG XU & BẮT ĐẦU'}</button> : <div className="w-full py-5 rounded-3xl bg-slate-900/40 border border-slate-800 text-center animate-pulse"><span className="text-[10px] font-black text-slate-600 uppercase">CHỜ CHỦ PHÒNG BẮT ĐẦU...</span></div>}
                </div>
            </div>
        );
    }

    if (view === 'lobby') {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] animate-fade-in overflow-hidden">
                {isLoading && <SplashLoading message="Đang xử lý..." />}
                {alertConfig && <AlertModal title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
                <div className="p-4 flex items-center"><button onClick={() => navigate('/')} className="p-2 text-slate-400"><ArrowLeft className="w-6 h-6" /></button><div className="flex-1 text-center pr-10"><h2 className="text-[#a855f7] font-black italic tracking-widest text-xl uppercase">Phòng Đấu</h2></div></div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                    <div className="w-32 h-32 bg-[#1a1325] rounded-3xl border border-[#a855f7]/20 flex items-center justify-center shadow-[0_0_50px_rgba(168,85,247,0.1)]"><DoorOpen className="w-16 h-16 text-[#a855f7]/60" /></div>
                    <div className="w-full max-w-xs flex flex-col gap-4">
                        <button onClick={handleCreateRoom} className="w-full bg-[#a855f7] py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black uppercase text-sm shadow-xl active:scale-95 transition-transform"><Plus className="w-5 h-5" /> Tạo Phòng</button>
                        <button onClick={() => setView('list')} className="w-full bg-[#111827] border border-[#1f2937] py-5 rounded-2xl flex items-center justify-center gap-3 text-slate-300 font-black text-sm active:scale-95 transition-transform"><List className="w-5 h-5" /> Danh sách phòng</button>
                        <div className="relative"><input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()} placeholder="NHẬP MÃ PHÒNG" className="w-full bg-[#111827] border border-[#1f2937] py-5 rounded-2xl px-12 text-center text-sm font-black text-[#a855f7] outline-none uppercase tracking-widest" /><Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-800" /></div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'list') {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0a] animate-fade-in overflow-hidden">
                <div className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><button onClick={() => setView('lobby')} className="p-2 text-slate-400 hover:text-white transition-colors"><ArrowLeft className="w-6 h-6" /></button><h2 className="text-white font-black uppercase text-sm">Phòng Chờ</h2></div><button onClick={fetchAvailableRooms} className="p-2 text-[#a855f7] bg-[#a855f7]/10 rounded-xl active:scale-95 transition-transform"><RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button></div>
                {availableRooms.length === 0 ? <div className="flex flex-col items-center justify-center flex-1 opacity-20 gap-4"><List className="w-16 h-16" /><p className="text-xs font-black uppercase">Không có phòng trống</p></div> : <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">{availableRooms.map((room) => <div key={room.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between animate-slide-up group"><div className="flex items-center gap-4"><AvatarBox avatar={room.red?.avatar} className="w-12 h-12" /><div><div className="flex items-center gap-2"><h3 className="text-white font-bold text-sm">{room.red?.name}</h3><span className="px-2 py-0.5 rounded bg-[#a855f7]/10 text-[#a855f7] text-[9px] font-black uppercase">#{room.code}</span></div><p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Đang chờ đối thủ...</p></div></div><button onClick={() => handleJoinByCode(room.code)} className="bg-blue-600 hover:bg-blue-500 p-3 rounded-xl text-white active:scale-95 shadow-lg transition-all"><PlayCircle className="w-5 h-5" /></button></div>)}</div>}
            </div>
        );
    }
    return null;
};

export default RoomLobbyScreen;
