
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Board } from '../components/Board';
import { GameTimer } from '../components/GameTimer';
import { GameResultModal, SurrenderConfirmModal, AlertModal, OpponentProfileModal } from '../components/Modals';
import CoinToss from '../components/CoinToss';
import { AvatarBox } from '../components/Shared';
import { AVATARS } from '../constants';
import { 
    getSafeMoves, 
    INITIAL_BOARD_SETUP, 
    getPieceAt, 
    getRandomMove, 
    isCheck, 
    hasValidMoves, 
    isPawnProgress 
} from '../services/xiangqiRules';
import { getBestMove } from '../services/geminiService';
import { Piece, Color, Move, Player, GameStatus, PieceType } from '../types';
import { Flag, Loader2 } from 'lucide-react';

const RANDOM_NAMES = [
    "张伟", "李娜", "王芳", "陈静", 
    "김지훈", "박서jun", "이영희", 
    "佐藤 健", "田中 結衣", "鈴木 一郎", 
    "Robert J. Miller", "Sarah Henderson", "Alex Thompson", "Emily Watson", 
    "John Smith", "David Wilson", "Emma Stone", "Sophia Brown"
];

const MAX_MOVES_TOTAL = 300;
const MAX_MOVES_EFFECTIVE = 120;
const MAX_MOVES_PROGRESS = 60;

export const GameScreen = ({ mode, user, onGameEnd }: { 
    mode: 'ai' | 'online', 
    user?: Player, 
    onGameEnd: (result: 'win' | 'loss' | 'draw', moves: Move[], opponent: string, opponentPoints: number, reason?: string, mode?: 'online' | 'ai' | 'room') => Promise<number> 
}) => {
    const params = useParams();
    const roomId = params.roomId;
    const navigate = useNavigate();
    const location = useLocation();
    
    const isBotMatch = new URLSearchParams(location.search).get('bot') === 'true';
    const queryBotName = new URLSearchParams(location.search).get('botName');
    const isRoomMode = mode === 'online' && (new URLSearchParams(location.search).get('mode') === 'room' || window.location.hash.includes('mode=room'));

    // Determine effective mode for scoring: 'online' (Ranked), 'room' (Unranked), or 'ai' (Unranked)
    const effectiveMode = isRoomMode ? 'room' : (mode === 'ai' ? 'ai' : 'online');

    // State Initialization
    const [isRoomLoaded, setIsRoomLoaded] = useState(mode === 'ai');
    const [pieces, setPieces] = useState<Piece[]>(INITIAL_BOARD_SETUP);
    const [turn, setTurn] = useState<Color>(Color.RED);
    
    // Initialize color immediately for AI to ensure CoinToss has correct prop on first render
    const [myColor, setMyColor] = useState<Color>(() => {
        if (mode === 'ai') return Math.random() > 0.5 ? Color.RED : Color.BLACK;
        return Color.RED;
    });

    // Initialize opponent info immediately for AI
    const [opponentInfo, setOpponentInfo] = useState<any>(() => {
        if (mode === 'ai') return { name: "Máy", avatar: "🤖", points: 2500, rankTier: "Cao Thủ", subRank: 1, wins: 999, losses: 1 };
        return { name: "...", points: 1200 };
    });

    const [status, setStatus] = useState<GameStatus>(GameStatus.PLAYING);
    const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
    const [validMoves, setValidMoves] = useState<Move[]>([]);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [gameResult, setGameResult] = useState<{result: 'win' | 'loss' | 'draw', delta: number, reason?: string, moves: Move[], initialBoard: Piece[]} | null>(null);
    const [showCoinToss, setShowCoinToss] = useState(true);
    const [isSurrendering, setIsSurrendering] = useState(false);
    const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
    const [showOpponentProfile, setShowOpponentProfile] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{title: string, message: string, type: 'error' | 'info'} | null>(null);
    const [moves, setMoves] = useState<Move[]>([]);
    
    const hasEndedRef = useRef(false);
    const isLocalMovingRef = useRef(false);
    const piecesRef = useRef<Piece[]>(INITIAL_BOARD_SETUP);
    const turnRef = useRef<Color>(Color.RED);
    const userRef = useRef<Player | undefined>(user);
    const opponentInfoRef = useRef<any>(opponentInfo);
    const movesRef = useRef<Move[]>([]);
    const channelRef = useRef<any>(null);

    const effectiveMoveCountRef = useRef(0);
    const progressMoveCountRef = useRef(0);
    const redPerpetualCheckRef = useRef(0);
    const blackPerpetualCheckRef = useRef(0);

    const [lastActionTime, setLastActionTime] = useState(Date.now());
    const lastActionTimeRef = useRef(Date.now());

    useEffect(() => { piecesRef.current = pieces; }, [pieces]);
    useEffect(() => { turnRef.current = turn; }, [turn]);
    useEffect(() => { userRef.current = user; }, [user]);
    useEffect(() => { opponentInfoRef.current = opponentInfo; }, [opponentInfo]);
    useEffect(() => { movesRef.current = moves; }, [moves]);
    useEffect(() => { lastActionTimeRef.current = lastActionTime; }, [lastActionTime]);

    const handleGameOver = useCallback(async (roomData: any, extraMove: Move | null = null) => {
        if (hasEndedRef.current) return;
        hasEndedRef.current = true;
        
        const currentUser = userRef.current;
        let result: 'win' | 'loss' | 'draw' = 'loss';
        
        if (roomData.winner_id === 'draw' || roomData.winner_id === 'draw_by_moves') {
            result = 'draw';
        } else if (roomData.winner_id === currentUser?.id) {
            result = 'win';
        } else {
            result = 'loss';
        }

        const reason = roomData.end_reason || 'checkmate';
        const oppName = opponentInfoRef.current?.name !== "..." ? opponentInfoRef.current.name : "Đối thủ";
        const oppPoints = opponentInfoRef.current?.points || 1200;
        const finalMoves = extraMove ? [...movesRef.current, extraMove] : [...movesRef.current];

        setGameResult({ 
            result, 
            delta: 0, 
            reason, 
            moves: finalMoves,
            initialBoard: INITIAL_BOARD_SETUP
        });
        setStatus(result === 'win' ? GameStatus.CHECKMATE : result === 'draw' ? GameStatus.DRAW : GameStatus.RESIGNED);

        try {
            const delta = await onGameEnd(result, finalMoves, oppName, oppPoints, reason, effectiveMode);
            setGameResult(prev => prev ? { ...prev, delta } : null);
        } catch (error) {
            console.error("Lỗi cập nhật điểm:", error);
        }
    }, [onGameEnd, effectiveMode]);

    const executeSurrender = useCallback(async (reason: string = 'resigned') => {
        if (status !== GameStatus.PLAYING || isSurrendering) return;
        setIsSurrendering(true);
        setShowSurrenderConfirm(false);
        if (mode === 'ai' || isBotMatch) {
            handleGameOver({ winner_id: 'bot_id', end_reason: reason });
            return;
        }
        try {
            const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
            if (room) {
                const winnerId = myColor === Color.RED ? room.black_player_id : room.red_player_id;
                await supabase.from('rooms').update({ status: 'finished', winner_id: winnerId, end_reason: reason }).eq('id', roomId);
            }
        } catch (e) { setIsSurrendering(false); }
    }, [status, isSurrendering, mode, isBotMatch, roomId, myColor, handleGameOver]);

    const handleTimeout = useCallback((timeoutColor: Color) => {
        if (timeoutColor === myColor) {
            executeSurrender('timeout');
        }
    }, [myColor, executeSurrender]);

    useEffect(() => {
        if (status !== GameStatus.PLAYING || showCoinToss || !isRoomLoaded || hasEndedRef.current) return;
        
        const timer = setTimeout(() => {
             if (turn === myColor) {
                 if (!hasValidMoves(pieces, turn)) {
                    const winnerColor = turn === Color.RED ? Color.BLACK : Color.RED;
                    const isInCheck = isCheck(turn, pieces);
                    const endReason = isInCheck ? 'checkmate' : 'stalemate';
                    
                    let winnerId = 'bot_id';
                    if (mode === 'online' && !isBotMatch && roomId) {
                         winnerId = winnerColor === myColor ? (user?.id || '') : 'opp_id';
                    } else {
                         winnerId = winnerColor === myColor ? (user?.id || '') : 'bot_id';
                    }
                    
                    handleGameOver({ winner_id: winnerId, end_reason: endReason });
                 }
             }
        }, 1000);
        return () => clearTimeout(timer);
    }, [pieces, turn, status, showCoinToss, isRoomLoaded, mode, isBotMatch, roomId, myColor, user, handleGameOver]);

    const handleBackToRoom = async () => {
        if (!roomId || !isRoomMode) return;
        try {
            const { data: room } = await supabase.from('rooms').select('status').eq('id', roomId).single();
            if (room && room.status === 'finished') {
                await supabase.from('rooms').update({ 
                    status: 'waiting',
                    board_state: INITIAL_BOARD_SETUP,
                    turn: 'red',
                    winner_id: null,
                    end_reason: null
                }).eq('id', roomId);
            }
            navigate('/room');
        } catch (e) {
            navigate('/room');
        }
    };

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
                
                if (room.status === 'playing' && room.last_move_by) {
                     setShowCoinToss(false);
                     setLastActionTime(Date.now());
                }

                if (room.status === 'finished') handleGameOver(room);
                setIsRoomLoaded(true);
            }
        } catch (e) { console.error("Lỗi tải phòng:", e); }
    }, [roomId, handleGameOver]);

    useEffect(() => {
        if (isBotMatch) {
            setIsRoomLoaded(true);
            const randomColor = Math.random() > 0.5 ? Color.RED : Color.BLACK;
            setMyColor(randomColor);
            const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
            const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
            const oppData = { 
                name: queryBotName || randomName, 
                avatar: randomAvatar, 
                points: user?.points ? Math.max(1000, user.points + Math.floor(Math.random() * 200 - 100)) : 1200, 
                rankTier: "Vàng", subRank: 3,
                wins: Math.floor(Math.random() * 100),
                losses: Math.floor(Math.random() * 100)
            };
            setOpponentInfo(oppData);
            opponentInfoRef.current = oppData;
            setLastActionTime(Date.now());
            return;
        }
        if (mode === 'online' && roomId) {
            fetchRoomData();
            const channel = supabase.channel(`room-${roomId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                    const newData = payload.new;
                    const currentUser = userRef.current;
                    
                    if (newData.status === 'finished') {
                        handleGameOver(newData);
                        return;
                    }

                    if (currentUser && newData.last_move_by === currentUser.id) return;
                    if (isLocalMovingRef.current) return;

                    if (newData.board_state && JSON.stringify(newData.board_state) !== JSON.stringify(piecesRef.current)) {
                        setPieces(newData.board_state);
                        setTurn(newData.turn as Color);
                        setLastActionTime(Date.now());
                    } else if (newData.turn !== turnRef.current) {
                        setTurn(newData.turn as Color);
                        setLastActionTime(Date.now());
                    }
                })
                .on('broadcast', { event: 'game_move' }, (payload) => {
                    const { move, sender_id, isGameOver, winner_id, end_reason } = payload.payload;
                    if (sender_id !== userRef.current?.id) {
                        setMoves(prev => [...prev, move]);
                        
                        if (isGameOver) {
                            handleGameOver({ 
                                winner_id: winner_id || sender_id, 
                                status: 'finished', 
                                end_reason: end_reason || 'checkmate' 
                            }, move);
                        }
                    }
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => { 
                    if (isRoomMode) navigate('/room');
                    else navigate('/');
                })
                .subscribe();
            
            channelRef.current = channel;
            return () => { channel.unsubscribe(); };
        } else if (mode === 'ai') {
            setLastActionTime(Date.now());
        }
    }, [roomId, mode, fetchRoomData, handleGameOver, isBotMatch, user?.points, isRoomMode, queryBotName]);

    const handleCoinTossFinish = useCallback(() => { 
        setShowCoinToss(false); 
        setLastActionTime(Date.now());
    }, []);

    const executeMove = async (fx: number, fy: number, tx: number, ty: number) => {
        const currentPieces = piecesRef.current;
        const currentTurn = turnRef.current;
        const piece = getPieceAt(currentPieces, fx, fy);
        if (!piece) return;

        const oppColor = currentTurn === Color.RED ? Color.BLACK : Color.RED;
        const capturedPiece = getPieceAt(currentPieces, tx, ty);
        
        const nextTurn = oppColor;
        const newPieces = currentPieces.filter(p => !(p.x === tx && p.y === ty)).map(p => p.id === piece.id ? { ...p, x: tx, y: ty } : p);
        const newMove = { fromX: fx, fromY: fy, toX: tx, toY: ty };
        
        movesRef.current = [...movesRef.current, newMove];
        setMoves(movesRef.current);
        setLastActionTime(Date.now());
        
        const moveIsCheck = isCheck(oppColor, newPieces);
        const moveIsPawnProgress = isPawnProgress(newMove, currentPieces);

        if (capturedPiece || moveIsPawnProgress) {
            progressMoveCountRef.current = 0;
        } else {
            progressMoveCountRef.current += 1;
        }

        if (!moveIsCheck) {
            effectiveMoveCountRef.current += 1;
        }

        if (currentTurn === Color.RED) {
            redPerpetualCheckRef.current = moveIsCheck ? redPerpetualCheckRef.current + 1 : 0;
        } else {
            blackPerpetualCheckRef.current = moveIsCheck ? blackPerpetualCheckRef.current + 1 : 0;
        }

        let winnerIdByViolation = null;
        let violationReason = null;

        if (redPerpetualCheckRef.current >= 12) {
            winnerIdByViolation = 'bot_id';
            violationReason = 'perpetual_check';
        } else if (blackPerpetualCheckRef.current >= 12) {
            winnerIdByViolation = userRef.current?.id;
            violationReason = 'perpetual_check';
        }

        if (!winnerIdByViolation) {
            if (movesRef.current.length >= MAX_MOVES_TOTAL) {
                winnerIdByViolation = 'draw';
                violationReason = 'total_moves_limit';
            } else if (effectiveMoveCountRef.current >= MAX_MOVES_EFFECTIVE) {
                winnerIdByViolation = 'draw';
                violationReason = 'effective_moves_limit';
            } else if (progressMoveCountRef.current >= MAX_MOVES_PROGRESS) {
                winnerIdByViolation = 'draw';
                violationReason = 'progress_moves_limit';
            }
        }
        
        if (!winnerIdByViolation) {
            const nextPlayerHasMoves = hasValidMoves(newPieces, nextTurn);
            if (!nextPlayerHasMoves) {
                const isKill = isCheck(nextTurn, newPieces);
                const moverId = (mode === 'ai' || isBotMatch) && currentTurn !== myColor 
                    ? 'bot_id' 
                    : userRef.current?.id;
                
                winnerIdByViolation = moverId;
                violationReason = isKill ? 'checkmate' : 'stalemate';
            }
        }

        isLocalMovingRef.current = true;
        setPieces(newPieces);
        
        if (!winnerIdByViolation) {
            setTurn(nextTurn);
        }
        
        if (mode === 'online' && !isBotMatch && roomId && user) {
            const realWinnerId = winnerIdByViolation === 'bot_id' ? 'opp_id' : winnerIdByViolation;

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'game_move',
                    payload: { 
                        move: newMove, 
                        sender_id: user.id, 
                        isGameOver: winnerIdByViolation !== null, 
                        winner_id: realWinnerId, 
                        end_reason: violationReason 
                    }
                });
            }

            const updatePayload: any = { board_state: newPieces, turn: nextTurn, last_move_by: user.id };
            
            if (winnerIdByViolation) { 
                updatePayload.status = 'finished'; 
                updatePayload.winner_id = realWinnerId; 
                updatePayload.end_reason = violationReason; 
                
                handleGameOver(updatePayload, newMove);
            }

            const dbPromise = supabase.from('rooms').update(updatePayload).eq('id', roomId);
            if (!winnerIdByViolation) {
                await dbPromise;
            } else {
                dbPromise.catch(console.error);
            }
            
            setTimeout(() => { isLocalMovingRef.current = false; }, 500);
        } else if (mode === 'ai' || isBotMatch) {
            if (!winnerIdByViolation) {
                setTurn(nextTurn);
            }
            isLocalMovingRef.current = false;
            if (winnerIdByViolation) handleGameOver({ winner_id: winnerIdByViolation, end_reason: violationReason }, newMove);
        }
    };

    const handleAiTurn = async () => {
        if (isAiThinking || status !== GameStatus.PLAYING) return;
        setIsAiThinking(true);
        const thinkingTime = isBotMatch ? 1500 + Math.random() * 2000 : 600;
        await new Promise(r => setTimeout(r, thinkingTime));
        const move = await getBestMove(piecesRef.current, turnRef.current);
        if (move && move.fromX !== -1) await executeMove(move.fromX, move.fromY, move.toX, move.toY);
        else {
            const rand = getRandomMove(piecesRef.current, turnRef.current);
            if (rand) await executeMove(rand.fromX, rand.fromY, rand.toX, rand.toY);
        }
        setIsAiThinking(false);
    };

    useEffect(() => {
        if (!showCoinToss && (mode === 'ai' || isBotMatch) && turn !== myColor && status === GameStatus.PLAYING) handleAiTurn();
    }, [turn, showCoinToss, mode, status, myColor, isBotMatch]);

    const onSquareClick = (x: number, y: number) => {
        if (showCoinToss || status !== GameStatus.PLAYING) return;
        if ((mode === 'online' || isBotMatch) && turn !== myColor) return;
        if (mode === 'ai' && turn !== myColor) return;

        setLastActionTime(Date.now());

        if (turn === myColor && !hasValidMoves(piecesRef.current, turn)) {
             const winnerColor = turn === Color.RED ? Color.BLACK : Color.RED;
             const endReason = isCheck(turn, piecesRef.current) ? 'checkmate' : 'stalemate';
             handleGameOver({ winner_id: 'bot_id', end_reason: endReason });
             return;
        }

        if (selectedPiece) {
            const move = validMoves.find(m => m.toX === x && m.toY === y);
            if (move) { executeMove(selectedPiece.x, selectedPiece.y, x, y); setSelectedPiece(null); setValidMoves([]); return; }
        }
        const p = getPieceAt(piecesRef.current, x, y);
        if (p && p.color === turn) { 
            setSelectedPiece(p); 
            setValidMoves(getSafeMoves(p, piecesRef.current)); 
        }
        else { setSelectedPiece(null); setValidMoves([]); }
    };

    const handleExitGame = async () => {
        if (isBotMatch || mode === 'ai') { navigate('/'); return; }
        if (roomId && user) {
            try {
                const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
                if (room) {
                    if (room.red_player_id === user.id) await supabase.from('rooms').delete().eq('id', roomId);
                    else await supabase.from('rooms').update({ black_player_id: null, status: 'waiting', board_state: INITIAL_BOARD_SETUP }).eq('id', roomId);
                }
            } catch (e) {}
        }
        if (isRoomMode) navigate('/room');
        else navigate('/');
    };

    if (!isRoomLoaded && (mode === 'online' || isBotMatch)) {
        return <div className="flex flex-col items-center justify-center h-full gap-4"><Loader2 className="w-8 h-8 text-red-500 animate-spin" /><p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Đang chuẩn bị...</p></div>;
    }

    return (
        <div className="p-4 flex flex-col items-center gap-4 animate-fade-in relative h-full">
            {isRoomLoaded && showCoinToss && <CoinToss resultColor={myColor} onFinish={handleCoinTossFinish} user={user} opponent={opponentInfo} />}
            {alertConfig && <AlertModal title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={() => setAlertConfig(null)} />}
            {showSurrenderConfirm && <SurrenderConfirmModal onConfirm={() => executeSurrender('resigned')} onCancel={() => setShowSurrenderConfirm(false)} />}
            {showOpponentProfile && <OpponentProfileModal opponent={opponentInfo} onClose={() => setShowOpponentProfile(false)} />}
            {gameResult && <GameResultModal {...gameResult} opponent={opponentInfo.name} mode={effectiveMode} onClose={handleExitGame} playerId={user?.id || ''} onBackToRoom={isRoomMode ? handleBackToRoom : undefined} />}
            
            <div className="w-full max-sm:max-w-sm bg-slate-800 p-4 rounded-xl flex flex-col gap-3 border border-slate-700 shadow-xl">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded-lg transition-colors" onClick={() => setShowOpponentProfile(true)}>
                        <AvatarBox avatar={opponentInfo.avatar || ''} className="w-8 h-8" />
                        <span className="text-xs font-bold truncate max-w-[80px]">{opponentInfo.name}</span>
                    </div>

                    <div className={`px-4 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 transition-colors ${turn === Color.RED ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/20 text-slate-400'}`}>
                        <div className={`w-2 h-2 rounded-full animate-pulse ${turn === Color.RED ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                        {turn === Color.RED ? 'Lượt Đỏ' : 'Lượt Đen'}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-400 truncate max-w-[80px]">{user?.name}</span>
                        <AvatarBox avatar={user?.avatar || AVATARS[0]} className="w-8 h-8" />
                    </div>
                </div>

                <GameTimer 
                  turn={turn}
                  myColor={myColor}
                  gameStatus={status}
                  onTimeout={handleTimeout}
                  lastMoveTime={lastActionTime}
                />
            </div>

            <Board pieces={pieces} onPieceClick={() => {}} onSquareClick={onSquareClick} selectedPiece={selectedPiece} validMoves={validMoves} lastMove={moves.length > 0 ? moves[moves.length - 1] : null} checkedColor={isCheck(turn, pieces) ? turn : null} rotate={myColor === Color.BLACK} />
            
            <div className="w-full max-sm:max-w-sm mt-4 flex flex-col items-center">
                {status === GameStatus.PLAYING && (
                    <button 
                        onClick={() => setShowSurrenderConfirm(true)} 
                        disabled={isSurrendering} 
                        className="w-full max-w-[280px] py-4 rounded-[1.25rem] bg-red-900/20 border border-red-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.97] hover:bg-red-900/30 group"
                    >
                        {isSurrendering ? (
                           <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                        ) : (
                           <Flag className="w-5 h-5 text-red-500 group-hover:animate-bounce" />
                        )}
                        <span className="text-red-500 font-black uppercase text-xs tracking-widest">
                            {isSurrendering ? 'Đang gửi yêu cầu...' : 'Chấp nhận thua'}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};
