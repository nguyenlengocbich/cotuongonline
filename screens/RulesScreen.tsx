
import React, { useState, useEffect } from 'react';
import { BookOpen, Shield, AlertCircle, Flame, Zap, Crown, Info as InfoIcon, Scale, History, Swords, FastForward } from 'lucide-react';

const RulesScreen = () => {
    const [activeTab, setActiveTab] = useState<'pieces' | 'rules' | 'advanced' | 'tips'>('pieces');

    // RESET SCROLL ON INTERNAL TAB CHANGE
    useEffect(() => {
        const performReset = () => {
            const container = document.getElementById('main-scroll-container');
            if (container) container.scrollTop = 0;
        };
        performReset();
        const frameId = requestAnimationFrame(performReset);
        return () => cancelAnimationFrame(frameId);
    }, [activeTab]);

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
      { title: 'Chiếu Tướng', desc: 'Khi quân của bạn đe dọa ăn Tướng đối phương. Đối phương phải tìm cách giải chiếu ngay lập tức.', icon: <AlertCircle className="w-5 h-5 text-orange-500" /> },
      { title: 'Sát cục (Checkmate)', desc: 'Khi Tướng bị chiếu mà không còn đường thoát hoặc không có quân nào cứu được.', icon: <Flame className="w-5 h-5 text-yellow-500" /> },
    ];

    const advancedRules = [
      { 
        title: 'Luật Chiếu dai', 
        desc: 'Chiếu liên tục đối phương bằng 1 hoặc nhiều quân là không hợp lệ. Vi phạm sẽ bị xử thua ngay lập tức.', 
        icon: <Swords className="w-5 h-5 text-red-500" />,
        limit: 'Giới hạn: 6 nước (1 quân), 12 nước (2 quân), 18 nước (3 quân).'
      },
      { 
        title: 'Luật Đuổi dai', 
        desc: 'Liên tục đuổi bắt một quân của đối phương (trừ Tướng) là không hợp lệ. Nếu vi phạm và đối phương không vi phạm, bạn sẽ bị xử thua.', 
        icon: <Zap className="w-5 h-5 text-yellow-500" />,
        limit: 'Áp dụng giới hạn tương tự luật Chiếu dai.'
      },
      { 
        title: 'Phân định lỗi', 
        desc: 'Một bên Chiếu dai, một bên Đuổi dai -> Bên Chiếu dai bị xử THUA. Cả hai cùng vi phạm lỗi giống nhau -> Xử HÒA.', 
        icon: <Scale className="w-5 h-5 text-blue-400" /> 
      },
    ];

    const drawRules = [
      { title: 'Luật 120 nước (Effective)', desc: 'Ván cờ tự động hòa khi tổng số nước đi có hiệu lực (không tính nước chiếu/đuổi) đạt 120.', icon: <History className="w-5 h-5 text-slate-400" /> },
      { title: 'Luật 30 nước (Progress)', desc: 'Ván cờ hòa nếu sau 30 nước đi không có quân nào bị bắt và không có Tốt nào tiến lên sau khi qua sông.', icon: <FastForward className="w-5 h-5 text-emerald-400" /> },
      { title: 'Luật 300 nước (Total)', desc: 'Giới hạn tối đa của một ván đấu là 300 nước đi để tránh ván cờ kéo dài vô tận.', icon: <FastForward className="w-5 h-5 text-blue-400" /> },
    ];

    const strategyTips = [
      { title: 'Khai cuộc nhanh', desc: 'Triển khai Xe, Mã, Pháo sớm để kiểm soát các vị trí trọng yếu. Tránh đi 1 quân nhiều lần.', icon: <Zap className="w-5 h-5 text-cyan-400" /> },
      { title: 'Bảo vệ Tướng', desc: 'Luôn giữ Sĩ, Tượng bên cạnh Tướng. "Sĩ Tượng bền vững mới mong thắng trận".', icon: <Crown className="w-5 h-5 text-purple-400" /> },
      { title: 'Sức mạnh của Xe', desc: 'Xe có tầm hoạt động rộng nhất. Hãy dùng Xe để quấy rối và tạo áp lực lên đối phương.', icon: <Shield className="w-5 h-5 text-green-400" /> },
    ];

    return (
        <div className="p-4 max-w-md mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-600/20 rounded-xl">
                    <BookOpen className="w-7 h-7 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Luật Chơi</h2>
            </div>

            <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('pieces')} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'pieces' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Quân cờ</button>
                <button onClick={() => setActiveTab('rules')} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'rules' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Cơ bản</button>
                <button onClick={() => setActiveTab('advanced')} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'advanced' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Nâng cao</button>
                <button onClick={() => setActiveTab('tips')} className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === 'tips' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Mẹo hay</button>
            </div>

            <div className="space-y-4">
                {activeTab === 'pieces' && piecesInfo.map((p, i) => (
                    <div key={i} className="bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-700/50 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-red-500/30 flex-shrink-0 flex items-center justify-center text-red-500 font-chinese text-3xl shadow-lg">{p.icon}</div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{p.piece}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{p.rule}</p>
                        </div>
                    </div>
                ))}

                {activeTab === 'rules' && generalRules.map((r, i) => (
                    <div key={i} className="bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-700/50 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">{r.icon}</div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{r.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                        </div>
                    </div>
                ))}

                {activeTab === 'advanced' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="px-2 py-1">
                            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mb-4">I. Luật Chiếu & Đuổi dai</h3>
                            {advancedRules.map((r, i) => (
                                <div key={i} className="bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-700/50 flex gap-5 items-start mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">{r.icon}</div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{r.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-2">{r.desc}</p>
                                        {r.limit && <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded-lg">{r.limit}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-2 py-1">
                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">II. Luật xử Hòa thi đấu</h3>
                            {drawRules.map((r, i) => (
                                <div key={i} className="bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-700/50 flex gap-5 items-start mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">{r.icon}</div>
                                    <div>
                                        <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{r.title}</h4>
                                        <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'tips' && strategyTips.map((t, i) => (
                    <div key={i} className="bg-slate-800/40 p-5 rounded-[1.5rem] border border-slate-700/50 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">{t.icon}</div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{t.title}</h4>
                            <p className="text-xs text-slate-400 leading-relaxed italic">{t.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-6 bg-blue-900/10 border border-blue-500/20 rounded-3xl mt-8">
                <div className="flex items-center gap-2 text-blue-500 mb-2">
                    <InfoIcon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ghi chú trọng tài</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                    Hệ thống sẽ tự động phát hiện các vi phạm luật Chiếu dai và Đuổi dai để đảm bảo tính công bằng. Khi ván cờ đạt giới hạn nước đi, kết quả Hòa sẽ được áp dụng ngay lập tức.
                </p>
            </div>
        </div>
    );
};

export default RulesScreen;
