
import React, { useState, useEffect, useRef } from 'react';
import { Timer } from 'lucide-react';
import { Color, GameStatus } from '../types';

interface GameTimerProps {
  turn: Color;
  myColor: Color;
  gameStatus: GameStatus;
  onTimeout: (color: Color) => void;
  // Dùng để kích hoạt render lại nếu cần, hoặc đồng bộ
  lastMoveTime?: number; 
}

export const GameTimer: React.FC<GameTimerProps> = ({ turn, myColor, gameStatus, onTimeout }) => {
  const [timers, setTimers] = useState<{ red: number, black: number }>({ red: 600, black: 600 });
  const turnRef = useRef(turn);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    if (gameStatus !== GameStatus.PLAYING) return;

    const interval = setInterval(() => {
      setTimers(prev => {
        const isRedTurn = turnRef.current === Color.RED;
        
        // Nếu hết giờ
        if (isRedTurn && prev.red <= 0) {
            onTimeout(Color.RED);
            return prev;
        }
        if (!isRedTurn && prev.black <= 0) {
            onTimeout(Color.BLACK);
            return prev;
        }

        return {
          red: isRedTurn ? Math.max(0, prev.red - 1) : prev.red,
          black: !isRedTurn ? Math.max(0, prev.black - 1) : prev.black
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, onTimeout]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-sm:max-w-sm bg-slate-800 p-4 rounded-xl flex flex-col gap-3 border border-slate-700 shadow-xl mb-4">
        {/* Children (Header info) sẽ được render từ bên ngoài vào nếu cần, nhưng ở đây ta chỉ render Timer bar */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${turn !== myColor ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30' : 'text-slate-500'}`}>
                <Timer className="w-3.5 h-3.5" />
                <span className="text-sm font-mono font-bold">
                    {formatTime(myColor === Color.RED ? timers.black : timers.red)}
                </span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${turn === myColor ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30' : 'text-slate-500'}`}>
                <Timer className="w-3.5 h-3.5" />
                <span className="text-sm font-mono font-bold">
                    {formatTime(myColor === Color.RED ? timers.red : timers.black)}
                </span>
            </div>
        </div>
    </div>
  );
};
