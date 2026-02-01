
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, RankTier, Move, Piece, getRankFromPoints, getRomanNumeral } from '../types';
import { supabase } from '../services/supabase';
import { AvatarBox, LoadingIndicator, RankIcon } from './Shared';
import { X, MessageSquare, Send, Octagon, ChevronRight, Flag, CheckCircle2, AlertTriangle, Info, Save, Loader2, ArrowRight, LogOut, Home, Trophy, Swords, XCircle, Hash, UserMinus } from 'lucide-react';
import { DEFAULT_GAME_ICON, RANK_UI_DATA } from '../constants';

export const AlertModal = ({ title, message, type = 'info', onClose }: { title: string, message: string, type?: 'success' | 'error' | 'info', onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 w-full max-xs:max-w-xs rounded-[2rem] border border-slate-700 shadow-2xl p-8 text-center animate-scale-up">
        <div className="mb-6 flex justify-center">
          {type === 'success' && <div className="p-4 bg-emerald-500/20 rounded-full text-emerald-500"><CheckCircle2 className="w-12 h-12" /></div>}
          {type === 'error' && <div className="p-4 bg-red-500/20 rounded-full text-red-500"><AlertTriangle className="w-12 h-12" /></div>}
          {type === 'info' && <div className="p-4 bg-blue-500/20 rounded-full text-blue-500"><Info className="w-12 h-12" /></div>}
        </div>
        <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">{message}</p>
        <button 
          onClick={onClose}
          className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all ${
            type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
          } text-white`}
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
};

export const KickConfirmModal = ({ opponentName, onConfirm, onCancel }: { opponentName: string, onConfirm: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-orange-500/30 text-center w-full max-xs:max-w-xs animate-scale-up">
      <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <UserMinus className="w-8 h-8 text-orange-500" />
      </div>
      <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter text-orange-500">Mời Rời Phòng?</h2>
      <p className="text-slate-400 text-xs mb-8">Bạn có chắc chắn muốn mời <span className="text-white font-bold">{opponentName}</span> rời khỏi phòng đấu này?</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all">Xác nhận</button>
        <button onClick={onCancel} className="bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 text-xs uppercase active:scale-95 transition-all">Hủy</button>
      </div>
    </div>
  </div>
);

export const LogoutConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-red-500/30 text-center w-full max-xs:max-w-xs animate-scale-up">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <LogOut className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Đăng Xuất?</h2>
      <p className="text-slate-400 text-xs mb-8">Bạn có chắc chắn muốn rời khỏi trò chơi ngay bây giờ?</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-red-600 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all">Đăng xuất ngay</button>
        <button onClick={onCancel} className="bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 text-xs uppercase active:scale-95 transition-all">Hủy</button>
      </div>
    </div>
  </div>
);

export const OpponentProfileModal = ({ opponent, onClose }: { opponent: any, onClose: () => void }) => {
  if (!opponent) return null;

  const { tier, subRank } = getRankFromPoints(opponent.points || 0);
  const totalMatches = (opponent.wins || 0) + (opponent.losses || 0);
  const winRate = totalMatches > 0 ? ((opponent.wins / totalMatches) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] w-full max-sm:max-w-sm rounded-[2.5rem] border border-white/10 p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-scale-up relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="mb-6">
          <AvatarBox avatar={opponent.avatar} className="w-24 h-24 mx-auto border-4 border-slate-800 shadow-2xl" />
        </div>

        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">{opponent.name}</h2>
        
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border border-slate-800 bg-slate-900/50 mb-8 shadow-sm ${RANK_UI_DATA[tier].color}`}>
          <RankIcon tier={tier} subRank={subRank} size="sm" />
          <span className="font-black uppercase text-[10px] tracking-[0.2em]">
            {tier} {getRomanNumeral(subRank)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 text-center">
            <div className="text-xl font-black text-white">{opponent.points || 0}</div>
            <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Điểm Hạng</div>
          </div>
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 text-center">
            <div className="text-xl font-black text-blue-400">{winRate}%</div>
            <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Tỷ lệ thắng</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex flex-col items-center">
            <Hash className="w-3.5 h-3.5 text-slate-500 mb-1" />
            <span className="text-sm font-black text-white leading-none">{totalMatches}</span>
            <span className="text-[7px] font-bold text-slate-500 uppercase mt-1">Tổng</span>
          </div>
          <div className="flex flex-col items-center">
            <Swords className="w-3.5 h-3.5 text-green-500 mb-1" />
            <span className="text-sm font-black text-green-500 leading-none">{opponent.wins || 0}</span>
            <span className="text-[7px] font-bold text-slate-500 uppercase mt-1">Thắng</span>
          </div>
          <div className="flex flex-col items-center">
            <XCircle className="w-3.5 h-3.5 text-red-500 mb-1" />
            <span className="text-sm font-black text-red-500 leading-none">{opponent.losses || 0}</span>
            <span className="text-[7px] font-bold text-slate-500 uppercase mt-1">Thua</span>
          </div>
        </div>

        <p className="mt-8 text-[9px] text-slate-600 font-bold uppercase tracking-[0.1em]">Thông tin hồ sơ công khai của người chơi</p>
      </div>
    </div>
  );
};

export const ChatModal = ({ user, friend, onClose, onRead }: { user: Player, friend: any, onClose: () => void, onRead?: () => void }) => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const markAsRead = async () => {
        try {
            setMessages(prev => {
                const hasUnread = prev.some(m => m.sender_id === friend.id && m.receiver_id === user.id && !m.is_read);
                if (!hasUnread) return prev;
                return prev.map(m => 
                    (m.sender_id === friend.id && m.receiver_id === user.id && !m.is_read) 
                    ? { ...m, is_read: true } 
                    : m
                );
            });
            if (onRead) onRead();
            await supabase.from('messages')
                .update({ is_read: true })
                .match({ sender_id: friend.id, receiver_id: user.id, is_read: false });
        } catch (e) {}
    };

    const fetchMessages = async () => {
        try {
            const { data } = await supabase.from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });
            if (data) {
                setMessages(data);
                const hasUnread = data.some(m => m.sender_id === friend.id && m.receiver_id === user.id && !m.is_read);
                if (hasUnread) await markAsRead();
            }
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMessages();
        const channel = supabase.channel(`user-chat-${user.id}-${friend.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                const newMsg = payload.new;
                const isRelevant = (newMsg.sender_id === user.id && newMsg.receiver_id === friend.id) || (newMsg.sender_id === friend.id && newMsg.receiver_id === user.id);
                if (isRelevant) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        const msgToAdd = newMsg.sender_id === friend.id ? { ...newMsg, is_read: true } : newMsg;
                        return [...prev, msgToAdd];
                    });
                    if (newMsg.sender_id === friend.id) {
                        if (onRead) onRead();
                        await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
                    }
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
                const updatedMsg = payload.new;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
            }).subscribe();
        return () => { channel.unsubscribe(); };
    }, [friend.id, user.id]);

    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = inputValue.trim();
        if (!content) return;
        setInputValue('');
        const tempId = 'temp-' + Date.now();
        const tempMsg = { id: tempId, sender_id: user.id, receiver_id: friend.id, content: content, is_read: false, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);
        const { data, error } = await supabase.from('messages').insert([{ sender_id: user.id, receiver_id: friend.id, content: content }]).select().single();
        if (error) setMessages(prev => prev.filter(m => m.id !== tempId));
        else if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    };

    const handleJoinRoom = (roomCode: string) => { onClose(); navigate(`/room?join=${roomCode}`); };

    const renderMessageContent = (content: string, isMe: boolean) => {
        try {
            const parsed = JSON.parse(content);
            if (parsed && parsed.type === 'invite') {
                return (
                    <div className="flex flex-col gap-2">
                        <span className="font-bold text-white mb-1">{parsed.text || "Lời mời thách đấu"}</span>
                        <div className="bg-black/20 rounded-xl p-3 border border-white/10 flex flex-col gap-2">
                             <div className="flex items-center gap-2">
                                 <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">Mã phòng:</span>
                                 <span className="text-sm font-mono font-bold text-yellow-400">{parsed.roomCode}</span>
                             </div>
                             {!isMe && (
                                <button onClick={() => handleJoinRoom(parsed.roomCode)} className="bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                                    Vào Ngay <ArrowRight className="w-3 h-3" />
                                </button>
                             )}
                        </div>
                    </div>
                );
            }
        } catch (e) {}
        return <div className="break-words">{content}</div>;
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col animate-fade-in sm:p-4">
            <div className="bg-slate-900 w-full max-lg:max-w-lg mx-auto flex-1 flex flex-col sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AvatarBox avatar={friend.avatar} className="w-10 h-10" />
                        <div><div className="font-bold text-white text-sm">{friend.name}</div></div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f172a]" onClick={markAsRead}>
                    {isLoading ? <LoadingIndicator message="Đang tải hội thoại..." /> : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
                            <MessageSquare className="w-20 h-20 mb-2" />
                            <p className="text-sm font-bold uppercase tracking-widest">Bắt đầu trò chuyện</p>
                        </div>
                    ) : messages.map((m, i) => {
                        const isMe = m.sender_id === user.id;
                        return (
                            <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-md ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                    {renderMessageContent(m.content, isMe)}
                                    <div className="flex items-center justify-end gap-1.5 mt-1">
                                      <div className={`text-[8px] opacity-40 font-bold`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                      {isMe && <div className={`text-[8px] font-black uppercase tracking-tighter ${m.is_read ? 'text-cyan-400' : 'text-slate-500'}`}>{m.is_read ? 'Đã xem' : 'Đã gửi'}</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <form onSubmit={sendMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onFocus={markAsRead} placeholder="Aa" className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors" />
                    <button type="submit" disabled={!inputValue.trim()} className="bg-blue-600 disabled:opacity-50 p-3 rounded-xl text-white shadow-lg active:scale-95 transition-all"><Send className="w-5 h-5" /></button>
                </form>
            </div>
        </div>
    );
};

export const GameResultModal = ({ 
  result, 
  delta, 
  opponent, 
  mode, 
  reason, 
  moves = [], 
  initialBoard = [],
  playerId,
  onClose,
  onBackToRoom
}: { 
  result: 'win' | 'loss' | 'draw', 
  delta: number, 
  opponent: string, 
  mode: string, 
  reason?: string, 
  moves?: Move[], 
  initialBoard?: Piece[],
  playerId: string,
  onClose: () => void,
  onBackToRoom?: () => void
}) => {
  const isWin = result === 'win';
  const isLoss = result === 'loss';
  const isDraw = result === 'draw';
  const isRoom = mode === 'room' || window.location.hash.includes('mode=room');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getReasonVN = (r?: string) => {
    if (r === 'checkmate') return 'Chiếu bí';
    if (r === 'resigned') return isWin ? 'Đối thủ đầu hàng' : 'Bạn đã đầu hàng';
    if (r === 'timeout') return 'Hết thời gian';
    if (r === 'afk') return 'Rời trận (AFK)';
    if (r === 'stalemate') return 'Vây bí (Hết nước đi)';
    return '';
  };
  
  const handleSaveMatch = async () => {
    if (isSaving || isSaved || !playerId || moves.length === 0) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('saved_matches').insert([{
        user_id: playerId,
        opponent_name: opponent,
        result: result,
        moves: moves,
        initial_board: initialBoard,
        mode: mode
      }]);
      if (error) throw error;
      setIsSaved(true);
    } catch (e) {
      console.error("Lỗi lưu ván đấu:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Only show score calculation if mode is explicitly 'online' (Ranked)
  const showScore = mode === 'online';

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] w-full max-sm:max-w-sm rounded-[2.5rem] border border-white/10 p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-scale-up">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden shadow-lg">
             <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center border border-red-900">
                <span className={`font-chinese text-2xl font-bold ${isDraw ? 'text-blue-400' : 'text-red-600'}`}>{isWin ? '帥' : isDraw ? '和' : '將'}</span>
             </div>
          </div>
        </div>
        
        <h2 className={`text-3xl font-black uppercase tracking-[0.1em] mb-1 ${isWin ? 'text-yellow-500' : isDraw ? 'text-blue-400' : 'text-white'}`}>
          {isWin ? 'Chiến Thắng' : isDraw ? 'Hòa Cờ' : 'Thất Bại'}
        </h2>
        {reason && (
           <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 italic opacity-80">
             ({getReasonVN(reason)})
           </p>
        )}
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">vs {opponent}</p>
        
        {showScore && (
            <div className="bg-[#1e293b] rounded-[1.5rem] border border-white/5 p-6 mb-8 flex flex-col items-center justify-center gap-1">
              <div className={`text-4xl font-black ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-white'}`}>
                {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta}
              </div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Điểm Hạng</div>
            </div>
        )}
        
        <div className="flex flex-col gap-3">
          {moves.length > 0 && (
            <button 
              onClick={handleSaveMatch}
              disabled={isSaving || isSaved}
              className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.15em] flex items-center justify-center gap-2 transition-all shadow-md ${
                isSaved ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Đã lưu ván đấu' : 'Lưu lại ván đấu'}
            </button>
          )}

          {isRoom && onBackToRoom && (
            <button 
              onClick={onBackToRoom}
              className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] bg-[#f25e11] text-white shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Về phòng chờ
            </button>
          )}
          
          <button 
            onClick={onClose}
            className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] bg-[#2d3748] text-white active:scale-[0.98] transition-all"
          >
            Về Sảnh chính
          </button>
        </div>
      </div>
    </div>
  );
};

export const RankUpModal = ({ oldTier, oldSub, newTier, newSub, onClose }: { oldTier: RankTier, oldSub: number, newTier: RankTier, newSub: number, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 animate-fade-in">
    <div className="bg-slate-800 p-10 rounded-3xl border-2 border-yellow-500 text-center animate-scale-up">
      <h2 className="text-3xl font-black text-yellow-500 mb-4 uppercase">Thăng Hạng!</h2>
      <div className="flex items-center justify-center gap-4 mb-8">
        <RankIcon tier={oldTier} subRank={oldSub} size="md" />
        <ChevronRight className="w-8 h-8 text-slate-600" />
        <RankIcon tier={newTier} subRank={newSub} size="lg" />
      </div>
      <button onClick={onClose} className="w-full bg-yellow-600 text-white font-bold py-4 rounded-xl uppercase">Tiếp tục</button>
    </div>
  </div>
);

export const ExitWarningModal = ({ onConfirm, onCancel, type = 'logout' }: { onConfirm: () => void, onCancel: () => void, type?: 'logout' | 'home' | 'back' }) => (
  <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-6 backdrop-blur-sm">
    <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-red-500/50 text-center w-full max-xs:max-w-xs animate-scale-up">
      <Octagon className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
      <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Cảnh báo</h2>
      <p className="text-slate-400 text-xs mb-8">Xác nhận về sảnh chính?.</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-red-600 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all">Xác nhận</button>
        <button onClick={onCancel} className="bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 text-xs uppercase active:scale-95 transition-all">Quay lại</button>
      </div>
    </div>
  </div>
);

export const SurrenderConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-800 p-8 rounded-3xl border-2 border-orange-500/50 text-center animate-scale-up w-full max-xs:max-w-xs">
      <Flag className="w-16 h-16 text-orange-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2 uppercase">Đầu hàng?</h2>
      <p className="text-slate-400 text-xs mb-8">Bạn có chắc chắn muốn đầu hàng không?</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-black text-xs uppercase active:scale-95 text-white shadow-lg transition-all">Đầu hàng</button>
        <button onClick={onCancel} className="bg-slate-700 hover:bg-slate-600 py-4 rounded-2xl font-bold text-slate-300 text-xs uppercase active:scale-95 transition-all">Hủy</button>
      </div>
    </div>
  </div>
);
