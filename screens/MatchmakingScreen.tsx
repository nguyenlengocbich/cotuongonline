
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Player } from '../types';
import { INITIAL_BOARD_SETUP } from '../services/xiangqiRules';
import { CheckCircle2, XCircle } from 'lucide-react';

const MatchmakingScreen = ({ user }: { user: Player }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'searching' | 'found' | 'failed'>('searching');
  const [timeLeft, setTimeLeft] = useState(30);
  const roomIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'searching') return;
    let isSubscribed = true;
    let channel: any = null;

    const findMatch = async () => {
      // KIỂM TRA CHUỖI THUA - PITY SYSTEM
      const lossStreak = parseInt(localStorage.getItem('consecutive_online_losses') || '0', 10);
      
      if (lossStreak >= 3) {
          // Giả lập tìm kiếm một chút
          await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
          
          if (!isSubscribed) return;
          
          // Giả lập tìm thấy trận
          setStatus('found');
          // Chuyển hướng sang trang game với flag bot=true
          const fakeRoomId = `bot-match-${Date.now()}`;
          setTimeout(() => navigate(`/game/online/${fakeRoomId}?bot=true`), 2000);
          return;
      }

      // NẾU KHÔNG PHẢI BOT MATCH, TIẾP TỤC LOGIC TÌM PHÒNG BÌNH THƯỜNG
      // 1. Thêm một chút delay ngẫu nhiên (jitter) để tránh 2 người cùng tìm thấy 1 phòng cùng 1 lúc 100%
      await new Promise(r => setTimeout(r, Math.random() * 1000));
      
      if (!isSubscribed) return;

      // 2. Tìm phòng đang chờ
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
        // 3. ATOMIC UPDATE: Chỉ join nếu phòng VẪN ĐANG TRỐNG
        const { data, error } = await supabase
          .from('rooms')
          .update({ 
            black_player_id: user.id, 
            status: 'playing', 
            board_state: INITIAL_BOARD_SETUP, 
            turn: 'red',
            created_at: new Date().toISOString() // Cập nhật thời gian bắt đầu
          })
          .eq('id', room.id)
          .eq('status', 'waiting') // Điều kiện quan trọng: phòng phải chưa ai join
          .is('black_player_id', null)
          .select();

        if (data && data.length > 0 && !error) {
          // Join thành công
          setStatus('found');
          setTimeout(() => navigate(`/game/online/${room.id}`), 2000);
          return;
        } else {
          // Có người khác đã join trước hoặc lỗi, thử tìm lại sau 1s
          setTimeout(findMatch, 1000);
          return;
        }
      } else {
        // 4. Không thấy phòng, tạo phòng mới và làm Red Player
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
              // Kiểm tra xem có Black Player join chưa
              if (p.new.status === 'playing' && p.new.black_player_id) {
                setStatus('found');
                setTimeout(() => navigate(`/game/online/${newRoom.id}`), 2000);
              }
            })
            .subscribe();
        } else {
           // Lỗi tạo phòng, thử lại
           setTimeout(findMatch, 2000);
        }
      }
    };

    findMatch();
    const timer = setInterval(() => { 
      setTimeLeft((prev) => { 
        if (prev <= 1) { 
          clearInterval(timer); 
          if (status === 'searching') setStatus('failed'); 
          return 0; 
        } 
        return prev - 1; 
      }); 
    }, 1000);

    return () => { 
      isSubscribed = false; 
      clearInterval(timer); 
      if (channel) channel.unsubscribe();
      
      // Cleanup: Nếu component unmount (ví dụ bấm Back browser) khi đang tìm
      // thì xóa phòng đã tạo
      if (status === 'searching' && roomIdRef.current) {
         supabase.from('rooms')
            .delete()
            .eq('id', roomIdRef.current)
            .eq('status', 'waiting') // Chỉ xóa nếu vẫn đang waiting
            .then();
      }
    };
  }, [user.id, status, navigate]);

  const handleCancel = async () => {
    // 1. Nếu đã tạo phòng và đang chờ, xóa phòng đó ngay lập tức
    if (roomIdRef.current) {
        await supabase.from('rooms')
            .delete()
            .eq('id', roomIdRef.current)
            .eq('status', 'waiting');
    }
    // 2. Điều hướng về trang chủ
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
        {status === 'searching' ? 'Hệ thống đang tìm kỳ thủ xứng tầm' : status === 'found' ? 'Đang chuẩn bị bàn cờ...' : 'Vui lòng thử lại sau'}
      </p>
      <button onClick={handleCancel} className="text-slate-500 font-bold hover:text-white transition-colors mt-12 bg-slate-800/50 px-8 py-3 rounded-full border border-slate-700 active:scale-95">Hủy tìm kiếm</button>
    </div>
  );
};

export default MatchmakingScreen;
