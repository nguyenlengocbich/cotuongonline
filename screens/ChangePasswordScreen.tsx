
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Key, Lock, ShieldCheck, ArrowLeft, Loader2, CheckCircle2, Unlock } from 'lucide-react';
import { AlertModal } from '../components/Modals';

const ChangePasswordScreen = () => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'success' | 'error'} | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("Mật khẩu mới phải từ 6 ký tự trở lên!");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            return;
        }

        if (currentPassword === password) {
            setError("Mật khẩu mới không được trùng với mật khẩu cũ!");
            return;
        }

        setIsSubmitting(true);
        try {
            // Bước 1: Lấy thông tin user hiện tại
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !user.email) throw new Error("Không tìm thấy thông tin phiên đăng nhập.");

            // Bước 2: Xác thực lại bằng mật khẩu cũ (Re-authenticate)
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (authError) {
                throw new Error("Mật khẩu hiện tại không chính xác.");
            }

            // Bước 3: Cập nhật mật khẩu mới
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setAlertConfig({
                title: "Thành Công",
                message: "Mật khẩu của bạn đã được thay đổi thành công.",
                type: "success"
            });
        } catch (err: any) {
            setError(err.message || "Không thể cập nhật mật khẩu.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto space-y-6 animate-fade-in flex flex-col h-full">
            {alertConfig && (
                <AlertModal 
                    title={alertConfig.title} 
                    message={alertConfig.message} 
                    type={alertConfig.type} 
                    onClose={() => {
                        setAlertConfig(null);
                        navigate('/profile');
                    }} 
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/profile')} className="p-2 text-slate-400 hover:text-white transition-colors bg-slate-800 rounded-xl">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Cài Đặt Bảo Mật</h2>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                        <Key className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                        Đổi mật khẩu
                    </p>
                </div>

                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase animate-shake text-center tracking-wider">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Mật khẩu cũ */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Mật khẩu hiện tại</label>
                        <div className="relative">
                            <Unlock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input 
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Nhập mật khẩu hiện tại"
                                className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                                required
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-800/50 my-2"></div>

                    {/* Mật khẩu mới */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Mật khẩu mới</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tối thiểu 6 ký tự"
                                className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* Xác nhận mật khẩu mới */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nhập lại mật khẩu mới</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Xác nhận lại"
                                className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500 transition-all text-sm"
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Xác nhận thay đổi</>}
                    </button>
                </form>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                <Lock className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider leading-relaxed">
                    Hệ thống yêu cầu xác nhận mật khẩu cũ để đảm bảo an toàn cho tài khoản của bạn.
                </p>
            </div>
        </div>
    );
};

export default ChangePasswordScreen;
