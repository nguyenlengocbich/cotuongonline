
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, RankTier, Move, Piece } from '../types';
import { supabase } from '../services/supabase';
import { AvatarBox, LoadingIndicator, RankIcon } from './Shared';
import { X, MessageSquare, Send, Octagon, ChevronRight, Flag, CheckCircle2, AlertTriangle, Info, Save, Loader2, ArrowRight, LogOut } from 'lucide-react';
import { DEFAULT_GAME_ICON } from '../constants';

export const AlertModal = ({ title, message, type = 'info', onClose }: { title: string, message: string, type?: 'success' | 'error' | 'info', onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 w-full max-w-xs rounded-[2rem] border border-slate-700 shadow-2xl p-8 text-center animate-scale-up">
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

export const LogoutConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-red-500/30 text-center w-full max-w-xs animate-scale-up">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <LogOut className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Đăng Xuất?</h2>
      <p className="text-slate-400 text-xs mb-8">Bạn có chắc chắn muốn rời khỏi kỳ đài ngay bây giờ?</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-red-600 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all">Đăng xuất ngay</button>
        <button onClick={onCancel} className="bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 text-xs uppercase active:scale-95 transition-all">Ở lại</button>
      </div>
    </div>
  </div>
);

export const ChatModal = ({ user, friend, onClose }: { user: Player, friend: any, onClose: () => void }) => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const markAsRead = async () => {
        await supabase.from('messages')
            .update({ is_read: true })
            .eq('sender_id', friend.id)
            .eq('receiver_id', user.id)
            .eq('is_read', false);
    };

    const fetchMessages = async () => {
        const { data } = await supabase.from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });
        if (data) setMessages(data);
        setIsLoading(false);
        markAsRead();
    };

    useEffect(() => {
        fetchMessages();
        const channel = supabase.channel(`user-chat-${user.id}-${friend.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
            }, (payload) => {
                const newMsg = payload.new;
                const isRelevant = 
                    (newMsg.sender_id === user.id && newMsg.receiver_id === friend.id) ||
                    (newMsg.sender_id === friend.id && newMsg.receiver_id === user.id);
                
                if (isRelevant) {
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                    if (newMsg.sender_id === friend.id) markAsRead();
                }
            })
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'messages' 
            }, (payload) => {
                const updatedMsg = payload.new;
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [friend.id, user.id]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = inputValue.trim();
        if (!content) return;
        
        setInputValue('');
        const { data, error } = await supabase.from('messages').insert([{
            sender_id: user.id,
            receiver_id: friend.id,
            content: content
        }]).select().single();

        if (error) {
            console.error("Gửi tin nhắn thất bại:", error);
        }
    };

    const handleJoinRoom = (roomCode: string) => {
        onClose();
        navigate(`/room?join=${roomCode}`);
    };

    const renderMessageContent = (content: string, isMe: boolean) => {
        try {
            // Thử parse xem có phải JSON mời chơi không
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
                                <button 
                                    onClick={() => handleJoinRoom(parsed.roomCode)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                                >
                                    Vào Ngay <ArrowRight className="w-3 h-3" />
                                </button>
                             )}
                        </div>
                    </div>
                );
            }
        } catch (e) {
            // Không phải JSON, render text thường
        }
        return <div className="break-words">{content}</div>;
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col animate-fade-in sm:p-4">
            <div className="bg-slate-900 w-full max-w-lg mx-auto flex-1 flex flex-col sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <AvatarBox avatar={friend.avatar} className="w-10 h-10" />
                        <div>
                            <div className="font-bold text-white text-sm">{friend.name}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f172a]">
                    {isLoading ? <LoadingIndicator message="Đang tải hội thoại..." /> : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-10 pointer-events-none">
                            <MessageSquare className="w-20 h-20 mb-2" />
                            <p className="text-sm font-bold uppercase tracking-widest">Bắt đầu trò chuyện</p>
                        </div>
                    ) : messages.map((m, i) => {
                        const isMe = m.sender_id === user.id;
                        return (
                            <div key={m.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-md ${
                                    isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                                }`}>
                                    {renderMessageContent(m.content, isMe)}
                                    <div className="flex items-center justify-end gap-1.5 mt-1">
                                      <div className={`text-[8px] opacity-40 font-bold`}>
                                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {isMe && (
                                        <div className={`text-[8px] font-black uppercase tracking-tighter ${m.is_read ? 'text-cyan-400' : 'text-slate-500'}`}>
                                          {m.is_read ? 'Đã xem' : 'Đã gửi'}
                                        </div>
                                      )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form onSubmit={sendMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
                    <input 
                        type="text" 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Aa" 
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-blue-500 transition-colors" 
                    />
                    <button type="submit" disabled={!inputValue.trim()} className="bg-blue-600 disabled:opacity-50 p-3 rounded-2xl text-white shadow-lg active:scale-95 transition-all">
                        <Send className="w-5 h-5" />
                    </button>
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
  onClose 
}: { 
  result: 'win' | 'loss', 
  delta: number, 
  opponent: string, 
  mode: string, 
  reason?: string, 
  moves?: Move[], 
  initialBoard?: Piece[],
  playerId: string,
  onClose: () => void 
}) => {
  const isWin = result === 'win';
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const getReasonText = (reason?: string) => {
    switch(reason) {
      case 'checkmate': return 'Thắng bằng chiếu bí';
      case 'resigned': return isWin ? 'Đối thủ đã đầu hàng' : 'Bạn đã đầu hàng';
      case 'timeout': return isWin ? 'Đối thủ hết thời gian suy nghĩ' : 'Bạn hết thời gian suy nghĩ';
      case 'afk': return isWin ? 'Đối thủ AFK quá lâu' : 'Bạn bị xử thua do AFK quá lâu';
      default: return isWin ? 'Bạn đã chiến thắng' : 'Bạn đã thất bại';
    }
  };

  const handleSaveMatch = async () => {
    if (isSaving || isSaved || !playerId) return;
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

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className={`bg-slate-900 w-full max-sm:max-w-sm rounded-[2.5rem] border-2 ${isWin ? 'border-yellow-500' : 'border-slate-700'} p-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-scale-up`}>
        <div className="mb-6 relative">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-lg overflow-hidden ${isWin ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
            <img src={DEFAULT_GAME_ICON} alt="Result" className="w-full h-full object-cover" />
          </div>
          {isWin && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-yellow-500 animate-ping opacity-20"></div>
            </div>
          )}
        </div>
        
        <h2 className={`text-3xl font-black uppercase tracking-widest mb-2 ${isWin ? 'text-yellow-500' : 'text-slate-400'}`}>
          {isWin ? 'Chiến Thắng' : 'Thất Bại'}
        </h2>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">vs {opponent}</p>
        <p className="text-white text-xs font-bold bg-slate-800 py-2 px-4 rounded-full inline-block mb-6">{getReasonText(reason)}</p>
        
        <div className={`p-4 rounded-3xl border mb-6 flex flex-col items-center gap-1 ${isWin ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
          <div className={`text-3xl font-black ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {delta > 0 ? `+${delta}` : delta === 0 ? '0' : delta}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Điểm Hạng</div>
        </div>
        
        <div className="flex flex-col gap-3">
          {moves.length > 0 && (
            <button 
              onClick={handleSaveMatch}
              disabled={isSaving || isSaved}
              className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
                isSaved ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
              }`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaved ? 'Đã lưu ván đấu' : 'Lưu ván đấu'}
            </button>
          )}
          <button 
            onClick={onClose}
            className={`w-full py-4 rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg active:scale-95 transition-all ${isWin ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 text-white'}`}
          >
            Tiếp tục
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
    <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-red-500/50 text-center w-full max-w-xs animate-scale-up">
      <Octagon className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
      <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">Cảnh báo</h2>
      <p className="text-slate-400 text-xs mb-8">Trận đấu đang diễn ra. Nếu rời đi bạn sẽ bị xử thua cuộc.</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-red-600 py-4 rounded-2xl font-black text-xs uppercase text-white shadow-lg active:scale-95 transition-all">Rời trận</button>
        <button onClick={onCancel} className="bg-slate-800 py-4 rounded-2xl font-bold text-slate-400 text-xs uppercase active:scale-95 transition-all">Quay lại</button>
      </div>
    </div>
  </div>
);

export const SurrenderConfirmModal = ({ onConfirm, onCancel }: { onConfirm: () => void, onCancel: () => void }) => (
  <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
    <div className="bg-slate-800 p-8 rounded-3xl border-2 border-orange-500/50 text-center animate-scale-up w-full max-w-xs">
      <Flag className="w-16 h-16 text-orange-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-white mb-2 uppercase">Đầu hàng?</h2>
      <p className="text-slate-400 text-xs mb-8">Bạn có chắc chắn muốn nhận thua không?</p>
      <div className="flex flex-col gap-3">
        <button onClick={onConfirm} className="bg-orange-600 hover:bg-orange-500 py-4 rounded-2xl font-black text-xs uppercase active:scale-95 text-white shadow-lg transition-all">Chấp nhận thua</button>
        <button onClick={onCancel} className="bg-slate-700 hover:bg-slate-600 py-4 rounded-2xl font-bold text-slate-300 text-xs uppercase active:scale-95 transition-all">Suy nghĩ lại</button>
      </div>
    </div>
  </div>
);
