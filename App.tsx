
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { Board } from './components/Board';
import { getValidMoves, INITIAL_BOARD_SETUP, getPieceAt, getRandomMove, isCheck } from './services/xiangqiRules';
import { getBestMove } from './services/geminiService';
import { supabase } from './services/supabase';
import { Piece, Color, Move, Player, RankTier, GameStatus, MatchRecord, RANK_ORDER, RANK_THRESHOLDS, getRankFromPoints, getRomanNumeral, PieceType } from './types';
import { 
  ArrowLeft, User, Trophy, BookOpen, Cpu, Globe, LogOut, Trash2,
  ChevronRight, Edit3, Save, Shield, Star, Gem, Swords, Flame, Crown, ChevronUp, History, Users, Clock, AlertCircle,
  MessageSquare, Send, X, RefreshCw, Upload, Image as ImageIcon, PlusSquare, LogIn, Clipboard, Octagon, WifiOff, CheckCircle2, XCircle, Zap, ExternalLink, Camera, Flag, UserPlus, Search, MessageCircle, Check, Percent, Home, Info, HelpCircle, UserMinus, Key, UserCheck, UserX, Copy, Lock, Eye, EyeOff, Loader2, Info as InfoIcon, Lightbulb
} from 'lucide-react';

const AVATARS = ["🐉", "🐯", "🦅", "⚔️", "🛡️", "🔥", "❄️", "⚡", "☯️", "🏯", "🎋", "🎎"];

const RANK_UI_DATA: Record<RankTier, { color: string, bg: string, border: string }> = {
  [RankTier.BRONZE]: { color: 'text-orange-500', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
  [RankTier.SILVER]: { color: 'text-slate-300', bg: 'bg-slate-700/40', border: 'border-slate-400/30' },
  [RankTier.GOLD]: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  [RankTier.PLATINUM]: { color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-400/30' },
  [RankTier.DIAMOND]: { color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-400/30' },
  [RankTier.MASTER]: { color: 'text-purple-500', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  [RankTier.GRANDMASTER]: { color: 'text-red-500', bg: 'bg-red-900/20', border: 'border-red-500/30' },
};

const LoadingIndicator = ({ message = "Đang tải dữ liệu..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in text-slate-500">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-slate-800 rounded-full"></div>
      <div className="absolute inset-0 w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">{message}</span>
  </div>
);

const AvatarBox = ({ avatar, className = "w-10 h-10", isOnline = false }: { avatar: string, className?: string, isOnline?: boolean }) => {
  const isEmoji = avatar && avatar.length <= 4;
  return (
    <div className="relative inline-block">
      <div className={`bg-slate-800 rounded-full flex items-center justify-center overflow-hidden shadow-inner border border-slate-700 ${className}`}>
        {isEmoji ? (
          <span className={className.includes('w-10') ? 'text-xl' : className.includes('w-14') ? 'text-2xl' : className.includes('w-16') ? 'text-3xl' : className.includes('w-20') ? 'text-4xl' : className.includes('w-32') ? 'text-6xl' : 'text-base'}>
            {avatar}
          </span>
        ) : (
          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
        )}
      </div>
      {isOnline && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#1a1a1a] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
      )}
    </div>
  );
};

const checkOnlineStatus = (profile: any) => {
  if (!profile || !profile.is_online) return false;
  const lastSeen = profile.last_seen ? new Date(profile.last_seen).getTime() : 0;
  const now = new Date().getTime();
  return (now - lastSeen) < 120000;
};

const RankIcon = ({ tier, subRank, size = "md" }: { tier: RankTier, subRank: number, size?: "sm" | "md" | "lg" }) => {
  const containerSize = size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : "w-32 h-32";
  const ui = RANK_UI_DATA[tier];
  const numeral = getRomanNumeral(subRank);
  return (
    <div className={`relative flex items-center justify-center ${ui.color} ${containerSize}`}>
      <Shield className="w-full h-full" strokeWidth={size === "lg" ? 2 : 1.5} />
      <div className={`absolute flex items-center justify-center ${size === "sm" ? "-translate-y-1.5" : size === "md" ? "-translate-y-2.5" : "-translate-y-6"}`}>
         {tier === RankTier.BRONZE && <div className={`${size === "sm" ? "w-1 h-1" : size === "md" ? "w-1.5 h-1.5" : "w-4 h-4"} bg-current rounded-full`} />}
         {tier === RankTier.SILVER && <ChevronUp className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.GOLD && <Trophy className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.PLATINUM && <Star className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.DIAMOND && <Gem className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.MASTER && <Swords className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
         {tier === RankTier.GRANDMASTER && <Crown className={size === "sm" ? "w-2.5 h-2.5" : size === "md" ? "w-4 h-4" : "w-10 h-10"} />}
      </div>
      <div className={`absolute inset-0 flex items-center justify-center ${size === "sm" ? "pt-1" : size === "md" ? "pt-1.5" : "pt-4"}`}>
        <span className={`font-black leading-none ${size === "sm" ? "text-[11px]" : size === "md" ? "text-[16px]" : "text-[42px]"} tracking-tight drop-shadow-md select-none`}>
          {numeral}
        </span>
      </div>
    </div>
  );
};

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname;

  const tabs = [
    { path: '/', icon: Home, label: 'Sảnh' },
    { path: '/leaderboard', icon: Trophy, label: 'BXH' },
    { path: '/friends', icon: Users, label: 'Bạn bè' },
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
            <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const ChatModal = ({ user, friend, onClose }: { user: Player, friend: any, onClose: () => void }) => {
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
            alert("Không thể gửi tin nhắn. Vui lòng thử lại.");
        }
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
                                    <div className="break-words">{m.content}</div>
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

const App: React.FC = () => {
  const [user, setUser] = useState<Player | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showRankUp, setShowRankUp] = useState<{oldTier: RankTier, oldSub: number, newTier: RankTier, newSub: number} | null>(null);
  const [showExitWarning, setShowExitWarning] = useState<{ type: 'logout' | 'home' | 'back' } | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const isGameActive = location.pathname.includes('/game/') || location.pathname === '/practice';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { fetchProfile(session.user.id); } 
      else { setIsAuthLoading(false); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { fetchProfile(session.user.id); } 
      else { setUser(null); setIsAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const updateOnlineStatus = async (status: boolean) => {
      try {
        await supabase.from('profiles').update({ 
          is_online: status, 
          last_seen: new Date().toISOString() 
        }).eq('id', user.id);
      } catch (e) { }
    };

    updateOnlineStatus(true);
    const interval = setInterval(() => updateOnlineStatus(true), 45000);
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') updateOnlineStatus(true); };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      updateOnlineStatus(false);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        const { tier, subRank } = getRankFromPoints(data.points || 0);
        setUser({
          id: data.id,
          name: data.name,
          avatar: data.avatar || AVATARS[0],
          points: data.points || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          onlineMatches: data.online_matches || 0,
          rankTier: tier,
          subRank: subRank
        });
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const name = authUser.user_metadata.name || "Kỳ thủ mới";
          const newProfile = { id: authUser.id, name, avatar: AVATARS[0], points: 0, wins: 0, losses: 0, online_matches: 0 };
          await supabase.from('profiles').insert([newProfile]);
          await fetchProfile(authUser.id);
          return;
        }
      }
    } catch (err) { } 
    finally { setIsAuthLoading(false); }
  };

  const handleAuth = async (name: string, pass: string, isRegister: boolean) => {
    if (!name || name.trim().length < 3) { alert("Tên đăng nhập ít nhất 3 ký tự!"); return; }
    if (!pass || pass.length < 6) { alert("Mật khẩu ít nhất 6 ký tự!"); return; }
    setIsAuthLoading(true);
    const email = `${name.toLowerCase().replace(/\s/g, '')}@cotuong.app`;
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name: name.trim() } } });
        if (error) throw error;
        alert("Đăng ký thành công!");
        setIsAuthLoading(false); 
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      }
    } catch (err: any) { alert("Lỗi: " + (err?.message || "Xác thực thất bại")); setIsAuthLoading(false); }
  };

  const updateAvatar = async (newAvatar: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ avatar: newAvatar }).eq('id', user.id);
    if (!error) setUser({ ...user, avatar: newAvatar });
  };

  const updateName = async (newName: string) => {
    if (!user || !newName.trim()) return;
    const { error } = await supabase.from('profiles').update({ name: newName.trim() }).eq('id', user.id);
    if (!error) setUser({ ...user, name: newName.trim() });
  };

  const updateStats = async (result: 'win' | 'loss', moves: Move[], opponent: string) => {
    if (!user) return;
    const isOnline = opponent !== "Máy" && opponent !== "Máy (AI Gemini)" && opponent !== "Thoát trận";
    const isRanked = isOnline && !location.pathname.includes('mode=room');
    
    const oldPoints = user.points;
    const { tier: oldTier, subRank: oldSub } = getRankFromPoints(oldPoints);
    let delta = isRanked ? (result === 'win' ? 25 : -15) : 0;
    const newPoints = Math.max(0, oldPoints + delta);
    const { tier: newTier, subRank: newSub } = getRankFromPoints(newPoints);

    await supabase.from('profiles').update({
      points: newPoints,
      wins: result === 'win' ? user.wins + 1 : user.wins,
      losses: result === 'loss' ? user.losses + 1 : user.losses,
      online_matches: isOnline ? user.onlineMatches + 1 : user.onlineMatches
    }).eq('id', user.id);

    await supabase.from('match_history').insert([{ player_id: user.id, opponent_name: opponent, result, mode: isOnline ? 'online' : 'ai', points_delta: delta }]);

    if (newTier !== oldTier || newSub !== oldSub) { if (newPoints > oldPoints) setShowRankUp({ oldTier, oldSub, newTier, newSub }); }
    fetchProfile(user.id);
  };

  if (isAuthLoading) return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-red-500">
      <RefreshCw className="animate-spin w-12 h-12 mb-4" />
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Đang tải kỳ đài...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col text-slate-200">
      {showRankUp && <RankUpModal {...showRankUp} onClose={() => setShowRankUp(null)} />}
      {showExitWarning && <ExitWarningModal onConfirm={async () => { if (showExitWarning.type === 'logout') await supabase.auth.signOut(); setShowExitWarning(null); navigate('/'); }} onCancel={() => setShowExitWarning(null)} />}
      
      <Navbar user={user} onLogout={async () => isGameActive ? setShowExitWarning({ type: 'logout' }) : (await supabase.auth.signOut(), navigate('/'))} onNavigateHome={() => isGameActive ? setShowExitWarning({ type: 'home' }) : navigate('/')} />
      
      <div className="flex-1 overflow-y-auto pb-4">
        <Routes>
          <Route path="/" element={user ? <HomeScreen user={user} /> : <AuthScreen onAuth={handleAuth} />} />
          <Route path="/practice" element={<GameScreen mode="ai" user={user || undefined} onGameEnd={updateStats} />} />
          <Route path="/matchmaking" element={user ? <MatchmakingScreen user={user} /> : <AuthScreen onAuth={handleAuth} />} />
          <Route path="/room" element={user ? <RoomLobbyScreen user={user} /> : <AuthScreen onAuth={handleAuth} />} />
          <Route path="/game/online/:roomId" element={user ? <GameScreen mode="online" user={user} onGameEnd={updateStats} /> : <AuthScreen onAuth={handleAuth} />} />
          <Route path="/leaderboard" element={<LeaderboardScreen user={user} />} />
          <Route path="/rules" element={<RulesScreen />} />
          <Route path="/friends" element={user ? <FriendsScreen user={user} /> : <Navigate to="/" />} />
          <Route path="/history" element={user ? <HistoryScreen user={user} /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <ProfileScreen user={user} onUpdateAvatar={updateAvatar} onUpdateName={updateName} /> : <AuthScreen onAuth={handleAuth} />} />
        </Routes>
      </div>
      {user && !isGameActive && <BottomNav />}
    </div>
  );
};

const Navbar = ({ user, onLogout, onNavigateHome }: any) => {
  const navigate = useNavigate();
  const isHome = useLocation().pathname === '/';
  return (
    <nav className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-50">
      <div className="flex justify-between items-center max-w-2xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateHome}>
          {!isHome && <ArrowLeft className="w-6 h-6" />}
          <h1 className="text-xl font-bold tracking-wider">Master Xiangqi</h1>
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

const AuthScreen = ({ onAuth }: any) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-sm:max-w-sm border border-slate-700">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-red-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-yellow-600 shadow-lg"><span className="text-4xl font-chinese font-bold text-white">帥</span></div>
            <h2 className="text-2xl font-bold text-white mb-2">{isRegister ? 'Đăng Ký' : 'Đăng Nhập'}</h2>
            <p className="text-slate-400 text-xs">Tham gia cộng đồng kỳ thủ hàng đầu</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onAuth(username, password, isRegister); }} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Tên đăng nhập" className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 pl-10 outline-none focus:border-red-500 transition-colors" required />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu (6+ ký tự)" className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 pl-10 pr-10 outline-none focus:border-red-500 transition-colors" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button type="submit" className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 transform uppercase tracking-widest text-sm">
            {isRegister ? 'Đăng Ký Ngay' : 'Đăng Nhập'}
          </button>
        </form>
        <button onClick={() => setIsRegister(!isRegister)} className="mt-8 text-sm text-red-500/80 w-full text-center hover:text-red-500 transition-colors font-semibold">
          {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
        </button>
      </div>
    </div>
  );
};

const HomeScreen = ({ user }: { user: Player }) => {
  const navigate = useNavigate();
  const totalMatches = (user.wins || 0) + (user.losses || 0);
  const winRate = totalMatches > 0 ? ((user.wins / totalMatches) * 100).toFixed(1) : "0.0";
  const shortId = user.id.substring(0, 8).toUpperCase();

  return (
    <div className="p-4 w-full max-w-2xl mx-auto space-y-6 animate-slide-up">
        <div onClick={() => navigate('/profile')} className="bg-slate-900/95 border border-slate-700 p-6 rounded-[2rem] shadow-2xl flex items-center gap-6 cursor-pointer hover:bg-slate-800 transition-all active:scale-[0.98] group">
            <AvatarBox avatar={user.avatar} className="w-20 h-20 border-2 border-slate-600 flex-shrink-0 shadow-lg group-hover:border-red-500 transition-colors" />
            <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-white truncate">{user.name}</h2>
                    <span className={`text-[10px] font-black uppercase italic ${RANK_UI_DATA[user.rankTier].color} flex items-center gap-2`}>
                        <RankIcon tier={user.rankTier} subRank={user.subRank} size="sm" /> {user.rankTier} {getRomanNumeral(user.subRank)}
                    </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-[10px] text-slate-500 font-mono bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5"><span className="opacity-50">ID:</span> {shortId}</div>
                </div>
                <div className="flex gap-6 border-t border-slate-800/50 pt-3">
                  <div className="flex flex-col"><span className="text-white font-black text-sm">{totalMatches}</span><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Trận đấu</span></div>
                  <div className="flex flex-col"><span className="text-blue-400 font-black text-sm">{winRate}%</span><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Tỉ lệ thắng</span></div>
                  <div className="flex flex-col"><span className="text-orange-400 font-black text-sm">{user.points}</span><span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Điểm số</span></div>
                </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-700 group-hover:text-red-500 transition-colors" />
        </div>
        <div className="grid grid-cols-1 gap-4">
            <div onClick={() => navigate('/matchmaking')} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 hover:border-blue-500 cursor-pointer transition-all flex items-center gap-6 shadow-lg active:scale-95 group">
                <div className="p-4 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-all"><Globe className="w-10 h-10" /></div>
                <div className="flex-1"><h3 className="text-xl font-bold text-white">Đấu Online</h3><p className="text-sm text-slate-500">Tìm đối thủ xứng tầm ngay lập tức</p></div>
            </div>
            <div onClick={() => navigate('/room')} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 hover:border-orange-500 cursor-pointer transition-all flex items-center gap-6 shadow-lg active:scale-95 group">
                <div className="p-4 rounded-xl bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20 transition-all"><Users className="w-10 h-10" /></div>
                <div className="flex-1"><h3 className="text-xl font-bold text-white">Đấu Phòng</h3><p className="text-sm text-slate-500">Tạo không gian riêng cùng bạn bè</p></div>
            </div>
            <div onClick={() => navigate('/practice')} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 hover:border-purple-500 cursor-pointer transition-all flex items-center gap-6 shadow-lg active:scale-95 group">
                <div className="p-4 rounded-xl bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20 transition-all"><Cpu className="w-10 h-10" /></div>
                <div className="flex-1"><h3 className="text-xl font-bold text-white">Đấu với máy</h3><p className="text-sm text-slate-500">Luyện tập cùng AI Gemini thông minh</p></div>
            </div>
        </div>
    </div>
  );
};

const MatchmakingScreen = ({ user }: { user: Player }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'searching' | 'found' | 'failed'>('searching');
  const [timeLeft, setTimeLeft] = useState(30);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    if (status !== 'searching') return;
    let isSubscribed = true;
    let channel: any = null;
    const findMatch = async () => {
      const { data: rooms } = await supabase.from('rooms').select('*').eq('status', 'waiting').is('code', null).is('black_player_id', null).neq('red_player_id', user.id).limit(1);
      if (rooms && rooms.length > 0) {
        const room = rooms[0];
        const { error } = await supabase.from('rooms').update({ black_player_id: user.id, status: 'playing', board_state: INITIAL_BOARD_SETUP, turn: 'red' }).eq('id', room.id);
        if (!error && isSubscribed) { setStatus('found'); setTimeout(() => navigate(`/game/online/${room.id}`), 2000); }
      } else {
        const { data: newRoom } = await supabase.from('rooms').insert([{ red_player_id: user.id, status: 'waiting', code: null }]).select().single();
        if (newRoom && isSubscribed) {
          channel = supabase.channel(`room-${newRoom.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${newRoom.id}` }, (p) => {
              if (p.new.status === 'playing') { setStatus('found'); setTimeout(() => navigate(`/game/online/${newRoom.id}`), 2000); }
            }).subscribe();
        }
      }
    };
    findMatch();
    const timer = setInterval(() => { setTimeLeft((prev) => { if (prev <= 1) { clearInterval(timer); setStatus('failed'); return 0; } return prev - 1; }); }, 1000);
    return () => { isSubscribed = false; clearInterval(timer); if (channel) channel.unsubscribe(); };
  }, [user.id, trigger, status]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-fade-in">
      <div className={`relative w-40 h-40 mb-8 flex items-center justify-center`}>
          <div className={`absolute inset-0 border-4 ${status === 'found' ? 'border-green-500' : status === 'failed' ? 'border-red-500' : 'border-blue-500 border-t-transparent'} rounded-full ${status === 'searching' ? 'animate-spin' : ''}`}></div>
          <span className={`text-4xl font-black ${status === 'found' ? 'text-green-500' : status === 'failed' ? 'text-red-500' : 'text-blue-500'}`}>
            {status === 'found' ? <CheckCircle2 className="w-16 h-16" /> : status === 'failed' ? <XCircle className="w-16 h-16" /> : timeLeft}
          </span>
      </div>
      <h2 className="text-2xl font-black text-white uppercase mb-2">{status === 'searching' ? 'Đang ghép trận...' : status === 'found' ? 'Tìm thấy trận!' : 'Thất bại!'}</h2>
      <button onClick={() => navigate('/')} className="text-slate-500 font-bold hover:text-white transition-colors mt-8">Hủy</button>
    </div>
  );
};

const RoomLobbyScreen = ({ user }: { user: Player }) => {
  const navigate = useNavigate();
  const [inputCode, setInputCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleCreate = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const { data } = await supabase.from('rooms').insert([{ code, red_player_id: user.id, status: 'waiting' }]).select().single();
    if (data) {
      setCreatedCode(code);
      supabase.channel(`room-${data.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${data.id}` }, (p) => { if (p.new.status === 'playing') navigate(`/game/online/${data.id}`, { state: { mode: 'room' } }); }).subscribe();
    }
  };

  const handleJoin = async () => {
    const { data } = await supabase.from('rooms').select('*').eq('code', inputCode).eq('status', 'waiting').maybeSingle();
    if (data) {
      await supabase.from('rooms').update({ black_player_id: user.id, status: 'playing', board_state: INITIAL_BOARD_SETUP, turn: 'red' }).eq('id', data.id);
      navigate(`/game/online/${data.id}`, { state: { mode: 'room' } });
    } else alert("Không tìm thấy phòng!");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-fade-in">
      {!createdCode ? (
        <div className="w-full max-sm:max-w-xs space-y-6">
          <button onClick={handleCreate} className="w-full bg-slate-800 p-10 rounded-3xl border border-slate-700 flex flex-col items-center gap-4 active:scale-95 group">
            <PlusSquare className="w-14 h-14 text-orange-500" />
            <span className="font-bold uppercase tracking-wider text-sm mt-2">Tạo Phòng Mới</span>
          </button>
          <input type="text" value={inputCode} onChange={(e) => setInputCode(e.target.value)} placeholder="Nhập mã..." className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-center font-mono text-xl outline-none" />
          <button onClick={handleJoin} className="w-full bg-blue-600 p-4 rounded-xl font-bold uppercase active:scale-95">Gia Nhập</button>
        </div>
      ) : (
        <div className="bg-slate-800 p-10 rounded-[2.5rem] border border-orange-500/30 space-y-8 animate-scale-up">
          <h3 className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Mã Phòng</h3>
          <div className="text-5xl font-mono font-black text-white bg-slate-900/50 py-6 px-4 rounded-3xl border border-slate-700">{createdCode}</div>
          <button onClick={() => setCreatedCode(null)} className="text-red-500 font-bold uppercase text-xs">Hủy</button>
        </div>
      )}
    </div>
  );
};

const GameScreen = ({ mode, user, onGameEnd }: { mode: 'ai' | 'online', user?: Player, onGameEnd: (result: 'win' | 'loss', moves: Move[], opponent: string) => void }) => {
    const params = useParams();
    const roomId = params.roomId;
    const navigate = useNavigate();
    const [pieces, setPieces] = useState<Piece[]>(INITIAL_BOARD_SETUP);
    const [turn, setTurn] = useState<Color>(Color.RED);
    const [myColor, setMyColor] = useState<Color>(Color.RED);
    const [opponentInfo, setOpponentInfo] = useState<any>({ name: "..." });
    const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
    const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [isAiThinking, setIsAiThinking] = useState(false);

    useEffect(() => {
        if (mode === 'online' && roomId && user) {
            const initRoom = async () => {
                const { data: room } = await supabase.from('rooms').select('*, red:red_player_id(*), black:black_player_id(*)').eq('id', roomId).single();
                if (room) {
                    const amIRed = room.red_player_id === user.id;
                    setMyColor(amIRed ? Color.RED : Color.BLACK);
                    if (room.board_state) setPieces(room.board_state);
                    setTurn(room.turn as Color || Color.RED);
                    setOpponentInfo(amIRed ? (room.black || { name: "Đối thủ" }) : room.red);
                }
            };
            initRoom();
            const channel = supabase.channel(`game-${roomId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (p) => {
                    if (p.new.last_move_by !== user.id) { setPieces(p.new.board_state); setTurn(p.new.turn as Color); }
                    if (p.new.status === 'finished' && p.new.winner_id !== user.id) setStatus(GameStatus.RESIGNED);
                }).subscribe();
            return () => { channel.unsubscribe(); };
        } else { setMyColor(Color.RED); setOpponentInfo({ name: "Máy", avatar: "🤖" }); }
    }, [roomId, mode, user]);

    useEffect(() => { if (mode === 'ai' && turn === Color.BLACK && status === GameStatus.PLAYING) handleAiTurn(); }, [turn, mode, status]);

    const handleAiTurn = async () => {
        setIsAiThinking(true);
        const move = await getBestMove(pieces, Color.BLACK);
        if (move && move.fromX !== -1) executeMove(move.fromX, move.fromY, move.toX, move.toY);
        else { const rand = getRandomMove(pieces, Color.BLACK); if (rand) executeMove(rand.fromX, rand.fromY, rand.toX, rand.toY); }
        setIsAiThinking(false);
    };

    const executeMove = async (fx: number, fy: number, tx: number, ty: number) => {
        const piece = getPieceAt(pieces, fx, fy);
        if (!piece) return;
        const newPieces = pieces.filter(p => !(p.x === tx && p.y === ty)).map(p => p.id === piece.id ? { ...p, x: tx, y: ty } : p);
        const nextTurn = turn === Color.RED ? Color.BLACK : Color.RED;
        setPieces(newPieces); setTurn(nextTurn);
        if (mode === 'online' && roomId && user) await supabase.from('rooms').update({ board_state: newPieces, turn: nextTurn, last_move_by: user.id }).eq('id', roomId);
        const oppGeneral = newPieces.find(p => p.type === PieceType.GENERAL && p.color === nextTurn);
        if (!oppGeneral) { setStatus(GameStatus.CHECKMATE); onGameEnd('win', [], opponentInfo.name); if (mode === 'online' && roomId && user) await supabase.from('rooms').update({ status: 'finished', winner_id: user.id }).eq('id', roomId); }
    };

    const onSquareClick = (x: number, y: number) => {
        if (status !== GameStatus.PLAYING || (mode === 'online' && turn !== myColor) || (mode === 'ai' && turn === Color.BLACK)) return;
        if (selectedPiece) { const move = validMoves.find(m => m.toX === x && m.toY === y); if (move) { executeMove(selectedPiece.x, selectedPiece.y, x, y); setSelectedPiece(null); setValidMoves([]); return; } }
        const p = getPieceAt(pieces, x, y);
        if (p && p.color === turn) { setSelectedPiece(p); setValidMoves(getValidMoves(p, pieces)); } else setSelectedPiece(null);
    };

    return (
        <div className="p-4 flex flex-col items-center gap-4 animate-fade-in relative h-full">
            <div className="w-full max-sm:max-w-sm bg-slate-800 p-4 rounded-xl flex justify-between items-center border border-slate-700">
                <div className="flex items-center gap-2"><AvatarBox avatar={opponentInfo.avatar || ''} className="w-8 h-8" /><span className="text-xs font-bold">{opponentInfo.name}</span></div>
                <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${turn === Color.RED ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/20 text-slate-400'}`}>{turn === Color.RED ? 'Lượt Đỏ' : 'Lượt Đen'}</div>
                <div className="flex items-center gap-2"><span className="text-xs font-bold text-blue-400">{user?.name || "Bạn"}</span><AvatarBox avatar={user?.avatar || AVATARS[0]} className="w-8 h-8" /></div>
            </div>
            <Board pieces={pieces} onPieceClick={() => {}} onSquareClick={onSquareClick} selectedPiece={selectedPiece} validMoves={validMoves} lastMove={null} checkedColor={isCheck(turn, pieces) ? turn : null} />
            <button onClick={() => navigate('/')} className="w-full max-sm:max-w-sm bg-slate-800 p-4 rounded-xl border border-slate-700 font-bold uppercase active:scale-95 text-slate-400">Thoát</button>
        </div>
    );
};

const ProfileScreen = ({ user, onUpdateAvatar, onUpdateName }: any) => {
    const navigate = useNavigate();
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
            <button onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} className="w-full bg-red-900/10 text-red-500 p-5 rounded-3xl font-bold flex items-center justify-center gap-3 border border-red-500/20 uppercase text-xs tracking-widest"><LogOut className="w-5 h-5" /> Thoát tài khoản</button>
        </div>
    );
};

const FriendsScreen = ({ user }: { user: Player }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [allRelations, setAllRelations] = useState<any[]>([]);
    const [myFriends, setMyFriends] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'requests' | 'find'>('my');
    const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
    const [friendToDelete, setFriendToDelete] = useState<any | null>(null);

    const fetchData = async () => {
        try {
            const { data: relations } = await supabase.from('friendships').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            const rels = relations || [];
            setAllRelations(rels);

            const acceptedIds = rels.filter(r => r.status === 'accepted').map(r => r.user_id === user.id ? r.friend_id : r.user_id);
            const incomingIds = rels.filter(r => r.status === 'pending' && r.friend_id === user.id).map(r => r.user_id);

            const allNeededIds = [...new Set([...acceptedIds, ...incomingIds])];
            let profilesMap: Record<string, any> = {};
            
            if (allNeededIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('*').in('id', allNeededIds);
                profiles?.forEach(p => { profilesMap[p.id] = p; });
            }

            setMyFriends(acceptedIds.map(id => profilesMap[id]).filter(Boolean));
            setIncomingRequests(incomingIds.map(id => profilesMap[id]).filter(Boolean));
        } catch (err) { } 
        finally { setIsInitialLoading(false); }
    };

    useEffect(() => { 
        fetchData(); 
        const channel = supabase.channel('friends-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetchData)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchData)
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [user.id]);

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;
        setIsSearching(true);
        const { data } = await supabase.from('profiles').select('*').ilike('name', `%${query}%`).neq('id', user.id).limit(10);
        setSearchResults(data || []);
        setIsSearching(false);
    };

    const sendRequest = async (targetId: string) => {
        await supabase.from('friendships').insert([{ user_id: user.id, friend_id: targetId, status: 'pending' }]);
        await fetchData();
    };

    const acceptRequest = async (senderId: string) => {
        const acceptedProfile = incomingRequests.find(r => r.id === senderId);
        if (acceptedProfile) {
            setMyFriends(prev => [...prev, acceptedProfile]);
            setIncomingRequests(prev => prev.filter(r => r.id !== senderId));
        }
        await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', senderId).eq('friend_id', user.id);
        await fetchData(); 
    };

    const declineRequest = async (senderId: string) => {
        await supabase.from('friendships').delete().eq('user_id', senderId).eq('friend_id', user.id);
        await fetchData();
    };

    const removeFriend = async (friendId: string) => {
        const rel = allRelations.find(r => (r.user_id === user.id && r.friend_id === friendId) || (r.friend_id === user.id && r.user_id === friendId));
        if (rel) {
            await supabase.from('friendships').delete().eq('id', rel.id);
            setFriendToDelete(null);
            await fetchData();
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto space-y-4 animate-fade-in pb-20">
            {activeChatFriend && <ChatModal user={user} friend={activeChatFriend} onClose={() => setActiveChatFriend(null)} />}
            {friendToDelete && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-slate-900 w-full max-w-sm rounded-3xl border border-red-500/20 p-8 text-center">
                        <UserX className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Xóa Bạn Bè?</h3>
                        <p className="text-slate-400 text-sm mb-8">Bạn muốn xóa <span className="text-white font-bold">{friendToDelete.name}</span>?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => removeFriend(friendToDelete.id)} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase text-xs active:scale-95">Xác nhận</button>
                            <button onClick={() => setFriendToDelete(null)} className="w-full bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl uppercase text-xs">Hủy</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Kỳ Thủ</h2>
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button onClick={() => setActiveTab('my')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase relative ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        Bạn bè
                    </button>
                    <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase relative ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        Lời mời
                    </button>
                    <button onClick={() => setActiveTab('find')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${activeTab === 'find' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Tìm</button>
                </div>
            </div>
            {isInitialLoading ? <LoadingIndicator message="Đang tải danh sách..." /> : (
            <>
            {activeTab === 'find' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Tìm tên..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white" />
                        <button onClick={handleSearch} className="bg-blue-600 px-6 rounded-xl text-white font-bold">{isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Tìm'}</button>
                    </div>
                    {searchResults.map(p => {
                        const rel = allRelations.find(r => r.user_id === p.id || r.friend_id === p.id);
                        return (
                            <div key={p.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3"><AvatarBox avatar={p.avatar} className="w-10 h-10" /><div><div className="font-bold text-white text-sm">{p.name}</div><div className="text-[10px] text-slate-500 font-black uppercase">{getRankFromPoints(p.points).tier}</div></div></div>
                                {p.id !== user.id && !rel && <button onClick={() => sendRequest(p.id)} className="bg-blue-600 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase">Kết bạn</button>}
                                {rel?.status === 'pending' && <div className="text-[10px] font-black text-slate-500 italic">Đã gửi/Chờ</div>}
                                {rel?.status === 'accepted' && <div className="text-blue-500 font-black uppercase text-[10px]">Bạn bè</div>}
                            </div>
                        );
                    })}
                </div>
            )}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {incomingRequests.length > 0 ? incomingRequests.map(req => (
                        <div key={req.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3"><AvatarBox avatar={req.avatar} className="w-12 h-12" /><div><div className="font-bold text-white">{req.name}</div><div className="text-[10px] text-orange-500 font-black uppercase">{getRankFromPoints(req.points).tier}</div></div></div>
                            <div className="flex gap-2">
                                <button onClick={() => acceptRequest(req.id)} className="p-3 rounded-full bg-green-900/20 text-green-500"><UserCheck className="w-5 h-5" /></button>
                                <button onClick={() => declineRequest(req.id)} className="p-3 rounded-full bg-red-900/20 text-red-500"><UserX className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )) : <div className="text-center py-20 text-slate-500 text-sm">Chưa có lời mời nào</div>}
                </div>
            )}
            {activeTab === 'my' && (
                <div className="space-y-2">
                    {myFriends.length > 0 ? myFriends.map(f => {
                        const isOnline = checkOnlineStatus(f);
                        return (
                            <div key={f.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <AvatarBox avatar={f.avatar} className="w-12 h-12" isOnline={isOnline} />
                                    <div><div className="font-bold text-white">{f.name}</div><div className={`text-[10px] font-black uppercase ${RANK_UI_DATA[getRankFromPoints(f.points).tier].color}`}>{getRankFromPoints(f.points).tier}</div></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setActiveChatFriend(f)} className="p-3 rounded-xl bg-blue-600 text-white relative">
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setFriendToDelete(f)} className="p-3 rounded-xl bg-slate-700/50 text-slate-500"><UserMinus className="w-5 h-5" /></button>
                                </div>
                            </div>
                        );
                    }) : <div className="text-center py-20 text-slate-500 text-sm">Chưa có bạn bè</div>}
                </div>
            )}
            </>
            )}
        </div>
    );
};

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

const HistoryScreen = ({ user }: { user: Player }) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { supabase.from('match_history').select('*').eq('player_id', user.id).order('created_at', { ascending: false }).limit(20).then(({ data }) => { if (data) setMatches(data); setIsLoading(false); }); }, [user.id]);
    return (
        <div className="p-4 max-w-md mx-auto space-y-3 animate-fade-in pb-20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><History className="text-orange-500" /> Lịch sử</h2>
            {isLoading ? <LoadingIndicator message="Đang tải..." /> : matches.length === 0 ? <div className="text-center py-20 text-slate-500">Chưa có dữ liệu</div> : matches.map(m => (
                <div key={m.id} className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${m.result === 'win' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{m.result === 'win' ? 'W' : 'L'}</div><div><div className="text-white font-bold text-sm">vs {m.opponent_name}</div><div className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleDateString()}</div></div></div>
                    <div className={`font-black text-sm ${m.points_delta > 0 ? 'text-green-500' : 'text-red-500'}`}>{m.points_delta > 0 ? `+${m.points_delta}` : m.points_delta}</div>
                </div>
            ))}
        </div>
    );
};

const RulesScreen = () => {
    const [activeTab, setActiveTab] = useState<'pieces' | 'rules' | 'tips'>('pieces');

    const piecesInfo = [
      { piece: 'Tướng', rule: 'Đi ngang/dọc 1 ô trong cung. Hai tướng không được "lộ mặt" (nhìn nhau trực tiếp trên 1 cột).', icon: '帥' },
      { piece: 'Sĩ', rule: 'Đi chéo 1 ô, chỉ được di chuyển trong phạm vi cung.', icon: '仕' },
      { piece: 'Tượng', rule: 'Đi chéo 2 ô (hình điền). Không được qua sông. Bị cản nếu có quân ở giữa (mắt tượng).', icon: '相' },
      { piece: 'Mã', rule: 'Đi hình chữ L (1 thẳng 1 chéo). Bị cản nếu có quân đứng sát hướng đi thẳng (cản chân mã).', icon: '馬' },
      { piece: 'Xe', rule: 'Đi ngang/dọc vô tận nếu không có quân cản. Quân mạnh nhất bàn cờ.', icon: '車' },
      { piece: 'Pháo', rule: 'Đi giống Xe. Khi ăn quân phải nhảy qua đúng 1 quân khác (gọi là "ngòi").', icon: '炮' },
      { piece: 'Tốt', rule: 'Chỉ tiến 1 ô. Sau khi qua sông được đi ngang. Không bao giờ được đi lùi.', icon: '兵' },
    ];

    const generalRules = [
      { title: 'Cung (Cấm thành)', desc: 'Vùng 3x3 ở giữa mỗi bên. Tướng và Sĩ không được ra khỏi vùng này.', icon: <Shield className="w-5 h-5 text-blue-500" /> },
      { title: 'Lộ mặt Tướng', desc: 'Hai tướng tuyệt đối không được đối mặt trực tiếp trên cùng một cột dọc mà không có quân cản ở giữa.', icon: <AlertCircle className="w-5 h-5 text-red-500" /> },
      { title: 'Chiếu Tướng', desc: 'Khi quân của bạn đe dọa ăn Tướng đối phương. Đối phương phải tìm cách giải chiếu ngay lập tức.', icon: <Swords className="w-5 h-5 text-orange-500" /> },
      { title: 'Sát cục (Checkmate)', desc: 'Khi Tướng bị chiếu mà không còn đường thoát hoặc không có quân nào cứu được.', icon: <Flame className="w-5 h-5 text-yellow-500" /> },
    ];

    const strategyTips = [
      { title: 'Khai cuộc nhanh', desc: 'Triển khai Xe, Mã, Pháo sớm để kiểm soát các vị trí trọng yếu. Tránh đi 1 quân nhiều lần.', icon: <Zap className="w-5 h-5 text-cyan-400" /> },
      { title: 'Bảo vệ Tướng', desc: 'Luôn giữ Sĩ, Tượng bên cạnh Tướng. "Sĩ Tượng bền vững mới mong thắng trận".', icon: <Crown className="w-5 h-5 text-purple-400" /> },
      { title: 'Sức mạnh của Xe', desc: 'Xe có tầm hoạt động rộng nhất. Hãy dùng Xe để quấy rối và tạo áp lực lên đối phương.', icon: <Shield className="w-5 h-5 text-green-400" /> },
      { title: 'Pháo cần ngòi', desc: 'Luôn tìm cách tạo "ngòi" cho Pháo. Pháo đứng sau quân mình hoặc quân địch đều có thể tấn công.', icon: <Target className="w-5 h-5 text-red-400" /> },
    ];

    return (
        <div className="p-4 max-w-md mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8 text-red-500" />
                <h2 className="text-2xl font-bold text-white">Luật Chơi & Mẹo</h2>
            </div>

            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                <button 
                  onClick={() => setActiveTab('pieces')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pieces' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  Quân cờ
                </button>
                <button 
                  onClick={() => setActiveTab('rules')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'rules' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  Luật chơi
                </button>
                <button 
                  onClick={() => setActiveTab('tips')}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'tips' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  Mẹo hay
                </button>
            </div>

            <div className="space-y-4">
                {activeTab === 'pieces' && piecesInfo.map((p, i) => (
                    <div key={i} className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-red-500/30 flex-shrink-0 flex items-center justify-center text-red-500 font-chinese text-3xl shadow-lg">
                            {p.icon}
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{p.piece}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">{p.rule}</p>
                        </div>
                    </div>
                ))}

                {activeTab === 'rules' && generalRules.map((r, i) => (
                    <div key={i} className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">
                            {r.icon}
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{r.title}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">{r.desc}</p>
                        </div>
                    </div>
                ))}

                {activeTab === 'tips' && strategyTips.map((t, i) => (
                    <div key={i} className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">
                            {t.icon}
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{t.title}</h4>
                            <p className="text-sm text-slate-400 leading-relaxed italic">{t.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-3xl mt-8">
                <div className="flex items-center gap-2 text-red-500 mb-2">
                    <InfoIcon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Lời khuyên</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                    Cờ tướng là nghệ thuật điều binh khiển tướng. Hãy bình tĩnh quan sát toàn cục diện thay vì chỉ chú trọng vào một quân cờ duy nhất.
                </p>
            </div>
        </div>
    );
};

// Placeholder for Target icon as it was missing from original imports
const Target = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

const RankUpModal = ({ oldTier, oldSub, newTier, newSub, onClose }: any) => (<div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 animate-fade-in"><div className="bg-slate-800 p-10 rounded-3xl border-2 border-yellow-500 text-center animate-scale-up"><h2 className="text-3xl font-black text-yellow-500 mb-4 uppercase">Thăng Hạng!</h2><div className="flex items-center justify-center gap-4 mb-8"><RankIcon tier={oldTier} subRank={oldSub} size="md" /><ChevronRight className="w-8 h-8 text-slate-600" /><RankIcon tier={newTier} subRank={newSub} size="lg" /></div><button onClick={onClose} className="w-full bg-yellow-600 text-white font-bold py-4 rounded-xl uppercase">Tiếp tục</button></div></div>);
const ExitWarningModal = ({ onConfirm, onCancel }: any) => (<div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-6 backdrop-blur-sm"><div className="bg-slate-800 p-8 rounded-3xl border-2 border-red-500/50 text-center"><Octagon className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" /><h2 className="text-xl font-bold text-white mb-2 uppercase">Cảnh báo</h2><p className="text-slate-400 text-xs mb-8">Trận đấu đang diễn ra. Nếu rời đi bạn sẽ thua cuộc.</p><div className="flex flex-col gap-3"><button onClick={onConfirm} className="bg-red-600 py-4 rounded-2xl font-black text-xs uppercase active:scale-95">Rời trận</button><button onClick={onCancel} className="bg-slate-700 py-4 rounded-2xl font-bold text-slate-300 text-xs uppercase active:scale-95">Quay lại</button></div></div></div>);

const Root = () => (<HashRouter><App /></HashRouter>);
export default Root;
