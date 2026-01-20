
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Board } from '../components/Board';
// Fix: Removed INITIAL_BOARD_SETUP and getPieceAt from '../types' as they are not exported there.
import { Piece, Color, Move } from '../types';
import { INITIAL_BOARD_SETUP as DEFAULT_PIECES } from '../services/xiangqiRules';
import { ChevronLeft, ChevronRight, RotateCcw, ArrowLeft, Loader2, Play, Pause } from 'lucide-react';
import { LoadingIndicator } from '../components/Shared';

const ReplayScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [currentPieces, setCurrentPieces] = useState<Piece[]>([]);
    const [moveIndex, setMoveIndex] = useState(-1); // -1 là trạng thái ban đầu
    const [isPlaying, setIsPlaying] = useState(false);
    const playTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const fetchMatch = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase.from('saved_matches').select('*').eq('id', id).single();
                if (error) throw error;
                setMatchData(data);
                setCurrentPieces(data.initial_board || DEFAULT_PIECES);
            } catch (e) {
                console.error("Lỗi tải replay:", e);
                navigate('/history');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMatch();
    }, [id, navigate]);

    const goToMove = useCallback((index: number) => {
        if (!matchData) return;
        const initial = matchData.initial_board || DEFAULT_PIECES;
        const moves = matchData.moves || [];
        
        // Luôn bắt đầu từ bàn cờ ban đầu
        let pieces = JSON.parse(JSON.stringify(initial));
        
        // Thực hiện tuần tự các nước đi đến index
        for (let i = 0; i <= index; i++) {
            const m = moves[i];
            const piece = pieces.find((p: any) => p.x === m.fromX && p.y === m.fromY);
            if (piece) {
                // Ăn quân nếu có
                pieces = pieces.filter((p: any) => !(p.x === m.toX && p.y === m.toY));
                // Di chuyển quân
                piece.x = m.toX;
                piece.y = m.toY;
            }
        }
        
        setCurrentPieces(pieces);
        setMoveIndex(index);
    }, [matchData]);

    const handleNext = useCallback(() => {
        if (!matchData || moveIndex >= matchData.moves.length - 1) {
            setIsPlaying(false);
            return;
        }
        goToMove(moveIndex + 1);
    }, [matchData, moveIndex, goToMove]);

    const handlePrev = () => {
        if (moveIndex < 0) return;
        goToMove(moveIndex - 1);
        setIsPlaying(false);
    };

    const handleReset = () => {
        if (!matchData) return;
        setCurrentPieces(matchData.initial_board || DEFAULT_PIECES);
        setMoveIndex(-1);
        setIsPlaying(false);
    };

    useEffect(() => {
        if (isPlaying) {
            playTimerRef.current = window.setInterval(() => {
                handleNext();
            }, 1500);
        } else {
            if (playTimerRef.current) clearInterval(playTimerRef.current);
        }
        return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
    }, [isPlaying, handleNext]);

    if (isLoading) return <LoadingIndicator message="Đang dựng lại kỳ đài..." />;

    const moves = matchData?.moves || [];
    const currentMove = moveIndex >= 0 ? moves[moveIndex] : null;

    return (
        <div className="p-4 flex flex-col items-center gap-4 animate-fade-in relative h-full max-w-lg mx-auto pb-10">
            <div className="w-full flex items-center justify-between mb-2">
                <button onClick={() => navigate('/history')} className="p-2 text-slate-400 active:scale-95 transition-all">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-center">
                    <h2 className="text-white font-black uppercase text-sm italic tracking-widest">Xem Lại Trận Đấu</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">vs {matchData?.opponent_name}</p>
                </div>
                <div className="w-10"></div>
            </div>

            <Board 
                pieces={currentPieces} 
                onPieceClick={() => {}} 
                onSquareClick={() => {}} 
                selectedPiece={null} 
                validMoves={[]} 
                lastMove={currentMove} 
                checkedColor={null} 
                rotate={false} 
            />

            <div className="w-full bg-slate-900/80 p-5 rounded-[2rem] border border-slate-800 shadow-xl space-y-5">
                <div className="flex flex-col items-center gap-1">
                    <div className="text-white font-black text-xs uppercase tracking-widest">
                        Nước đi: {moveIndex + 1} / {moves.length}
                    </div>
                    <div className="w-full h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300" 
                            style={{ width: `${((moveIndex + 1) / moves.length) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-4">
                    <button 
                        onClick={handleReset}
                        className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:text-white transition-all active:scale-90"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={handlePrev}
                        disabled={moveIndex < 0}
                        className="p-5 bg-slate-800 text-white rounded-2xl disabled:opacity-30 active:scale-90 transition-all"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-6 rounded-3xl shadow-lg active:scale-90 transition-all ${isPlaying ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}
                    >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>

                    <button 
                        onClick={handleNext}
                        disabled={moveIndex >= moves.length - 1}
                        className="p-5 bg-slate-800 text-white rounded-2xl disabled:opacity-30 active:scale-90 transition-all"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
            
            <div className="w-full text-center">
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Sử dụng các phím điều khiển để xem lại ván đấu</p>
            </div>
        </div>
    );
};

export default ReplayScreen;
