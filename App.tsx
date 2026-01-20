
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Player, RankTier, Move, getRankFromPoints } from './types';
import { DEFAULT_GAME_ICON } from './constants';

// Shared Components
import { SplashLoading, AvatarBox } from './components/Shared';
import { RankUpModal, ExitWarningModal, AlertModal, LogoutConfirmModal } from './components/Modals';
import { Navbar, BottomNav } from './components/Layout';
import { Check, X, Swords } from 'lucide-react';

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

// Helper: Lấy hoặc tạo ID thiết bị cố định
const getPersistentDeviceId = () => {
  let id = localStorage.getItem('chess_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('chess_device_id', id);
  }
  return id;
};

const InvitationNotification = ({ invite, onAccept, onDecline }: { invite: any, onAccept: () => void, onDecline: () => void }) => {
  return (
    <div className="fixed top-20 left-4 right-4 z-[2000] animate-slide-down">
      <div className="bg-slate-900 border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] rounded-3xl p-5 flex flex-col gap-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="relative">
            <AvatarBox avatar={invite.senderAvatar} className="w-14 h-14 border-2 border-slate-700" />
            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1.5 border-2 border-slate-900">
              <Swords className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-black text-sm uppercase tracking-tight leading-none mb-1">Thách Đấu!</h4>
            <p className="text-slate-400 text-xs font-bold leading-tight">
              <span className="text-blue-400">{invite.senderName}</span> mời bạn vào phòng <span className="text-white font-mono">#{invite.roomCode}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onAccept}
            className="flex-1 bg-blue-600 py-3 rounded-2xl flex items-center justify-center gap-2 text-white font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-lg"
          >
            <Check className="w-4 h-4" /> Chấp nhận
          </button>
          <button 
            onClick={onDecline}
            className="w-16 bg-slate-800 py-3 rounded-2xl flex items-center justify-center text-slate-500 active:scale-95 transition-all"
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
  
  // ID định danh duy nhất cho trình duyệt này (Lấy trực tiếp mỗi lần render để nhạy bén với localStorage)
  const deviceId = getPersistentDeviceId();
  
  const isForcedLogoutRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showRankUp, setShowRankUp] = useState<{oldTier: RankTier, oldSub: number, newTier: RankTier, newSub: number} | null>(null);
  const [showExitWarning, setShowExitWarning] = useState<{ type: 'logout' | 'home' | 'back' } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [authAlert, setAuthAlert] = useState<{title: string, message: string} | null>(null);
  
  const [pendingInvite, setPendingInvite] = useState<any>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const isGameActive = location.pathname.includes('/game/') || 
                       location.pathname === '/practice' || 
                       location.pathname === '/matchmaking' ||
                       location.pathname.includes('/replay/');

  useEffect(() => { userRef.current = user; }, [user]);

  // Hàm đăng xuất triệt để
  const performLogout = async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    isLoggingOutRef.current = true;
    setShowLogoutConfirm(false);
    setIsLoggingIn(true);

    try {
        // 1. CẬP NHẬT DATABASE TRƯỚC: Xóa session trên server
        const { error } = await supabase.from('profiles').update({ 
            is_online: false, 
            current_session_id: null 
        }).eq('id', currentUser.id);
        
        if (error) console.error("Database logout cleanup failed:", error);

        // 2. QUAN TRỌNG: Xóa định danh thiết bị trong localStorage để lần sau không tự nhận diện
        localStorage.removeItem('chess_device_id');
        localStorage.removeItem('consecutive_online_losses'); // Xóa cả chuỗi thua
        
    } catch (e) {
        console.error("Logout exception:", e);
    }

    // 3. Đăng xuất khỏi hệ thống Auth
    await supabase.auth.signOut();
    setUser(null);
    setIsLoggingIn(false);
    isLoggingOutRef.current = false;
    navigate('/');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { fetchProfile(session.user.id); } 
      else { setIsAuthLoading(false); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) { 
        if (!userRef.current) fetchProfile(session.user.id); 
      } else { 
        if (event === 'SIGNED_OUT') {
           if (isForcedLogoutRef.current) {
               setAuthAlert({
                 title: "Cảnh báo bảo mật",
                 message: "Tài khoản của bạn vừa được đăng nhập ở một thiết bị khác. Bạn đã được đăng xuất để bảo vệ an toàn."
               });
               isForcedLogoutRef.current = false;
               // Khi bị đá, cũng nên xóa deviceId để đảm bảo sạch sẽ
               localStorage.removeItem('chess_device_id');
           }
        }
        setUser(null); 
        setIsAuthLoading(false);
        setIsLoggingIn(false); 
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const sessionChannel = supabase.channel(`session-monitor-${user.id}`)
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
      }, (payload) => {
          const newData = payload.new;
          // Nếu database có current_session_id mới và khác deviceId hiện tại
          if (newData.current_session_id && newData.current_session_id !== deviceId && !isLoggingOutRef.current) {
              isForcedLogoutRef.current = true;
              supabase.auth.signOut();
          }
      })
      .subscribe();

    const inviteChannel = supabase.channel(`invites-${user.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, async (payload) => {
        const msg = payload.new;
        let inviteData = null;
        try {
            const parsed = JSON.parse(msg.content);
            if (parsed && parsed.type === 'invite') inviteData = parsed;
        } catch (e) {}

        if (inviteData) {
          const { data: sender } = await supabase.from('profiles').select('name, avatar').eq('id', msg.sender_id).single();
          if (sender) {
            setPendingInvite({
              senderId: msg.sender_id,
              senderName: sender.name,
              senderAvatar: sender.avatar,
              roomCode: inviteData.roomCode,
              roomId: inviteData.roomId
            });
            setTimeout(() => setPendingInvite(null), 20000);
          }
        }
      })
      .subscribe();

    return () => { 
        sessionChannel.unsubscribe();
        inviteChannel.unsubscribe(); 
    };
  }, [user?.id, deviceId]);

  useEffect(() => {
    if (!user) return;

    const updateOnlineStatus = async (status: boolean) => {
      if (isLoggingOutRef.current && status) return;
      try {
        await supabase.from('profiles').update({ 
          is_online: status, 
          last_seen: new Date().toISOString() 
        }).eq('id', user.id);
      } catch (e) { }
    };

    updateOnlineStatus(true);
    const interval = setInterval(() => updateOnlineStatus(true), 45000);
    
    const handleUnload = () => {
        updateOnlineStatus(false);
    };
    window.addEventListener('beforeunload', handleUnload);
    
    const handleVisibilityChange = () => { 
        if (isLoggingOutRef.current) return;
        if (document.visibilityState === 'visible') updateOnlineStatus(true); 
        else updateOnlineStatus(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (!isLoggingOutRef.current) updateOnlineStatus(false);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
          await supabase.auth.signOut();
          setUser(null);
          return;
      }

      if (data) {
        // Ghi đè current_session_id của thiết bị hiện tại
        await supabase.from('profiles').update({ 
            current_session_id: deviceId,
            is_online: true,
            last_seen: new Date().toISOString()
        }).eq('id', userId);

        const { tier, subRank } = getRankFromPoints(data.points || 0);
        setUser({
          id: data.id,
          name: data.name,
          avatar: data.avatar || DEFAULT_GAME_ICON,
          points: data.points || 0,
          wins: data.wins || 0,
          losses: data.losses || 0,
          onlineMatches: 0, 
          rankTier: tier,
          subRank: subRank
        });
      } else {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
            const metadataName = authUser.user.user_metadata?.name || 'Kỳ Thủ Mới';
            
            const newProfile = {
                id: userId,
                name: metadataName,
                email: authUser.user.email,
                avatar: DEFAULT_GAME_ICON,
                points: 1200,
                rank_tier: 'Đồng',
                sub_rank: 5,
                current_session_id: deviceId,
                is_online: true
            };

            // Thực hiện insert
            const { error: insertError } = await supabase.from('profiles').insert([newProfile]);

            // Nếu lỗi (có thể do trùng tên hoặc constraint sót lại), thử lại với tên có suffix
            if (insertError) {
                console.warn("Profile creation error, retrying with suffix:", insertError);
                const suffix = Math.floor(1000 + Math.random() * 9000);
                await supabase.from('profiles').insert([{
                    ...newProfile,
                    name: `${metadataName}#${suffix}`
                }]);
            }

            return fetchProfile(userId);
        }
        await supabase.auth.signOut();
        setUser(null);
      }
    } catch (err: any) {
      await supabase.auth.signOut();
      setUser(null);
    } finally { 
      setIsAuthLoading(false);
      setIsLoggingIn(false);
    }
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

  const handleAcceptInvite = () => {
    if (pendingInvite) {
      navigate(`/room?join=${pendingInvite.roomCode}`);
      setPendingInvite(null);
    }
  };

  const updateStats = useCallback(async (result: 'win' | 'loss', moves: Move[], opponent: string, reason?: string): Promise<number> => {
    const currentUser = userRef.current;
    if (!currentUser) return 0;
    
    // Check if it's a real online match or a bot match in disguise
    const isRoomMatch = window.location.hash.includes('mode=room') || location.search.includes('mode=room');
    const isBotMatch = location.search.includes('bot=true');
    const isRanked = !isRoomMatch; // Online ranked or Bot ranked (pity system)
    
    let historyMode = isRoomMatch ? 'room' : 'online';
    let delta = 0;
    
    // Logic theo dõi chuỗi thua cho đấu ghép (Ranked)
    if (isRanked) {
        const currentLossStreak = parseInt(localStorage.getItem('consecutive_online_losses') || '0', 10);
        if (result === 'loss') {
            localStorage.setItem('consecutive_online_losses', (currentLossStreak + 1).toString());
        } else if (result === 'win') {
            localStorage.setItem('consecutive_online_losses', '0');
        }
    }

    if (isRanked) {
        let latestProfile = null;
        try {
            const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
            latestProfile = data;
        } catch(e) { }
        const currentPoints = latestProfile?.points ?? currentUser.points;
        const { tier: oldTier, subRank: oldSub } = getRankFromPoints(currentPoints);
        delta = result === 'win' ? 25 : -15;
        const newPoints = Math.max(0, currentPoints + delta);
        const { tier: newTier, subRank: newSub } = getRankFromPoints(newPoints);
        try {
            await supabase.from('profiles').update({
              points: newPoints,
              wins: (latestProfile?.wins || 0) + (result === 'win' ? 1 : 0),
              losses: (latestProfile?.losses || 0) + (result === 'loss' ? 1 : 0),
              rank_tier: newTier,
              sub_rank: newSub,
              updated_at: new Date().toISOString()
            }).eq('id', currentUser.id);
            await fetchProfile(currentUser.id);
            if (newTier !== oldTier || (newTier === oldTier && newSub < oldSub)) { 
                if (newPoints > currentPoints) setShowRankUp({ oldTier, oldSub, newTier, newSub }); 
            }
        } catch (error) { }
    }
    try {
        await supabase.from('matches').insert([{ 
            player_id: currentUser.id, 
            opponent_name: opponent, 
            result, 
            mode: historyMode, 
            points_delta: delta
        }]);
    } catch (error) { }
    return delta;
  }, [location.search]);

  if (isAuthLoading) return <SplashLoading />;

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col text-slate-200">
      {isLoggingIn && <SplashLoading message="Đang xử lý..." />}
      
      {showRankUp && <RankUpModal {...showRankUp} onClose={() => setShowRankUp(null)} />}
      {showExitWarning && <ExitWarningModal onConfirm={async () => { if (showExitWarning.type === 'logout') await performLogout(); setShowExitWarning(null); navigate('/'); }} onCancel={() => setShowExitWarning(null)} />}
      {showLogoutConfirm && <LogoutConfirmModal onConfirm={performLogout} onCancel={() => setShowLogoutConfirm(false)} />}
      {authAlert && <AlertModal title={authAlert.title} message={authAlert.message} type="info" onClose={() => setAuthAlert(null)} />}
      
      {pendingInvite && !isGameActive && (
        <InvitationNotification 
          invite={pendingInvite} 
          onAccept={handleAcceptInvite} 
          onDecline={() => setPendingInvite(null)} 
        />
      )}

      <Navbar user={user} onLogout={() => isGameActive ? setShowExitWarning({ type: 'logout' }) : setShowLogoutConfirm(true)} onNavigateHome={() => isGameActive ? setShowExitWarning({ type: 'home' }) : navigate('/')} />
      <div className="flex-1 overflow-y-auto pb-4">
        <Routes>
          <Route path="/" element={user ? <HomeScreen user={user} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/practice" element={<GameScreen mode="ai" user={user || undefined} onGameEnd={updateStats} />} />
          <Route path="/matchmaking" element={user ? <MatchmakingScreen user={user} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/room" element={user ? <RoomLobbyScreen user={user} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/game/online/:roomId" element={user ? <GameScreen mode="online" user={user} onGameEnd={updateStats} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/leaderboard" element={<LeaderboardScreen user={user} />} />
          <Route path="/rules" element={<RulesScreen />} />
          <Route path="/friends" element={user ? <FriendsScreen user={user} /> : <Navigate to="/" />} />
          <Route path="/history" element={user ? <HistoryScreen user={user} /> : <Navigate to="/" />} />
          <Route path="/profile" element={user ? <ProfileScreen user={user} onUpdateAvatar={updateAvatar} onUpdateName={updateName} onLogout={() => setShowLogoutConfirm(true)} /> : <AuthScreen onLoginStart={() => setIsLoggingIn(true)} onLoginError={() => setIsLoggingIn(false)} />} />
          <Route path="/replay/:id" element={user ? <ReplayScreen /> : <Navigate to="/" />} />
        </Routes>
      </div>
      {user && !isGameActive && <BottomNav />}
    </div>
  );
};

const Root = () => (<HashRouter><App /></HashRouter>);
export default Root;
