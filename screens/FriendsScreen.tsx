
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { Player, getRankFromPoints } from '../types';
import { AvatarBox, LoadingIndicator, Badge } from '../components/Shared';
import { ChatModal, AlertModal } from '../components/Modals';
import { RANK_UI_DATA } from '../constants';
import { RefreshCw, UserCheck, UserX, MessageSquare, UserMinus, Search, Users as UsersIcon, UserPlus } from 'lucide-react';

const checkOnlineStatus = (profile: any) => {
  if (!profile || !profile.is_online) return false;
  const lastSeen = profile.last_seen ? new Date(profile.last_seen).getTime() : 0;
  const now = new Date().getTime();
  return (now - lastSeen) < 120000;
};

const FriendsScreen = ({ user, onRefreshCounts }: { user: Player, onRefreshCounts: () => void }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [allRelations, setAllRelations] = useState<any[]>([]);
    const [myFriends, setMyFriends] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'requests' | 'find'>('my');
    const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
    const [friendToDelete, setFriendToDelete] = useState<any | null>(null);
    const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'error' | 'success'} | null>(null);
    
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const performReset = () => {
            const container = document.getElementById('main-scroll-container');
            if (container) container.scrollTop = 0;
        };
        performReset();
        const frameId = requestAnimationFrame(performReset);
        return () => cancelAnimationFrame(frameId);
    }, [activeTab]);

    const fetchData = useCallback(async (isBackground: boolean = false) => {
        if (!isBackground) setIsInitialLoading(true);
        try {
            const { data: relations } = await supabase.from('friendships').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            const rels = relations || [];
            const acceptedIdsSet = new Set<string>();
            rels.filter(r => r.status === 'accepted').forEach(r => {
                acceptedIdsSet.add(r.user_id === user.id ? r.friend_id : r.user_id);
            });
            const acceptedIds = Array.from(acceptedIdsSet);
            const incomingIdsSet = new Set<string>();
            rels.filter(r => r.status === 'pending' && r.friend_id === user.id).forEach(r => {
                incomingIdsSet.add(r.user_id);
            });
            const incomingIds = Array.from(incomingIdsSet);
            const allNeededIds = [...new Set([...acceptedIds, ...incomingIds])];
            let profilesMap: Record<string, any> = {};
            if (allNeededIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('*').in('id', allNeededIds);
                profiles?.forEach(p => { profilesMap[p.id] = p; });
            }
            const { data: unreadMsgs } = await supabase.from('messages').select('sender_id').eq('receiver_id', user.id).eq('is_read', false);
            const serverCounts: Record<string, number> = {};
            unreadMsgs?.forEach(m => {
                const sId = String(m.sender_id);
                serverCounts[sId] = (serverCounts[sId] || 0) + 1;
            });
            setAllRelations(rels);
            setUnreadCounts(serverCounts);
            setMyFriends(acceptedIds.map(id => profilesMap[id]).filter(Boolean));
            setIncomingRequests(incomingIds.map(id => profilesMap[id]).filter(Boolean));
            onRefreshCounts();
        } catch (err) {
            console.error("Error fetching friends data:", err);
        } finally { 
            if (!isBackground) setIsInitialLoading(false); 
        }
    }, [user.id, onRefreshCounts]);

    useEffect(() => { 
        fetchData(); 
        const handleGeneralUpdate = () => {
            setTimeout(() => {
                fetchData(true);
                onRefreshCounts();
            }, 1000);
        };
        const channel = supabase.channel(`friends-screen-sync-${user.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${user.id}` }, handleGeneralUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `user_id=eq.${user.id}` }, handleGeneralUpdate)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, (payload) => {
                const newMsg = payload.new;
                const senderId = String(newMsg.sender_id);
                setUnreadCounts(prev => ({ ...prev, [senderId]: (Number(prev[senderId]) || 0) + 1 }));
                onRefreshCounts();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, handleGeneralUpdate)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, handleGeneralUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, handleGeneralUpdate)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, handleGeneralUpdate)
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [fetchData, user.id, onRefreshCounts]);

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;
        setIsSearching(true);
        const { data } = await supabase.from('profiles').select('*').ilike('name', `%${query}%`).neq('id', user.id).limit(10);
        setSearchResults(data || []);
        setIsSearching(false);
        setActiveTab('find');
    };

    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await fetchData(true);
        onRefreshCounts();
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsRefreshing(false);
    };

    const sendRequest = async (targetId: string) => {
        const tempId = 'temp-' + Date.now();
        const tempRel = { id: tempId, user_id: user.id, friend_id: targetId, status: 'pending' };
        setAllRelations(prev => [...prev, tempRel]);
        const { error } = await supabase.from('friendships').insert([{ user_id: user.id, friend_id: targetId, status: 'pending' }]);
        if (error) {
            setAllRelations(prev => prev.filter(r => r.id !== tempId));
            setAlertConfig({ title: "Lỗi", message: "Không thể gửi lời mời kết bạn.", type: "error" });
        }
    };

    const acceptRequest = async (senderId: string) => {
        setIncomingRequests(prev => prev.filter(req => String(req.id) !== String(senderId)));
        const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', senderId).eq('friend_id', user.id).eq('status', 'pending');
        if (error) { fetchData(); setAlertConfig({ title: "Lỗi", message: "Không thể chấp nhận lời mời.", type: "error" }); }
        else { fetchData(true); onRefreshCounts(); }
    };

    const declineRequest = async (senderId: string) => {
        setIncomingRequests(prev => prev.filter(req => String(req.id) !== String(senderId)));
        const { error } = await supabase.from('friendships').delete().eq('user_id', senderId).eq('friend_id', user.id);
        if (error) { fetchData(); setAlertConfig({ title: "Lỗi", message: "Không thể từ chối lời mời.", type: "error" }); }
    };

    const removeFriend = async (friendId: string) => {
        const relsToDelete = allRelations.filter(r => ((r.user_id === user.id && r.friend_id === friendId) || (r.friend_id === user.id && r.user_id === friendId)));
        if (relsToDelete.length > 0) {
            const ids = relsToDelete.map(r => r.id);
            setMyFriends(prev => prev.filter(f => String(f.id) !== String(friendId)));
            setFriendToDelete(null);
            const { error } = await supabase.from('friendships').delete().in('id', ids);
            if (error) { fetchData(); setAlertConfig({ title: "Lỗi", message: "Không thể xóa bạn bè.", type: "error" }); }
        }
    };

    const handleOpenChat = (friend: any) => {
        const friendIdStr = String(friend.id);
        setUnreadCounts(prev => {
            if (!prev[friendIdStr]) return prev;
            return { ...prev, [friendIdStr]: 0 };
        });
        onRefreshCounts();
        setActiveChatFriend(friend);
    };

    const filteredFriends = activeTab === 'my' ? myFriends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())) : myFriends;
    const filteredRequests = activeTab === 'requests' ? incomingRequests.filter(req => req.name.toLowerCase().includes(searchQuery.toLowerCase())) : incomingRequests;

    return (
        <div className="flex flex-col min-h-full w-full bg-[#0f172a] animate-fade-in">
            {alertConfig && <AlertModal title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
            {activeChatFriend && (
                <ChatModal 
                  user={user} 
                  friend={activeChatFriend} 
                  onClose={() => { setActiveChatFriend(null); fetchData(true); }} 
                  onRead={() => { 
                      setUnreadCounts(prev => ({ ...prev, [String(activeChatFriend.id)]: 0 }));
                      onRefreshCounts(); 
                  }}
                />
            )}
            {friendToDelete && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-slate-900 w-full max-sm:max-w-sm rounded-[2rem] border border-red-500/20 p-8 text-center shadow-2xl">
                        <UserX className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Xóa Bạn Bè?</h3>
                        <p className="text-slate-400 text-sm mb-8">Bạn muốn xóa <span className="text-white font-bold">{friendToDelete.name}</span> khỏi danh sách?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => removeFriend(friendToDelete.id)} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 shadow-lg">Xác nhận xóa</button>
                            <button onClick={() => setFriendToDelete(null)} className="w-full bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95">Quay lại</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Tab Navigation */}
            <div className="p-4 pt-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <UsersIcon className="w-6 h-6 text-blue-500" />
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Cộng đồng</h2>
                    </div>
                    <button onClick={handleManualRefresh} className="p-2.5 bg-slate-800 text-blue-500 rounded-xl active:rotate-180 transition-transform duration-500 border border-slate-700">
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 shadow-inner">
                    <button onClick={() => setActiveTab('my')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}>Bạn bè</button>
                    <button onClick={() => setActiveTab('requests')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}>Lời mời {incomingRequests.length > 0 && <Badge count={incomingRequests.length} className="!-top-1 !-right-1" />}</button>
                    <button onClick={() => setActiveTab('find')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'find' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}>Tìm kiếm</button>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
                {/* Search Input Area */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                          type="text" 
                          value={searchQuery} 
                          onChange={(e) => setSearchQuery(e.target.value)} 
                          onKeyDown={(e) => { if (e.key === 'Enter') { if (activeTab === 'find') handleSearch(); else (e.target as HTMLInputElement).blur(); } }} 
                          placeholder={activeTab === 'find' ? "Nhập tên người chơi..." : "Tìm trong danh sách..."} 
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-12 text-sm text-white outline-none focus:border-blue-500/50 transition-all shadow-xl" 
                        />
                    </div>
                    {activeTab === 'find' && (
                        <button onClick={handleSearch} className="bg-blue-600 px-6 py-4 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-blue-500/20">
                            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Tìm'}
                        </button>
                    )}
                </div>

                {/* Content List */}
                <div className="space-y-3 pb-8">
                    {isInitialLoading ? <LoadingIndicator message="Đang kết nối..." /> : (
                    <>
                    {activeTab === 'find' && (
                        <div className="space-y-3 animate-fade-in">
                            {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
                                <div className="text-center py-20">
                                    <div className="bg-slate-900/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
                                        <Search className="w-8 h-8 text-slate-700" />
                                    </div>
                                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Không tìm thấy kết quả</p>
                                </div>
                            )}
                            {searchResults.map(p => {
                                const rel = allRelations.find(r => String(r.user_id) === String(p.id) || String(r.friend_id) === String(p.id));
                                return (
                                    <div key={p.id} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group hover:bg-slate-800/80 transition-all">
                                        <div className="flex items-center gap-3">
                                            <AvatarBox avatar={p.avatar} className="w-12 h-12 border border-slate-700" />
                                            <div>
                                                <div className="font-bold text-white text-sm">{p.name}</div>
                                                <div className="text-[9px] text-slate-500 font-black uppercase mt-1 tracking-wider">{getRankFromPoints(p.points).tier}</div>
                                            </div>
                                        </div>
                                        {String(p.id) !== String(user.id) && !rel && (
                                            <button onClick={() => sendRequest(p.id)} className="bg-blue-600 px-5 py-2.5 rounded-xl text-white text-[9px] font-black uppercase flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/10">
                                                <UserPlus className="w-3.5 h-3.5" /> Kết bạn
                                            </button>
                                        )}
                                        {rel?.status === 'pending' && <div className="px-4 py-2 bg-slate-800 rounded-xl text-[9px] font-black text-slate-500 uppercase italic">Đã mời</div>}
                                        {rel?.status === 'accepted' && <div className="px-4 py-2 bg-blue-500/10 rounded-xl text-blue-500 font-black uppercase text-[9px]">Bạn bè</div>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {activeTab === 'requests' && (
                        <div className="space-y-3 animate-fade-in">
                            {filteredRequests.length > 0 ? filteredRequests.map(req => (
                                <div key={req.id} className="bg-slate-900/60 p-4 rounded-[1.5rem] border border-slate-800 flex items-center justify-between shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <AvatarBox avatar={req.avatar} className="w-14 h-14 border-2 border-slate-800" />
                                        <div>
                                            <div className="font-black text-white text-sm tracking-tight">{req.name}</div>
                                            <div className={`text-[9px] font-black uppercase mt-0.5 ${RANK_UI_DATA[getRankFromPoints(req.points).tier].color}`}>{getRankFromPoints(req.points).tier}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => acceptRequest(req.id)} className="p-3 rounded-2xl bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-600 hover:text-white"><UserCheck className="w-5 h-5" /></button>
                                        <button onClick={() => declineRequest(req.id)} className="p-3 rounded-2xl bg-red-600/10 text-red-500 border border-red-500/20 active:scale-95 transition-all hover:bg-red-600 hover:text-white"><UserX className="w-5 h-5" /></button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 opacity-30">
                                    <UsersIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{searchQuery ? "Không tìm thấy lời mời nào" : "Chưa có lời mời kết bạn"}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'my' && (
                        <div className="space-y-2 animate-fade-in">
                            {filteredFriends.length > 0 ? filteredFriends.map(f => {
                                const isOnline = checkOnlineStatus(f);
                                const fIdStr = String(f.id);
                                const uCount = Number(unreadCounts[fIdStr]) || 0;
                                return (
                                    <div key={f.id} className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-all shadow-md">
                                        <div className="flex items-center gap-3">
                                            <AvatarBox avatar={f.avatar} className="w-14 h-14 border border-slate-700" isOnline={isOnline} />
                                            <div>
                                                <div className="font-bold text-white text-sm tracking-tight">{f.name}</div>
                                                <div className={`text-[9px] font-black uppercase mt-0.5 tracking-wider ${RANK_UI_DATA[getRankFromPoints(f.points).tier].color}`}>{getRankFromPoints(f.points).tier}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenChat(f)} className={`p-3.5 rounded-2xl relative transition-all active:scale-95 border ${uCount > 0 ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                                <MessageSquare className={`w-5 h-5 ${uCount > 0 ? 'animate-bounce-short' : ''}`} />
                                                {uCount > 0 && <Badge count={uCount} className="!-top-1.5 !-right-1.5 ring-2 ring-slate-950" />}
                                            </button>
                                            <button onClick={() => setFriendToDelete(f)} className="p-3.5 rounded-2xl bg-slate-800 text-slate-500 border border-slate-700 active:scale-95 transition-all hover:text-red-500">
                                                <UserMinus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-24 opacity-20">
                                    <div className="bg-slate-900 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-700">
                                        <UsersIcon className="w-10 h-10" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{searchQuery ? "Không tìm thấy bạn bè" : "Chưa có bạn bè online"}</p>
                                </div>
                            )}
                        </div>
                    )}
                    </>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes bounce-short { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
                .animate-bounce-short { animation: bounce-short 1.5s infinite ease-in-out; }
            `}</style>
        </div>
    );
};

export default FriendsScreen;
