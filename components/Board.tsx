
import React, { useEffect, useState } from 'react';
import { Piece, Color, PieceType, Move } from '../types';

interface BoardProps {
  pieces: Piece[];
  onPieceClick: (piece: Piece) => void;
  onSquareClick: (x: number, y: number) => void;
  selectedPiece: Piece | null;
  lastMove: Move | null;
  validMoves: Move[];
  checkedColor: Color | null;
  rotate?: boolean;
}

const PIECE_LABELS: Record<string, string> = {
  [`${Color.RED}-${PieceType.GENERAL}`]: '帥',
  [`${Color.RED}-${PieceType.ADVISOR}`]: '仕',
  [`${Color.RED}-${PieceType.ELEPHANT}`]: '相',
  [`${Color.RED}-${PieceType.HORSE}`]: '馬',
  [`${Color.RED}-${PieceType.CHARIOT}`]: '車',
  [`${Color.RED}-${PieceType.CANNON}`]: '炮',
  [`${Color.RED}-${PieceType.SOLDIER}`]: '兵',
  [`${Color.BLACK}-${PieceType.GENERAL}`]: '將',
  [`${Color.BLACK}-${PieceType.ADVISOR}`]: '士',
  [`${Color.BLACK}-${PieceType.ELEPHANT}`]: '象',
  [`${Color.BLACK}-${PieceType.HORSE}`]: '馬',
  [`${Color.BLACK}-${PieceType.CHARIOT}`]: '車',
  [`${Color.BLACK}-${PieceType.CANNON}`]: '砲',
  [`${Color.BLACK}-${PieceType.SOLDIER}`]: '卒',
};

const BoardComponent: React.FC<BoardProps> = ({ pieces, onPieceClick, onSquareClick, selectedPiece, validMoves, lastMove, checkedColor, rotate = false }) => {
  const [showCheckBanner, setShowCheckBanner] = useState(false);

  useEffect(() => {
    if (checkedColor) {
      setShowCheckBanner(true);
      const timer = setTimeout(() => setShowCheckBanner(false), 2200);
      return () => clearTimeout(timer);
    } else {
      setShowCheckBanner(false);
    }
  }, [checkedColor]);

  return (
    <div className="relative w-full max-w-[420px] aspect-[9/10] mx-auto shadow-2xl rounded-sm">
      {/* Banner thông báo */}
      {showCheckBanner && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none p-4">
          <div className="bg-red-600/95 backdrop-blur-md px-14 py-6 rounded-3xl border-2 border-white/30 shadow-[0_0_50px_rgba(220,38,38,0.8)] animate-bounce-in flex flex-col items-center min-w-max">
             <span className="text-white font-black text-2xl uppercase tracking-[0.2em] drop-shadow-xl whitespace-nowrap">CHIẾU TƯỚNG!</span>
             <div className="h-0.5 w-24 bg-white/40 mt-1 rounded-full"></div>
          </div>
        </div>
      )}

      {/* Bàn cờ chính */}
      <div className={`w-full h-full bg-[#eecfa1] transition-transform duration-700 overflow-hidden ${rotate ? 'rotate-180' : ''}`}>
        <svg 
          className="w-full h-full touch-none select-none" 
          viewBox="0 0 90 100" 
          preserveAspectRatio="xMidYMid meet"
          onClick={(e) => {
            const svg = e.currentTarget;
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            const x = Math.round((svgP.x - 5) / 10);
            const y = Math.round((svgP.y - 5) / 10);
            if (x >= 0 && x <= 8 && y >= 0 && y <= 9) {
              onSquareClick(x, y);
            }
          }}
        >
          <rect width="90" height="100" fill="#eecfa1" />
          
          {/* Lưới bàn cờ */}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`h-${i}`} x1="5" y1={5 + i * 10} x2="85" y2={5 + i * 10} stroke="#5d4037" strokeWidth="0.4" />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <React.Fragment key={`v-${i}`}>
              <line x1={5 + i * 10} y1="5" x2={5 + i * 10} y2="45" stroke="#5d4037" strokeWidth="0.4" />
              <line x1={5 + i * 10} y1="55" x2={5 + i * 10} y2="95" stroke="#5d4037" strokeWidth="0.4" />
            </React.Fragment>
          ))}
          
          <rect x="5" y="5" width="80" height="90" fill="none" stroke="#5d4037" strokeWidth="1.2" />
          
          {/* Cung tướng */}
          <line x1="35" y1="5" x2="55" y2="25" stroke="#5d4037" strokeWidth="0.4" opacity="0.6" />
          <line x1="55" y1="5" x2="35" y2="25" stroke="#5d4037" strokeWidth="0.4" opacity="0.6" />
          <line x1="35" y1="75" x2="55" y2="95" stroke="#5d4037" strokeWidth="0.4" opacity="0.6" />
          <line x1="55" y1="75" x2="35" y2="95" stroke="#5d4037" strokeWidth="0.4" opacity="0.6" />
          
          <text x="25" y="52" fontSize="5" className="font-chinese font-bold" fill="#5d4037" opacity="0.3" textAnchor="middle" transform={rotate ? "rotate(180, 25, 51)" : ""}>楚 河</text>
          <text x="65" y="52" fontSize="5" className="font-chinese font-bold" fill="#5d4037" opacity="0.3" textAnchor="middle" transform={rotate ? "rotate(180, 65, 51)" : ""}>漢 界</text>

          {/* Nước đi cuối cùng */}
          {lastMove && (
            <React.Fragment>
              <rect x={5 + lastMove.fromX * 10 - 4} y={5 + lastMove.fromY * 10 - 4} width="8" height="8" fill="rgba(59, 130, 246, 0.05)" stroke="rgba(59, 130, 246, 0.3)" strokeWidth="0.3" rx="1" />
              <circle cx={5 + lastMove.toX * 10} cy={5 + lastMove.toY * 10} r="4.8" fill="none" stroke="rgba(59, 130, 246, 0.5)" strokeWidth="0.6" strokeDasharray="1 1" />
            </React.Fragment>
          )}

          {/* Gợi ý nước đi hợp lệ */}
          {selectedPiece && validMoves.map((m, i) => (
            <circle key={i} cx={5 + m.toX * 10} cy={5 + m.toY * 10} r="1.5" fill="rgba(34, 197, 94, 0.5)" />
          ))}

          {/* --- LỚP QUÂN CỜ --- */}
          {pieces.map((piece) => {
            const isSelected = selectedPiece?.id === piece.id;
            const isGeneralChecked = piece.type === PieceType.GENERAL && piece.color === checkedColor;
            const colorHex = piece.color === Color.RED ? '#b71c1c' : '#212121';

            return (
              // Layer 1: Positioning (Xử lý tọa độ x, y) - KHÔNG apply animation ở đây để tránh override transform
              <g 
                key={piece.id} 
                className="cursor-pointer"
                onClick={() => onPieceClick(piece)}
                style={{ 
                  transform: `translate(${piece.x * 10}px, ${piece.y * 10}px)`,
                  transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: isSelected ? 50 : 10
                }}
              >
                {/* Layer 2: Animation (Xử lý rung lắc khi bị chiếu) */}
                <g className={isGeneralChecked ? "animate-shake-gentle" : ""}>
                    {/* Layer 3: Scaling (Xử lý phóng to khi chọn) */}
                    <g 
                       transform={isSelected ? `scale(1.15)` : ''} 
                       style={{ transformOrigin: '5px 5px', transition: 'transform 0.2s ease-out' }}
                    >
                      <circle 
                        cx="5" 
                        cy="5" 
                        r="4.4" 
                        fill="#f7f1e3" 
                        stroke={isGeneralChecked ? "#ef4444" : colorHex} 
                        strokeWidth={isGeneralChecked ? "1.4" : (isSelected ? "0.8" : "0.5")}
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
                        className={isGeneralChecked ? "animate-check-ring" : ""}
                      />
                      
                      <circle cx="5" cy="5" r="3.7" fill="none" stroke={colorHex} strokeWidth="0.1" opacity="0.3" />
                      
                      <text 
                        x="5" 
                        y="6.6" 
                        fontSize="4.8" 
                        textAnchor="middle" 
                        fill={colorHex} 
                        className="font-chinese font-bold pointer-events-none"
                        transform={rotate ? "rotate(180, 5, 5)" : ""}
                      >
                        {PIECE_LABELS[`${piece.color}-${piece.type}`]}
                      </text>

                      {isSelected && (
                        <circle cx="5" cy="5" r="4.8" fill="none" stroke="#3b82f6" strokeWidth="0.4" opacity="0.8" />
                      )}
                    </g>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <style>{`
        @keyframes shake-gentle {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(0.3px, -0.3px); }
          50% { transform: translate(-0.3px, 0.3px); }
          75% { transform: translate(0.3px, 0.3px); }
        }
        .animate-shake-gentle { animation: shake-gentle 0.15s infinite; }
        
        @keyframes bounce-in {
          0% { transform: scale(0.5) translateY(-20px); opacity: 0; }
          70% { transform: scale(1.1) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        @keyframes check-ring {
          0%, 100% { stroke: #ef4444; stroke-width: 1.4; }
          50% { stroke: #ff0000; stroke-width: 1.8; }
        }
        .animate-check-ring { animation: check-ring 0.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export const Board = React.memo(BoardComponent);
