
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player } from '../types';
import { INITIAL_BOARD_SETUP } from '../services/xiangqiRules';
import { CheckCircle2, XCircle } from 'lucide-react';

const FOREIGN_BOT_NAMES = [
   "张伟", "李娜", "王芳", "陈静", 
    "김지훈", "박서jun", "이영희", 
    "佐藤 健", "田中 結衣", "鈴木 一郎", 
    "Robert J. Miller", "Sarah Henderson", "Alex Thompson", "Emily Watson", 
    "John Smith", "David Wilson", "Emma Stone", "Sophia Brown"
];

const MatchmakingScreen = ({ user }: { user: Player }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'searching' | 'found' | 'failed'>('searching');
  const statusRef = useRef<'searching' | 'found' | 'failed'>('searching');
  const [timeLeft, setTimeLeft] = useState(30);
  const roomIdRef = useRef<string | null>(null);

  // Đồng bộ ref với state để dùng trong interval/cleanup
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Logic xóa phòng khi thất bại
  useEffect(() => {
    if (status === 'failed' && roomIdRef.current) {
        console.log("Matchmaking failed, deleting auto-created room:", roomIdRef.current);
        supabase.from('rooms')
            .delete()
            .eq('id', roomIdRef.current)
            .eq('status', 'waiting')
            .is('code', null) // Chỉ xóa phòng online (không mã)
            .then();
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'searching') return;
    let isSubscribed = true;
    let channel: any = null;

    const findMatch = async () => {
      // KIỂM TRA CHUỖI THUA - PITY SYSTEM
      const lossStreak = parseInt(localStorage.getItem('consecutive_online_losses') || '0', 10);
      
      if (lossStreak >= 3) {
          await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
          if (!isSubscribed || statusRef.current !== 'searching') return;
          
          const randomBotName = FOREIGN_BOT_NAMES[Math.floor(Math.random() * FOREIGN_BOT_NAMES.length)];
          setStatus('found');
          const fakeRoomId = `pity-match-${Date.now()}`;
          setTimeout(() => navigate(`/game/online/${fakeRoomId}?bot=true&botName=${encodeURIComponent(randomBotName)}`), 2000);
          return;
      }

      // NẾU KHÔNG PHẢI BOT MATCH, TIẾP TỤC LOGIC TÌM PHÒNG BÌNH THƯỜNG
      await new Promise(r => setTimeout(r, 1000));
      if (!isSubscribed || statusRef.current !== 'searching') return;

      const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .is('code', null)
        .is('black_player_id', null)
        .neq('red_player_id', user.id)
        .limit(1);

      if (rooms && rooms.length > 0) {
        const room = rooms[0];
        const { data, error } = await supabase
          .from('rooms')
          .update({ 
            black_player_id: user.id, 
            status: 'playing', 
            board_state: INITIAL_BOARD_SETUP, 
            turn: 'red',
            created_at: new Date().toISOString()
          })
          .eq('id', room.id)
          .eq('status', 'waiting')
          .is('black_player_id', null)
          .select();

        if (data && data.length > 0 && !error) {
          setStatus('found');
          setTimeout(() => navigate(`/game/online/${room.id}`), 2000);
          return;
        } else {
          setTimeout(findMatch, 1000);
          return;
        }
      } else {
        // Tạo phòng chờ mới nếu không có phòng nào sẵn dùng
        const { data: newRoom, error: createError } = await supabase
          .from('rooms')
          .insert([{ 
            red_player_id: user.id, 
            status: 'waiting', 
            code: null 
          }])
          .select()
          .single();

        if (newRoom && !createError && isSubscribed) {
          roomIdRef.current = newRoom.id;
          channel = supabase.channel(`room-wait-${newRoom.id}`)
            .on('postgres_changes', { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'rooms', 
              filter: `id=eq.${newRoom.id}` 
            }, (p) => {
              if (p.new.status === 'playing' && p.new.black_player_id) {
                setStatus('found');
                setTimeout(() => navigate(`/game/online/${newRoom.id}`), 2000);
              }
            })
            .subscribe();
        } else {
           setTimeout(findMatch, 2000);
        }
      }
    };

    findMatch();

    const timer = setInterval(() => { 
      setTimeLeft((prev) => { 
        if (prev <= 1) { 
          clearInterval(timer); 
          // Kiểm tra xem vẫn đang searching thì mới báo failed
          if (statusRef.current === 'searching') {
            setStatus('failed');
          }
          return 0; 
        } 
        return prev - 1; 
      }); 
    }, 1000);

    return () => { 
      isSubscribed = false; 
      clearInterval(timer); 
      if (channel) channel.unsubscribe();
      // Nếu rời khỏi màn hình khi đang tìm kiếm, hãy xóa phòng
      if (statusRef.current === 'searching' && roomIdRef.current) {
         supabase.from('rooms')
            .delete()
            .eq('id', roomIdRef.current)
            .eq('status', 'waiting')
            .is('code', null)
            .then();
      }
    };
  }, [user.id, status, navigate]);

  const handleCancel = async () => {
    if (roomIdRef.current) {
        await supabase.from('rooms')
            .delete()
            .eq('id', roomIdRef.current)
            .eq('status', 'waiting')
            .is('code', null);
    }
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-center animate-fade-in">
      <div className={`relative w-40 h-40 mb-8 flex items-center justify-center`}>
          <div className={`absolute inset-0 border-4 ${status === 'found' ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : status === 'failed' ? 'border-red-500' : 'border-blue-500 border-t-transparent'} rounded-full ${status === 'searching' ? 'animate-spin' : ''}`}></div>
          <span className={`text-4xl font-black ${status === 'found' ? 'text-green-500' : status === 'failed' ? 'text-red-500' : 'text-blue-500'}`}>
            {status === 'found' ? <CheckCircle2 className="w-16 h-16" /> : status === 'failed' ? <XCircle className="w-16 h-16" /> : timeLeft}
          </span>
      </div>
      <h2 className="text-2xl font-black text-white uppercase mb-2">
        {status === 'searching' ? 'Đang ghép trận...' : status === 'found' ? 'Tìm thấy đối thủ!' : 'Không tìm thấy ai!'}
      </h2>
      <p className="text-slate-500 text-xs uppercase tracking-widest">
        {status === 'searching' ? 'Hệ thống đang tìm đối thủ xứng tầm' : status === 'found' ? 'Đang chuẩn bị bàn cờ...' : 'Vui lòng thử lại sau'}
      </p>
      <button onClick={handleCancel} className="text-slate-500 font-bold hover:text-white transition-colors mt-12 bg-slate-800/50 px-8 py-3 rounded-full border border-slate-700 active:scale-95">Hủy tìm kiếm</button>
    </div>
  );
};

export default MatchmakingScreen;
