
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Board } from '../components/Board';
import { GameResultModal, SurrenderConfirmModal, AlertModal } from '../components/Modals';
import CoinToss from '../components/CoinToss';
import { AvatarBox } from '../components/Shared';
import { AVATARS } from '../constants';
import { getValidMoves, INITIAL_BOARD_SETUP, getPieceAt, getRandomMove, isCheck } from '../services/xiangqiRules';
import { getBestMove } from '../services/geminiService';
import { Piece, Color, Move, Player, GameStatus, PieceType } from '../types';
import { Timer, Flag, Loader2, ArrowLeft } from 'lucide-react';

const RANDOM_NAMES = ["Alex", "John", "Sarah", "Mike", "Emma", "David", "Jessica", "Daniel", "Emily", "Chris", "Ryan", "Sophia"];

export const GameScreen = ({ mode, user, onGameEnd }: { mode: 'ai' | 'online', user?: Player, onGameEnd: (result: 'win' | 'loss', moves: Move[], opponent: string, reason?: string) => Promise<number> }) => {
    const params = useParams();
    const roomId = params.roomId;
    const navigate = useNavigate();
    const location = useLocation();
    
    // Kiểm tra xem có phải là bot match giả danh online không
    const isBotMatch = new URLSearchParams(location.search).get('bot') === 'true';

    const [pieces, setPieces] = useState<Piece[]>(INITIAL_BOARD_SETUP);
    const [turn, setTurn] = useState<Color>(Color.RED);
    const [myColor, setMyColor] = useState<Color>(Color.RED);
    const [opponentInfo, setOpponentInfo] = useState<any>({ name: "..." });
    const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
    const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [gameResult, setGameResult] = useState<{result: 'win' | 'loss', delta: number, reason?: string, moves: Move[], initialBoard: Piece[]} | null>(null);
    const [showCoinToss, setShowCoinToss] = useState(true);
    const [isSurrendering, setIsSurrendering] = useState(false);
    const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'error' | 'info'} | null>(null);
    
    const [isRoomLoaded, setIsRoomLoaded] = useState(false);
    const [moveHistory, setMoveHistory] = useState<Move[]>([]);
    
    const hasEndedRef = useRef(false);
    const isLocalMovingRef = useRef(false);
    const piecesRef = useRef<Piece[]>(INITIAL_BOARD_SETUP);
    const turnRef = useRef<Color>(Color.RED);
    const userRef = useRef<Player | undefined>(user);
    const opponentInfoRef = useRef<any>({ name: "..." });
    const moveHistoryRef = useRef<Move[]>([]);

    useEffect(() => { piecesRef.current = pieces; }, [pieces]);
    useEffect(() => { turnRef.current = turn; }, [turn]);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { opponentInfoRef.current = opponentInfo; }, [opponentInfo]);
    useEffect(() => { moveHistoryRef.current = moveHistory; }, [moveHistory]);

    const [timers, setTimers] = useState<{ red: number, black: number }>({ red: 600, black: 600 });

    const handleGameOver = useCallback(async (roomData: any) => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;
        
        const currentUser = userRef.current;
        const isWinner = roomData.winner_id === currentUser?.id;
        const reason = roomData.end_reason || 'checkmate';
        const oppName = opponentInfoRef.current?.name !== "..." ? opponentInfoRef.current.name : "Đối thủ";

        try {
            // Lấy history mới nhất (đã bao gồm nước cuối nếu có)
            const finalMoves = [...moveHistoryRef.current];
            const delta = await onGameEnd(isWinner ? 'win' : 'loss', finalMoves, oppName, reason);
            
            setGameResult({ 
                result: isWinner ? 'win' : 'loss', 
                delta, 
                reason, 
                moves: finalMoves,
                initialBoard: INITIAL_BOARD_SETUP
            });
            setStatus(isWinner ? GameStatus.CHECKMATE : GameStatus.RESIGNED);

            // Tự động xóa phòng sau 15s nếu là chủ phòng, nhưng người chơi có thể thoát sớm hơn
            if (mode === 'online' && !isBotMatch && roomData.id && roomData.red_player_id === currentUser?.id) {
                setTimeout(async () => {
                    await supabase.from('rooms').delete().eq('id', roomData.id);
                }, 15000);
            }
        } catch (error) {
            console.error("Lỗi khi xử lý kết thúc game:", error);
            setGameResult({ 
                result: isWinner ? 'win' : 'loss', 
                delta: 0, 
                reason, 
                moves: moveHistoryRef.current,
                initialBoard: INITIAL_BOARD_SETUP
            });
            setStatus(isWinner ? GameStatus.CHECKMATE : GameStatus.RESIGNED);
        }
    }, [onGameEnd, mode, isBotMatch]);

    const fetchRoomData = useCallback(async () => {
        if (!roomId || !userRef.current) return;
        try {
            const { data: room } = await supabase.from('rooms').select('*, red:red_player_id(*), black:black_player_id(*)').eq('id', roomId).single();
            if (room) {
                const currentUser = userRef.current;
                const amIRed = room.red_player_id === currentUser.id;
                const myAssignedColor = amIRed ? Color.RED : Color.BLACK;
                
                setMyColor(myAssignedColor);
                
                if (room.board_state) setPieces(room.board_state);
                if (room.turn) setTurn(room.turn as Color);
                
                const opp = amIRed ? room.black : room.red;
                if (opp) {
                    setOpponentInfo(opp);
                    opponentInfoRef.current = opp;
                }
                
                if (room.status === 'finished') {
                    handleGameOver(room);
                }
                
                setIsRoomLoaded(true);
            }
        } catch (e) {
            console.error("Lỗi tải phòng:", e);
        }
    }, [roomId, handleGameOver]);

    useEffect(() => {
        // NẾU LÀ BOT MATCH (Fake Online)
        if (isBotMatch) {
            setIsRoomLoaded(true);
            
            // Random màu cho người chơi để công bằng
            const randomColor = Math.random() > 0.5 ? Color.RED : Color.BLACK;
            setMyColor(randomColor);
            
            // Setup đối thủ bot với tên tiếng Anh ngẫu nhiên
            const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
            const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
            const oppData = { 
                name: randomName, 
                avatar: randomAvatar, 
                points: user?.points ? Math.max(1000, user.points + Math.floor(Math.random() * 200 - 100)) : 1200, 
                rankTier: "Vàng", 
                subRank: 3 
            };
            setOpponentInfo(oppData);
            opponentInfoRef.current = oppData;
            
            return;
        }

        // NẾU LÀ ONLINE THẬT
        if (mode === 'online' && roomId) {
            fetchRoomData();

            const channel = supabase.channel(`room-${roomId}`)
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'rooms', 
                    filter: `id=eq.${roomId}` 
                }, (payload) => {
                    const newData = payload.new;
                    const currentUser = userRef.current;

                    if (currentUser && newData.last_move_by === currentUser.id) {
                        // Nếu status đã đổi thành finished, xử lý kết thúc
                        if (newData.status === 'finished') handleGameOver(newData);
                        return;
                    }
                    
                    if (isLocalMovingRef.current) return;

                    // NHẬN DIỆN NƯỚC ĐI CỦA ĐỐI THỦ
                    if (newData.board_state && JSON.stringify(newData.board_state) !== JSON.stringify(piecesRef.current)) {
                        const oldPieces = piecesRef.current;
                        const newPieces = newData.board_state;
                        
                        // Tìm quân cờ vừa di chuyển
                        let detectedMove: Move | null = null;
                        for (const np of newPieces) {
                            const op = oldPieces.find(p => p.id === np.id);
                            if (op && (op.x !== np.x || op.y !== np.y)) {
                                detectedMove = { fromX: op.x, fromY: op.y, toX: np.x, toY: np.y };
                                break;
                            }
                        }

                        if (detectedMove) {
                            setMoveHistory(prev => [...prev, detectedMove!]);
                        }
                        
                        setPieces(newPieces);
                        setTurn(newData.turn as Color);
                    } else if (newData.turn !== turnRef.current) {
                        setTurn(newData.turn as Color);
                    }

                    if (newData.status === 'finished') {
                        handleGameOver(newData);
                    }
                })
                .subscribe();

            return () => { channel.unsubscribe(); };
        } else if (mode === 'ai') {
            setIsRoomLoaded(true);
            const storedColor = sessionStorage.getItem('ai_game_color');
            if (storedColor) {
                setMyColor(storedColor as Color);
            } else {
                const randomColor = Math.random() > 0.5 ? Color.RED : Color.BLACK;
                setMyColor(randomColor);
                sessionStorage.setItem('ai_game_color', randomColor);
            }
            setOpponentInfo({ name: "Máy Gemini", avatar: "🤖", points: 2500, rankTier: "Cao Thủ", subRank: 1 });
        }
    }, [roomId, mode, fetchRoomData, handleGameOver, isBotMatch, user?.points]);

    const handleCoinTossFinish = useCallback(() => {
        setShowCoinToss(false);
    }, []);

    useEffect(() => {
        if (status !== GameStatus.PLAYING || (!isBotMatch && mode !== 'online') || showCoinToss || !isRoomLoaded) return;
        
        const timerInterval = setInterval(() => {
            setTimers(prev => {
                const isRedTurn = turnRef.current === Color.RED;
                const newRed = isRedTurn ? Math.max(0, prev.red - 1) : prev.red;
                const newBlack = !isRedTurn ? Math.max(0, prev.black - 1) : prev.black;

                if (isRedTurn && newRed === 0 && myColor === Color.RED) {
                    executeSurrender('timeout');
                } else if (!isRedTurn && newBlack === 0 && myColor === Color.BLACK) {
                    executeSurrender('timeout');
                }

                return { red: newRed, black: newBlack };
            });
        }, 1000);

        return () => clearInterval(timerInterval);
    }, [status, mode, showCoinToss, myColor, isRoomLoaded, isBotMatch]);

    const executeSurrender = async (reason: string = 'resigned') => {
        if (status !== GameStatus.PLAYING || (!isBotMatch && mode !== 'online') || !user || isSurrendering) return;
        setIsSurrendering(true);
        setShowSurrenderConfirm(false);
        
        if (isBotMatch) {
            // Xử lý đầu hàng cho bot match (local)
            const fakeRoomData = {
                winner_id: 'bot_id', // User thua
                end_reason: reason
            };
            handleGameOver(fakeRoomData);
            return;
        }

        try {
            const { data: room, error: fetchError } = await supabase.from('rooms').select('*').eq('id', roomId).single();
            if (fetchError) throw fetchError;

            if (room) {
                const winnerId = myColor === Color.RED ? room.black_player_id : room.red_player_id;
                const { error: updateError } = await supabase.from('rooms').update({ 
                    status: 'finished', 
                    winner_id: winnerId, 
                    end_reason: reason 
                }).eq('id', roomId);
                
                if (updateError) throw updateError;
            }
        } catch (e) {
            console.error("Lỗi khi đầu hàng:", e);
            setIsSurrendering(false);
            setAlertConfig({
              title: "Lỗi Kết Nối",
              message: "Không thể gửi yêu cầu đầu hàng. Vui lòng kiểm tra lại mạng!",
              type: "error"
            });
        }
    };

    const handleExitGame = () => {
        sessionStorage.removeItem('ai_game_color');
        
        // Kiểm tra xem có phải đang ở chế độ đấu phòng không
        const isRoomMode = location.search.includes('mode=room');
        
        if (isRoomMode) {
            navigate('/room'); // Quay về sảnh chờ phòng
        } else {
            navigate('/'); // Quay về trang chủ (đối với đấu AI hoặc ghép trận ngẫu nhiên)
        }
    };

    const executeMove = async (fx: number, fy: number, tx: number, ty: number) => {
        const currentPieces = piecesRef.current;
        const piece = getPieceAt(currentPieces, fx, fy);
        if (!piece) return;
        
        const nextTurn = turnRef.current === Color.RED ? Color.BLACK : Color.RED;
        const newPieces = currentPieces
            .filter(p => !(p.x === tx && p.y === ty))
            .map(p => p.id === piece.id ? { ...p, x: tx, y: ty } : p);

        // Chuẩn bị history mới bao gồm cả nước này
        const newMove = { fromX: fx, fromY: fy, toX: tx, toY: ty };
        const updatedHistory = [...moveHistoryRef.current, newMove];
        setMoveHistory(updatedHistory);

        isLocalMovingRef.current = true;
        setPieces(newPieces);
        setTurn(nextTurn);

        const oppGeneral = newPieces.find(p => p.type === PieceType.GENERAL && p.color === nextTurn);
        const isGameOver = !oppGeneral;

        // XỬ LÝ LOGIC ONLINE THẬT
        if (mode === 'online' && !isBotMatch && roomId && user) {
            const updatePayload: any = {
                board_state: newPieces,
                turn: nextTurn,
                last_move_by: user.id
            };

            if (isGameOver) {
                updatePayload.status = 'finished';
                updatePayload.winner_id = user.id;
                updatePayload.end_reason = 'checkmate';
            }

            await supabase.from('rooms').update(updatePayload).eq('id', roomId);
            setTimeout(() => { isLocalMovingRef.current = false; }, 500);
        } 
        // XỬ LÝ LOGIC AI HOẶC BOT MATCH
        else if (mode === 'ai' || isBotMatch) {
            isLocalMovingRef.current = false;
            if (isGameOver) {
                setStatus(GameStatus.CHECKMATE);
                
                // Bot match cần giả lập object roomData để handleGameOver xử lý đúng (tính điểm rank)
                if (isBotMatch) {
                     const fakeRoomData = {
                        winner_id: user?.id,
                        end_reason: 'checkmate'
                    };
                    handleGameOver(fakeRoomData);
                } else {
                    // Chế độ đấu máy thông thường
                    await onGameEnd('win', updatedHistory, opponentInfo.name, 'checkmate');
                    setGameResult({ 
                        result: 'win', 
                        delta: 0, 
                        reason: 'checkmate', 
                        moves: updatedHistory,
                        initialBoard: INITIAL_BOARD_SETUP
                    });
                }
            }
        }
    };

    const handleAiTurn = async () => {
        if (isAiThinking || status !== GameStatus.PLAYING) return;
        setIsAiThinking(true);
        // Bot match suy nghĩ lâu hơn 1 chút cho giống người
        const thinkingTime = isBotMatch ? 1500 + Math.random() * 2000 : 600;
        await new Promise(r => setTimeout(r, thinkingTime));
        
        const move = await getBestMove(piecesRef.current, turnRef.current);
        if (move && move.fromX !== -1) {
            await executeMove(move.fromX, move.fromY, move.toX, move.toY);
        } else {
            const rand = getRandomMove(piecesRef.current, turnRef.current);
            if (rand) await executeMove(rand.fromX, rand.fromY, rand.toX, rand.toY);
        }
        setIsAiThinking(false);
    };

    useEffect(() => {
        // Kích hoạt AI turn nếu là mode AI hoặc Bot Match
        if (!showCoinToss && (mode === 'ai' || isBotMatch) && turn !== myColor && status === GameStatus.PLAYING) {
            handleAiTurn();
        }
    }, [turn, showCoinToss, mode, status, myColor, isBotMatch]);

    const onSquareClick = (x: number, y: number) => {
        if (showCoinToss || status !== GameStatus.PLAYING) return;
        if ((mode === 'online' || isBotMatch) && turn !== myColor) return;
        if (mode === 'ai' && turn !== myColor) return;
        
        if (selectedPiece) {
            const move = validMoves.find(m => m.toX === x && m.toY === y);
            if (move) {
                executeMove(selectedPiece.x, selectedPiece.y, x, y);
                setSelectedPiece(null);
                setValidMoves([]);
                return;
            }
        }

        const p = getPieceAt(piecesRef.current, x, y);
        if (p && p.color === turn) {
            setSelectedPiece(p);
            setValidMoves(getValidMoves(p, piecesRef.current));
        } else {
            setSelectedPiece(null);
            setValidMoves([]);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (!isRoomLoaded && (mode === 'online' || isBotMatch)) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Đang vào phòng...</p>
            </div>
        );
    }

    return (
        <div className="p-4 flex flex-col items-center gap-4 animate-fade-in relative h-full">
            {isRoomLoaded && showCoinToss && (
                <CoinToss 
                    resultColor={myColor} 
                    onFinish={handleCoinTossFinish} 
                    user={user} 
                    opponent={opponentInfo} 
                />
            )}
            {alertConfig && <AlertModal title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
            
            {showSurrenderConfirm && <SurrenderConfirmModal onConfirm={() => executeSurrender('resigned')} onCancel={() => setShowSurrenderConfirm(false)} />}
            
            {gameResult && (
                <GameResultModal 
                    {...gameResult} 
                    opponent={opponentInfo.name || "Đối thủ"} 
                    mode={mode} 
                    onClose={handleExitGame} 
                    playerId={user?.id || ''}
                />
            )}
            
            <div className="w-full max-sm:max-w-sm bg-slate-800 p-4 rounded-xl flex flex-col gap-3 border border-slate-700 shadow-xl">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <AvatarBox avatar={opponentInfo.avatar || ''} className="w-8 h-8" />
                        <span className="text-xs font-bold truncate max-w-[80px]">{opponentInfo.name}</span>
                    </div>
                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors ${turn === Color.RED ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/20 text-slate-400'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${turn === Color.RED ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                        {turn === Color.RED ? 'Lượt Đỏ' : 'Lượt Đen'}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400 truncate max-w-[80px]">{user?.name || "Bạn"}</span>
                        <AvatarBox avatar={user?.avatar || AVATARS[0]} className="w-8 h-8" />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${turn !== myColor ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30' : 'text-slate-500'}`}>
                        <Timer className="w-3.5 h-3.5" />
                        <span className="text-sm font-mono font-bold">{formatTime(myColor === Color.RED ? timers.black : timers.red)}</span>
                    </div>
                    <div className="text-[10px] font-black uppercase text-slate-600 tracking-widest">Hệ Thống</div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${turn === myColor ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30' : 'text-slate-500'}`}>
                        <Timer className="w-3.5 h-3.5" />
                        <span className="text-sm font-mono font-bold">{formatTime(myColor === Color.RED ? timers.red : timers.black)}</span>
                    </div>
                </div>
            </div>

            <Board 
                pieces={pieces} 
                onPieceClick={() => {}} 
                onSquareClick={onSquareClick} 
                selectedPiece={selectedPiece} 
                validMoves={validMoves} 
                lastMove={null} 
                checkedColor={isCheck(turn, pieces) ? turn : null} 
                rotate={myColor === Color.BLACK} 
            />
            
            <div className="w-full max-sm:max-w-sm flex gap-3">
                {mode === 'ai' ? (
                    <button 
                        onClick={handleExitGame} 
                        className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 font-bold uppercase active:scale-95 text-slate-400 text-sm flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Thoát trận
                    </button>
                ) : (
                    <>
                    {status !== GameStatus.PLAYING && (
                        <button onClick={handleExitGame} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 font-bold uppercase active:scale-95 text-slate-400 text-sm">Quay lại</button>
                    )}
                    {(mode === 'online' || isBotMatch) && status === GameStatus.PLAYING && (
                        <button 
                            onClick={() => setShowSurrenderConfirm(true)} 
                            disabled={isSurrendering} 
                            className="w-full bg-red-900/20 p-4 rounded-xl border border-red-500/30 font-black uppercase active:scale-95 text-red-500 text-sm flex items-center justify-center gap-2"
                        >
                            {isSurrendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />} 
                            {isSurrendering ? 'Đang xử lý...' : 'Đầu hàng'}
                        </button>
                    )}
                    </>
                )}
                
                {(mode === 'ai' || isBotMatch) && isAiThinking && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest text-center animate-pulse z-40 shadow-2xl">
                        {isBotMatch ? 'Đối thủ đang suy nghĩ...' : 'Máy đang tính toán...'}
                    </div>
                )}
            </div>
        </div>
    );
};
