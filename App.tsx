
import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Player, RankTier, Move, getRankFromPoints, RANK_ORDER } from './types';
import { DEFAULT_GAME_ICON } from './constants';

// Shared Components
import { SplashLoading, AvatarBox } from './components/Shared';
import { RankUpModal, ExitWarningModal, AlertModal, LogoutConfirmModal } from './components/Modals';
import { Navbar, BottomNav } from './components/Layout';
import NetworkStatus from './components/NetworkStatus';
import { Check, X, Swords, Bell, MessageSquare } from 'lucide-react';

// Screens
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import MatchmakingScreen from './screens/MatchmakingScreen';
import RoomLobbyScreen from './screens/RoomLobbyScreen';
import { GameScreen } from './screens/GameScreen';
import ProfileScreen from './screens/ProfileScreen';
import FriendsScreen from './screens/FriendsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import HistoryScreen from './screens/HistoryScreen';
import RulesScreen from './screens/RulesScreen';
import ReplayScreen from './screens/ReplayScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';

const getPersistentDeviceId = () => {
  let id = localStorage.getItem('chess_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('chess_device_id', id);
  }
  return id;
};

const ToastNotification = ({ toast, onClear }: { toast: any, onClear: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClear, 4000);
        return () => clearTimeout(timer);
    }, [onClear]);

    return (
        <div 
          onClick={onClear}
          className="fixed top-24 left-4 right-4 z-[3000] animate-slide-down bg-slate-900/90 border border-blue-500/30 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex items-center gap-4 active:scale-95 transition-transform cursor-pointer"
        >
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
                {toast.type === 'message' ? <MessageSquare className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-0.5">
                    {toast.type === 'message' ? 'Tin nhắn mới' : 'Thông báo'}
                </div>
                <div className="text-xs font-bold text-white truncate">{toast.content}</div>
            </div>
        </div>
    );
};

const InvitationNotification = ({ invite, onAccept, onDecline }: { invite: any, onAccept: () => void, onDecline: () => void }) => {
  return (
    <div className="fixed top-20 left-4 right-4 z-[5000] animate-slide-down">
      <div className="bg-slate-900 border-2 border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.4)] rounded-3xl p-5 flex flex-col gap-4 backdrop-blur-lg">
        <div className="flex items-center gap-4">
          <div className="relative">
            <AvatarBox avatar={invite.senderAvatar} className="w-14 h-14 border-2 border-slate-700 shadow-lg" />
            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-2 border-slate-900">
              <Swords className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-white font-black text-sm uppercase tracking-tight leading-none mb-1">Thách Đấu!</h4>
            <p className="text-slate-400 text-xs font-bold leading-tight truncate">
              <span className="text-blue-400">{invite.senderName || 'Kỳ thủ'}</span> mời bạn vào phòng <span className="text-white font-mono">#{invite.roomCode}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onAccept}
            className="flex-1 bg-blue-600 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-white font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg hover:bg-blue-500"
          >
            <Check className="w-4 h-4" /> Chấp nhận
          </button>
          <button 
            onClick={onDecline}
            className="w-16 bg-slate-800 py-3.5 rounded-2xl flex items-center justify-center text-slate-500 active:scale-95 transition-all hover:bg-slate-700 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<Player | null>(null);
  const userRef = useRef<Player | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const deviceId = getPersistentDeviceId();
  const isForcedLogoutRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showRankUp, setShowRankUp] = useState<{oldTier: RankTier, oldSub: number, newTier: RankTier, newSub: number} | null>(null);
  const [showExitWarning, setShowExitWarning] = useState<{ type: 'logout' | 'home' | 'back' } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [authAlert, setAuthAlert] = useState<{title: string, message: string, type?: 'info' | 'error' | 'success'} | null>(null);
  
  const [pendingInvite, setPendingInvite] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);
  
  const [totalNotifications, setTotalNotifications] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();
  
  const isGameActive = location.pathname.includes('/game/') || 
                       location.pathname === '/practice' || 
                       location.pathname === '/matchmaking' || 
                       location.pathname === '/room' ||
                       location.pathname.includes('/replay/');

  const isUserBusy = location.pathname.includes('/game/') || location.pathname === '/matchmaking';
  const isUserBusyRef = useRef(isUserBusy);
  const isGameActiveRef = useRef(isGameActive);

  useEffect(() => {
    isUserBusyRef.current = isUserBusy;
    isGameActiveRef.current = isGameActive;
  }, [isUserBusy, isGameActive]);

  useEffect(() => { userRef.current = user; }, [user]);

  const updateNotificationCounts = useCallback(async () => {
      const currentUser = userRef.current;
      if (!currentUser) return;
      try {
          const { count: reqCount } = await supabase.from('friendships').select('*', { count: 'exact', head: true }).eq('friend_id', currentUser.id).eq('status', 'pending');
          const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_id', currentUser.id).eq('is_read', false);
          setTotalNotifications((reqCount || 0) + (msgCount || 0));
      } catch (e) {}
  }, []);

  const performLogout = async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    isLoggingOutRef.current = true;
    setShowLogoutConfirm(false);
    setIsLoggingIn(true);
    try {
        if (!isForcedLogoutRef.current) {
            await supabase.from('profiles').update({ is_online: false, current_session_id: null }).eq('id', currentUser.id);
        }
    } catch (e) {}
    await supabase.auth.signOut();
    setUser(null);
    setIsLoggingIn(false);
    isLoggingOutRef.current = false;
    navigate('/');
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) {
        // Cập nhật session ID ngay khi fetch thành công để chiếm quyền session
        await supabase.from('profiles').update({ current_session_id: deviceId, is_online: true }).eq('id', userId);
        
        const { tier, subRank } = getRankFromPoints(data.points || 0);
        setUser({ id: data.id, name: data.name, avatar: data.avatar || DEFAULT_GAME_ICON, points: data.points || 0, wins: data.wins || 0, losses: data.losses || 0, onlineMatches: 0, rankTier: tier, subRank: subRank });

        // KIỂM TRA ACTIVE GAME ĐỂ REDIRECT NGAY LẬP TỨC TRƯỚC KHI TẮT LOADING
        const { data: activeRoom } = await supabase.from('rooms')
            .select('id')
            .or(`red_player_id.eq.${userId},black_player_id.eq.${userId}`)
            .eq('status', 'playing')
            .maybeSingle();

        if (activeRoom) {
            navigate(`/game/online/${activeRoom.id}`);
        }
      } 
      setIsAuthLoading(false);
    } catch (err) { setIsAuthLoading(false); } finally { setIsLoggingIn(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchProfile(session.user.id);
      else setIsAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { if (!userRef.current) fetchProfile(session.user.id); } 
      else { setUser(null); setIsAuthLoading(false); setIsLoggingIn(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- LOGIC CẬP NHẬT ONLINE & SESSION CHECK ---
  
  const updateOnlineStatus = useCallback(async (status: boolean) => {
    if (isLoggingOutRef.current || isForcedLogoutRef.current) return;
    if (!userRef.current) return;
    try { 
      await supabase.from('profiles')
          .update({ is_online: status, last_seen: new Date().toISOString() })
          .eq('id', userRef.current.id); 
    } catch (e) { }
  }, []);

  const verifySessionId = useCallback(async () => {
      if (isLoggingOutRef.current || isForcedLogoutRef.current || !userRef.current) return;
      const { data } = await supabase.from('profiles').select('current_session_id').eq('id', userRef.current.id).single();
      if (data?.current_session_id && data.current_session_id !== deviceId) {
          if (isForcedLogoutRef.current) return;
          isForcedLogoutRef.current = true;
          setAuthAlert({ title: "Phiên đăng nhập hết hạn", message: "Tài khoản của bạn đã đăng nhập trên thiết bị khác.", type: 'error' });
          setTimeout(() => performLogout(), 1500);
      }
  }, [deviceId]);

  useEffect(() => {
    if (!user) return;
    updateOnlineStatus(true);
    const interval = setInterval(() => updateOnlineStatus(true), 30000);
    const handleInteraction = () => {
        if (document.visibilityState === 'visible') {
            updateOnlineStatus(true);
            verifySessionId();
        }
    };
    document.addEventListener('visibilitychange', handleInteraction);
    window.addEventListener('focus', handleInteraction);
    const securityChannel = supabase.channel(`security-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, async () => { await verifySessionId(); })
      .subscribe();
    return () => { 
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleInteraction);
        window.removeEventListener('focus', handleInteraction);
        securityChannel.unsubscribe();
        if (!isLoggingOutRef.current) updateOnlineStatus(false);
    };
  }, [user?.id, updateOnlineStatus, verifySessionId]);


  // --- HỆ THỐNG REALTIME (BROADCAST + DATABASE) ---
  useEffect(() => {
    if (!user) return;
    
    updateNotificationCounts();

    const channelName = `invites-${user.id}`;
    const inviteChannel = supabase.channel(channelName);

    inviteChannel
      .on('broadcast', { event: 'game-invite' }, (payload) => {
          if (isUserBusyRef.current) return;
          const data = payload.payload;
          const inviteId = `invite-${data.senderId}-${data.roomCode}`;
          setPendingInvite({
              id: inviteId,
              senderId: data.senderId,
              senderName: data.senderName,
              senderAvatar: data.senderAvatar,
              roomCode: data.roomCode,
              roomId: data.roomId
          });
          setTimeout(() => {
              setPendingInvite((prev: any) => (prev && prev.id === inviteId ? null : prev));
          }, 20000);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, async (payload) => {
          const msg = payload.new;
          let content: any = null;
          try { content = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content; } catch(e){}

          if (content && content.type === 'invite') {
              if (isUserBusyRef.current) return;
              let senderName = content.senderName;
              let senderAvatar = content.senderAvatar;
              if (!senderName) {
                  try {
                      const { data: profile } = await supabase.from('profiles').select('name, avatar').eq('id', msg.sender_id).single();
                      if (profile) { senderName = profile.name; senderAvatar = profile.avatar; }
                  } catch (e) {}
              }
              setPendingInvite((prev: any) => {
                  if (prev && prev.roomCode === content.roomCode) return prev;
                  return {
                      id: msg.id,
                      senderId: msg.sender_id,
                      senderName: senderName || 'Kỳ thủ',
                      senderAvatar: senderAvatar || DEFAULT_GAME_ICON,
                      roomCode: content.roomCode,
                      roomId: content.roomId
                  };
              });
              return;
          }
          setTotalNotifications(prev => prev + 1);
          if (!isGameActiveRef.current) {
              setToast({ type: 'message', content: `Bạn có tin nhắn mới` });
          }
      })
      .subscribe();
      
    const friendChannel = supabase.channel(`friends-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => updateNotificationCounts())
      .subscribe();

    return () => { 
        supabase.removeChannel(inviteChannel); 
        supabase.removeChannel(friendChannel); 
    };
  }, [user?.id, updateNotificationCounts]);

  // --- GAME END LOGIC & ELO CALCULATION ---
  const handleGameEnd = async (
    result: 'win' | 'loss' | 'draw', 
    moves: Move[], 
    opponentName: string, 
    opponentPoints: number,
    reason?: string,
    mode: 'online' | 'ai' | 'room' = 'online'
  ): Promise<number> => {
    if (!user) return 0;

    // Chỉ tính điểm (Ranked) cho chế độ Online Matchmaking
    // Chế độ 'room' và 'ai' là Unranked -> Chỉ lưu lịch sử, không cộng trừ điểm
    if (mode === 'ai' || mode === 'room') {
        try {
            await supabase.from('matches').insert([{
                player_id: user.id,
                opponent_name: opponentName,
                result: result,
                points_delta: 0,
                moves: moves,
                mode: mode,
                created_at: new Date().toISOString()
            }]);
        } catch (e) {
            console.error("Lỗi lưu lịch sử đấu (Unranked):", e);
        }
        return 0; // Trả về delta = 0
    }

    // 1. Tính toán Elo (Đơn giản hóa) cho chế độ Online
    const K = 32; // Hệ số K
    const expectedScore = 1 / (1 + Math.pow(10, (opponentPoints - user.points) / 400));
    
    let actualScore = 0;
    if (result === 'win') actualScore = 1;
    else if (result === 'draw') actualScore = 0.5;
    else actualScore = 0;

    let delta = Math.round(K * (actualScore - expectedScore));

    // Điều chỉnh UX: Thắng luôn có điểm, thua thì trừ điểm
    if (result === 'win' && delta <= 0) delta = 5; 
    if (result === 'loss' && delta >= 0) delta = -5;
    if (result === 'draw') delta = Math.max(-5, Math.min(5, delta));

    // 2. Tính toán Stats mới
    const newPoints = Math.max(0, user.points + delta);
    const newWins = user.wins + (result === 'win' ? 1 : 0);
    const newLosses = user.losses + (result === 'loss' ? 1 : 0);

    // 3. Cập nhật vào Supabase
    try {
        await supabase.from('profiles').update({
            points: newPoints,
            wins: newWins,
            losses: newLosses
        }).eq('id', user.id);

        await supabase.from('matches').insert([{
            player_id: user.id,
            opponent_name: opponentName,
            result: result,
            points_delta: delta,
            moves: moves,
            mode: mode,
            created_at: new Date().toISOString()
        }]);
    } catch (e) {
        console.error("Lỗi cập nhật kết quả:", e);
    }

    // 4. Cập nhật State Local
    const oldRank = user.rankTier;
    const oldSub = user.subRank;
    const { tier: newRank, subRank: newSubRank } = getRankFromPoints(newPoints);

    setUser(prev => prev ? ({
        ...prev,
        points: newPoints,
        wins: newWins,
        losses: newLosses,
        rankTier: newRank,
        subRank: newSubRank
    }) : null);

    // 5. Kiểm tra Thăng hạng
    const rankIndexOld = RANK_ORDER.indexOf(oldRank);
    const rankIndexNew = RANK_ORDER.indexOf(newRank);

    if (rankIndexNew > rankIndexOld || (rankIndexNew === rankIndexOld && newSubRank > oldSub)) { 
        setShowRankUp({ oldTier: oldRank, oldSub, newTier: newRank, newSub: newSubRank });
    }

    return delta;
  };

  const updateAvatar = async (newAvatar: string) => { if (user) { await supabase.from('profiles').update({ avatar: newAvatar }).eq('id', user.id); setUser({ ...user, avatar: newAvatar }); } };
  const updateName = async (newName: string) => { if (user && newName.trim()) { await supabase.from('profiles').update({ name: newName.trim() }).eq('id', user.id); setUser({ ...user, name: newName.trim() }); } };
  
  const handleAcceptInvite = () => { 
      if (pendingInvite) { 
          const code = pendingInvite.roomCode; 
          setPendingInvite(null); 
          navigate(`/room?join=${code}&t=${Date.now()}`); 
      } 
  };

  if (isAuthLoading) return <SplashLoading />;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-200">
      <style>{`
        @keyframes slide-down { 0% { transform: translateY(-100%) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        .animate-slide-down { animation: slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
      <NetworkStatus />
      {isLoggingIn && <SplashLoading message="Đang xử lý..." />}
      {showRankUp && <RankUpModal {...showRankUp} onClose={() => setShowRankUp(null)} />}
      {showExitWarning && <ExitWarningModal onConfirm={() => navigate('/')} onCancel={() => setShowExitWarning(null)} />}
      {showLogoutConfirm && <LogoutConfirmModal onConfirm={performLogout} onCancel={() => setShowLogoutConfirm(false)} />}
      {authAlert && <AlertModal title={authAlert.title} message={authAlert.message} type={authAlert.type || 'info'} onClose={() => setAuthAlert(null)} />}
      {toast && <ToastNotification toast={toast} onClear={() => setToast(null)} />}
      {pendingInvite && <InvitationNotification invite={pendingInvite} onAccept={handleAcceptInvite} onDecline={() => setPendingInvite(null)} />}
      <Navbar user={user} onLogout={() => isGameActive ? setShowExitWarning({ type: 'logout' }) : setShowLogoutConfirm(true)} />
      <main ref={scrollContainerRef} id="main-scroll-container" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Routes>
          <Route path="/" element={user ? <HomeScreen user={user} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/practice" element={<GameScreen mode="ai" user={user || undefined} onGameEnd={(r, m, o, p, re, mode) => handleGameEnd(r, m, o, p, re, mode)} />} />
          <Route path="/matchmaking" element={user ? <MatchmakingScreen user={user} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/room" element={user ? <RoomLobbyScreen user={user} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/game/online/:roomId" element={user ? <GameScreen mode="online" user={user} onGameEnd={(r, m, o, p, re, mode) => handleGameEnd(r, m, o, p, re, mode)} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/leaderboard" element={<LeaderboardScreen user={user} />} />
          <Route path="/rules" element={<RulesScreen />} />
          <Route path="/friends" element={user ? <FriendsScreen user={user} onRefreshCounts={updateNotificationCounts} /> : <Navigate to="/" />} />
          <Route path="/history" element={user ? <HistoryScreen user={user} /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <ProfileScreen user={user} onUpdateAvatar={updateAvatar} onUpdateName={updateName} onLogout={() => setShowLogoutConfirm(true)} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/change-password" element={user ? <ChangePasswordScreen /> : <Navigate to="/" />} />
          <Route path="/replay/:id" element={user ? <ReplayScreen /> : <Navigate to="/" />} />
        </Routes>
      </main>
      {user && !isGameActive && <BottomNav unreadCount={totalNotifications} />}
    </div>
  );
};

const Root = () => (<HashRouter><App /></HashRouter>);
export default Root;
