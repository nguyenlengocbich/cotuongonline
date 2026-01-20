
import React, { useState } from 'react';
import { BookOpen, Shield, AlertCircle, Flame, Zap, Crown, Info as InfoIcon } from 'lucide-react';

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
      { title: 'Chiếu Tướng', desc: 'Khi quân của bạn đe dọa ăn Tướng đối phương. Đối phương phải tìm cách giải chiếu ngay lập tức.', icon: <AlertCircle className="w-5 h-5 text-orange-500" /> },
      { title: 'Sát cục (Checkmate)', desc: 'Khi Tướng bị chiếu mà không còn đường thoát hoặc không có quân nào cứu được.', icon: <Flame className="w-5 h-5 text-yellow-500" /> },
    ];

    const strategyTips = [
      { title: 'Khai cuộc nhanh', desc: 'Triển khai Xe, Mã, Pháo sớm để kiểm soát các vị trí trọng yếu. Tránh đi 1 quân nhiều lần.', icon: <Zap className="w-5 h-5 text-cyan-400" /> },
      { title: 'Bảo vệ Tướng', desc: 'Luôn giữ Sĩ, Tượng bên cạnh Tướng. "Sĩ Tượng bền vững mới mong thắng trận".', icon: <Crown className="w-5 h-5 text-purple-400" /> },
      { title: 'Sức mạnh của Xe', desc: 'Xe có tầm hoạt động rộng nhất. Hãy dùng Xe để quấy rối và tạo áp lực lên đối phương.', icon: <Shield className="w-5 h-5 text-green-400" /> },
      { title: 'Pháo cần ngòi', desc: 'Luôn tìm cách tạo "ngòi" cho Pháo. Pháo đứng sau quân mình hoặc quân địch đều có thể tấn công.', icon: <Shield className="w-5 h-5 text-red-400" /> },
    ];

    return (
        <div className="p-4 max-w-md mx-auto space-y-6 animate-fade-in pb-20">
            <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8 text-red-500" />
                <h2 className="text-2xl font-bold text-white">Luật Chơi & Mẹo</h2>
            </div>

            <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                <button onClick={() => setActiveTab('pieces')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pieces' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Quân cờ</button>
                <button onClick={() => setActiveTab('rules')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'rules' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Luật chơi</button>
                <button onClick={() => setActiveTab('tips')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'tips' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>Mẹo hay</button>
            </div>

            <div className="space-y-4">
                {activeTab === 'pieces' && piecesInfo.map((p, i) => (
                    <div key={i} className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-red-500/30 flex-shrink-0 flex items-center justify-center text-red-500 font-chinese text-3xl shadow-lg">{p.icon}</div>
                        <div><h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{p.piece}</h4><p className="text-sm text-slate-400 leading-relaxed">{p.rule}</p></div>
                    </div>
                ))}
                {activeTab === 'rules' && generalRules.map((r, i) => (
                    <div key={i} className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">{r.icon}</div>
                        <div><h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{r.title}</h4><p className="text-sm text-slate-400 leading-relaxed">{r.desc}</p></div>
                    </div>
                ))}
                {activeTab === 'tips' && strategyTips.map((t, i) => (
                    <div key={i} className="bg-slate-800/60 p-5 rounded-[1.5rem] border border-slate-700 flex gap-5 items-start animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/50 flex-shrink-0 flex items-center justify-center border border-slate-700">{t.icon}</div>
                        <div><h4 className="font-black text-white text-xs uppercase tracking-wider mb-1.5">{t.title}</h4><p className="text-sm text-slate-400 leading-relaxed italic">{t.desc}</p></div>
                    </div>
                ))}
            </div>
            
            <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-3xl mt-8">
                <div className="flex items-center gap-2 text-red-500 mb-2"><InfoIcon className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">Lời khuyên</span></div>
                <p className="text-xs text-slate-400 leading-relaxed italic">Cờ tướng là nghệ thuật điều binh khiển tướng. Hãy bình tĩnh quan sát toàn cục diện thay vì chỉ chú trọng vào một quân cờ duy nhất.</p>
            </div>
        </div>
    );
};

export default RulesScreen;
