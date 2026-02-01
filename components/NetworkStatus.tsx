
import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    // 1. Kiểm tra trạng thái mạng của trình duyệt
    if (!navigator.onLine) {
        setIsOnline(false);
        setIsChecking(false);
        return;
    }

    setIsChecking(true);
    try {
        // 2. Ping Supabase để kiểm tra kết nối thực tế tới server
        // Tạo timeout 5s để tránh đợi quá lâu
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        // Truy vấn nhẹ nhất có thể (lấy id của 1 profile bất kỳ)
        const fetchPromise = supabase.from('profiles').select('id').limit(1).maybeSingle();

        const result: any = await Promise.race([fetchPromise, timeoutPromise]);

        // Kiểm tra lỗi mạng từ Supabase client
        // status === 0 hoặc thông báo lỗi fetch thường là do mất kết nối mạng
        if (result.error && (
            result.error.message?.includes('fetch failed') || 
            result.error.message?.includes('Failed to fetch') ||
            result.error.message?.includes('Network request failed') ||
            result.status === 0
        )) {
             setIsOnline(false);
        } else {
             // Nếu kết nối thành công (dù có thể lỗi auth hay không có dữ liệu), vẫn tính là có mạng
             setIsOnline(true);
        }
    } catch (error) {
        // Lỗi timeout hoặc lỗi không xác định
        setIsOnline(false);
    } finally {
        setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Kiểm tra ngay khi mount
    checkConnection();

    // Tự động kiểm tra định kỳ mỗi 10 giây để phát hiện rớt mạng
    const interval = setInterval(() => {
        // Chỉ check tự động nếu đang online (để phát hiện offline)
        // Hoặc đang offline (để tự động reconnect)
        checkConnection();
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection]);

  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center p-6 animate-fade-in text-center">
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <WifiOff className="w-16 h-16 text-slate-500" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-red-600 rounded-full p-3 border-4 border-[#0f172a]">
           <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      </div>

      <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-3">Mất Kết Nối</h2>
      <p className="text-slate-400 text-sm font-medium max-w-xs leading-relaxed mb-10">
        Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền internet của bạn.
      </p>

      <button 
        onClick={checkConnection}
        disabled={isChecking}
        className="group relative bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-10 rounded-2xl uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
      >
        <span className={`flex items-center gap-3 ${isChecking ? 'opacity-0' : 'opacity-100'}`}>
           <RefreshCw className="w-4 h-4" /> Thử lại
        </span>
        
        {isChecking && (
            <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
        )}
      </button>
      
      <div className="absolute bottom-8 text-[10px] font-black text-slate-700 uppercase tracking-widest">
        Connection Lost - Reconnecting...
      </div>
    </div>
  );
};

export default NetworkStatus;
