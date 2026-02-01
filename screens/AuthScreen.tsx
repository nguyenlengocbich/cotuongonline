
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, UserCircle } from 'lucide-react';
import { DEFAULT_GAME_ICON } from '../constants';
import { AlertModal } from '../components/Modals';

const AuthScreen = ({ onLoginStart, onLoginError }: { onLoginStart: () => void, onLoginError?: () => void }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setIsSubmitting(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const userTrimmed = username.trim().toLowerCase();
    const displayTrimmed = displayName.trim();
    
    // Validations
    if (userTrimmed.length < 3) { 
      setError("Tên đăng nhập phải từ 3 ký tự trở lên!"); 
      return; 
    }
    if (!/^[a-z0-9_]+$/.test(userTrimmed)) { 
      setError("Tên đăng nhập chỉ chứa chữ thường, số và gạch dưới!"); 
      return; 
    }
    
    if (isRegister) {
      if (displayTrimmed.length > 0 && displayTrimmed.length < 2) {
        setError("Tên người chơi quá ngắn!");
        return;
      }
      if (password.length < 6) { 
        setError("Mật khẩu ít nhất 6 ký tự!"); 
        return; 
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp!");
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const email = `${userTrimmed}@cotuong.app`;

      if (isRegister) {
        // Tên hiển thị: Nếu người dùng không nhập thì lấy tên đăng nhập
        const finalDisplayName = displayTrimmed || userTrimmed;

        const { error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password, 
          options: { 
            data: { 
              name: finalDisplayName
            } 
          } 
        });
        
        if (signUpError) throw signUpError;
        
        setAlertConfig({
          title: "Đăng Ký Thành Công",
          message: `Tài khoản '${userTrimmed}' đã sẵn sàng. Chào mừng kỳ thủ ${finalDisplayName}!`,
          type: "success"
        });
        setIsRegister(false); 
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setIsSubmitting(false);
      } else {
        // Đăng nhập
        onLoginStart();
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (signInError) {
          if (onLoginError) onLoginError();
          throw signInError;
        }
      }
    } catch (err: any) {
      console.log("Auth Error Details:", err);
      
      let msg = "Lỗi hệ thống, vui lòng thử lại!";
      const errMessage = err.message || "";
      const status = err.status;

      // Xử lý lỗi
      if (errMessage.includes("User already registered") || status === 422) {
         msg = `Tên đăng nhập '${userTrimmed}' đã tồn tại. Vui lòng chọn tên khác!`;
      } else if (errMessage.includes("Invalid login credentials")) {
        msg = "Sai tên đăng nhập hoặc mật khẩu!";
      } else if (errMessage.includes("rate limit")) {
        msg = "Bạn thao tác quá nhanh, vui lòng đợi một lát!";
      }
      
      setError(msg);
      setIsSubmitting(false);
      if (!isRegister && onLoginError) onLoginError();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
      {alertConfig && (
        <AlertModal 
          title={alertConfig.title} 
          message={alertConfig.message} 
          type={alertConfig.type} 
          onClose={() => setAlertConfig(null)} 
        />
      )}
      <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-sm:max-w-sm border border-slate-700">
        <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-yellow-600 shadow-xl">
               <img src={DEFAULT_GAME_ICON} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{isRegister ? 'Đăng Ký' : 'Đăng Nhập'}</h2>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black">Cờ Tướng Online Mobile</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-tighter">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
                placeholder="Nhập tên người dùng" 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 pl-10 outline-none focus:border-red-500 transition-colors" 
                required 
                disabled={isSubmitting} 
              />
            </div>
          </div>

          {isRegister && (
            <div className="space-y-1 animate-slide-down">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-tighter">Tên hiển thị</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  placeholder="Nhập tên hiển thị" 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 pl-10 outline-none focus:border-red-500 transition-colors" 
                  disabled={isSubmitting} 
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-tighter">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••" 
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 pl-10 pr-10 outline-none focus:border-red-500 transition-colors" 
                required 
                disabled={isSubmitting} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 p-1 hover:text-white transition-colors"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {isRegister && (
            <div className="space-y-1 animate-slide-down">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-tighter">Xác nhận mật khẩu</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="••••••" 
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3.5 pl-10 pr-10 outline-none focus:border-red-500 transition-colors" 
                  required 
                  disabled={isSubmitting} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 p-1 hover:text-white transition-colors"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-red-700 hover:bg-red-600 disabled:bg-slate-700 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? 'Đăng Ký' : 'Đăng nhập')}
          </button>
        </form>

        <button 
          onClick={() => { 
            setIsRegister(!isRegister); 
            setError(null); 
            setPassword('');
            setConfirmPassword('');
            setDisplayName('');
          }} 
          className="mt-8 text-sm text-red-500/80 w-full text-center font-bold uppercase tracking-tighter"
        >
          {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
