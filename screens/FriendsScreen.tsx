
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Player, getRankFromPoints } from '../types';
import { AvatarBox, LoadingIndicator } from '../components/Shared';
import { ChatModal } from '../components/Modals';
import { RANK_UI_DATA } from '../constants';
import { RefreshCw, UserCheck, UserX, MessageSquare, UserMinus } from 'lucide-react';

const checkOnlineStatus = (profile: any) => {
  if (!profile || !profile.is_online) return false;
  const lastSeen = profile.last_seen ? new Date(profile.last_seen).getTime() : 0;
  const now = new Date().getTime();
  return (now - lastSeen) < 120000;
};

const FriendsScreen = ({ user }: { user: Player }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [allRelations, setAllRelations] = useState<any[]>([]);
    const [myFriends, setMyFriends] = useState<any[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'my' | 'requests' | 'find'>('my');
    const [activeChatFriend, setActiveChatFriend] = useState<any | null>(null);
    const [friendToDelete, setFriendToDelete] = useState<any | null>(null);

    const fetchData = async () => {
        try {
            const { data: relations } = await supabase.from('friendships').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
            const rels = relations || [];
            setAllRelations(rels);

            const acceptedIds = rels.filter(r => r.status === 'accepted').map(r => r.user_id === user.id ? r.friend_id : r.user_id);
            const incomingIds = rels.filter(r => r.status === 'pending' && r.friend_id === user.id).map(r => r.user_id);

            const allNeededIds = [...new Set([...acceptedIds, ...incomingIds])];
            let profilesMap: Record<string, any> = {};
            
            if (allNeededIds.length > 0) {
                const { data: profiles } = await supabase.from('profiles').select('*').in('id', allNeededIds);
                profiles?.forEach(p => { profilesMap[p.id] = p; });
            }

            setMyFriends(acceptedIds.map(id => profilesMap[id]).filter(Boolean));
            setIncomingRequests(incomingIds.map(id => profilesMap[id]).filter(Boolean));
        } catch (err) { } 
        finally { setIsInitialLoading(false); }
    };

    useEffect(() => { 
        fetchData(); 
        const channel = supabase.channel('friends-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, fetchData)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchData)
            .subscribe();
        return () => { channel.unsubscribe(); };
    }, [user.id]);

    const handleSearch = async () => {
        const query = searchQuery.trim();
        if (!query) return;
        setIsSearching(true);
        const { data } = await supabase.from('profiles').select('*').ilike('name', `%${query}%`).neq('id', user.id).limit(10);
        setSearchResults(data || []);
        setIsSearching(false);
    };

    const sendRequest = async (targetId: string) => {
        await supabase.from('friendships').insert([{ user_id: user.id, friend_id: targetId, status: 'pending' }]);
        await fetchData();
    };

    const acceptRequest = async (senderId: string) => {
        const acceptedProfile = incomingRequests.find(r => r.id === senderId);
        if (acceptedProfile) {
            setMyFriends(prev => [...prev, acceptedProfile]);
            setIncomingRequests(prev => prev.filter(r => r.id !== senderId));
        }
        await supabase.from('friendships').update({ status: 'accepted' }).eq('user_id', senderId).eq('friend_id', user.id);
        await fetchData(); 
    };

    const declineRequest = async (senderId: string) => {
        await supabase.from('friendships').delete().eq('user_id', senderId).eq('friend_id', user.id);
        await fetchData();
    };

    const removeFriend = async (friendId: string) => {
        const rel = allRelations.find(r => (r.user_id === user.id && r.friend_id === friendId) || (r.friend_id === user.id && r.user_id === friendId));
        if (rel) {
            await supabase.from('friendships').delete().eq('id', rel.id);
            setFriendToDelete(null);
            await fetchData();
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto space-y-4 animate-fade-in pb-20">
            {activeChatFriend && <ChatModal user={user} friend={activeChatFriend} onClose={() => setActiveChatFriend(null)} />}
            {friendToDelete && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
                    <div className="bg-slate-900 w-full max-sm:max-w-sm rounded-3xl border border-red-500/20 p-8 text-center">
                        <UserX className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Xóa Bạn Bè?</h3>
                        <p className="text-slate-400 text-sm mb-8">Bạn muốn xóa <span className="text-white font-bold">{friendToDelete.name}</span>?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => removeFriend(friendToDelete.id)} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase text-xs active:scale-95">Xác nhận</button>
                            <button onClick={() => setFriendToDelete(null)} className="w-full bg-slate-800 text-slate-400 font-bold py-4 rounded-2xl uppercase text-xs">Hủy</button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Kỳ Thủ</h2>
                <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                    <button onClick={() => setActiveTab('my')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase relative ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        Bạn bè
                    </button>
                    <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase relative ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        Lời mời
                    </button>
                    <button onClick={() => setActiveTab('find')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase ${activeTab === 'find' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Tìm</button>
                </div>
            </div>
            {isInitialLoading ? <LoadingIndicator message="Đang tải danh sách..." /> : (
            <>
            {activeTab === 'find' && (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Tìm tên..." className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white" />
                        <button onClick={handleSearch} className="bg-blue-600 px-6 rounded-xl text-white font-bold">{isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Tìm'}</button>
                    </div>
                    {searchResults.map(p => {
                        const rel = allRelations.find(r => r.user_id === p.id || r.friend_id === p.id);
                        return (
                            <div key={p.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-3"><AvatarBox avatar={p.avatar} className="w-10 h-10" /><div><div className="font-bold text-white text-sm">{p.name}</div><div className="text-[10px] text-slate-500 font-black uppercase">{getRankFromPoints(p.points).tier}</div></div></div>
                                {p.id !== user.id && !rel && <button onClick={() => sendRequest(p.id)} className="bg-blue-600 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase">Kết bạn</button>}
                                {rel?.status === 'pending' && <div className="text-[10px] font-black text-slate-500 italic">Đã gửi/Chờ</div>}
                                {rel?.status === 'accepted' && <div className="text-blue-500 font-black uppercase text-[10px]">Bạn bè</div>}
                            </div>
                        );
                    })}
                </div>
            )}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {incomingRequests.length > 0 ? incomingRequests.map(req => (
                        <div key={req.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3"><AvatarBox avatar={req.avatar} className="w-12 h-12" /><div><div className="font-bold text-white">{req.name}</div><div className="text-[10px] text-orange-500 font-black uppercase">{getRankFromPoints(req.points).tier}</div></div></div>
                            <div className="flex gap-2">
                                <button onClick={() => acceptRequest(req.id)} className="p-3 rounded-full bg-green-900/20 text-green-500"><UserCheck className="w-5 h-5" /></button>
                                <button onClick={() => declineRequest(req.id)} className="p-3 rounded-full bg-red-900/20 text-red-500"><UserX className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )) : <div className="text-center py-20 text-slate-500 text-sm">Chưa có lời mời nào</div>}
                </div>
            )}
            {activeTab === 'my' && (
                <div className="space-y-2">
                    {myFriends.length > 0 ? myFriends.map(f => {
                        const isOnline = checkOnlineStatus(f);
                        return (
                            <div key={f.id} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <AvatarBox avatar={f.avatar} className="w-12 h-12" isOnline={isOnline} />
                                    <div><div className="font-bold text-white">{f.name}</div><div className={`text-[10px] font-black uppercase ${RANK_UI_DATA[getRankFromPoints(f.points).tier].color}`}>{getRankFromPoints(f.points).tier}</div></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setActiveChatFriend(f)} className="p-3 rounded-xl bg-blue-600 text-white relative">
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setFriendToDelete(f)} className="p-3 rounded-xl bg-slate-700/50 text-slate-500"><UserMinus className="w-5 h-5" /></button>
                                </div>
                            </div>
                        );
                    }) : <div className="text-center py-20 text-slate-500 text-sm">Chưa có bạn bè</div>}
                </div>
            )}
            </>
            )}
        </div>
    );
};

export default FriendsScreen;
