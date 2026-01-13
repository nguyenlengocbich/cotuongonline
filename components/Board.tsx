import React from 'react';
import { Piece, Color, PieceType, Move } from '../types';

interface BoardProps {
  pieces: Piece[];
  onPieceClick: (piece: Piece) => void;
  onSquareClick: (x: number, y: number) => void;
  selectedPiece: Piece | null;
  lastMove: Move | null;
  validMoves: Move[];
  checkedColor: Color | null; // Cấp màu đang bị chiếu
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

export const Board: React.FC<BoardProps> = ({ pieces, onPieceClick, onSquareClick, selectedPiece, validMoves, lastMove, checkedColor }) => {
  const renderGrid = () => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 90 100">
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#5d4037" strokeWidth="0.5" />
          </pattern>
        </defs>
        
        <rect width="90" height="100" fill="#eecfa1" />
        
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h-${i}`} x1="5" y1={5 + i * 10} x2="85" y2={5 + i * 10} stroke="#5d4037" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <React.Fragment key={`v-${i}`}>
            <line x1={5 + i * 10} y1="5" x2={5 + i * 10} y2="45" stroke="#5d4037" strokeWidth="0.5" />
            <line x1={5 + i * 10} y1="55" x2={5 + i * 10} y2="95" stroke="#5d4037" strokeWidth="0.5" />
          </React.Fragment>
        ))}
        
        <rect x="3" y="3" width="84" height="94" fill="none" stroke="#5d4037" strokeWidth="1" />
        
        <line x1="35" y1="5" x2="55" y2="25" stroke="#5d4037" strokeWidth="0.5" />
        <line x1="55" y1="5" x2="35" y2="25" stroke="#5d4037" strokeWidth="0.5" />
        <line x1="35" y1="75" x2="55" y2="95" stroke="#5d4037" strokeWidth="0.5" />
        <line x1="55" y1="75" x2="35" y2="95" stroke="#5d4037" strokeWidth="0.5" />
        
        <text x="25" y="52" fontSize="5" className="font-chinese" fill="#5d4037" opacity="0.6">楚 河</text>
        <text x="65" y="52" fontSize="5" className="font-chinese" fill="#5d4037" opacity="0.6">漢 界</text>

        {[
          [1, 2], [7, 2], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],
          [1, 7], [7, 7], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6],
        ].map(([gx, gy], idx) => {
            const cx = 5 + gx * 10;
            const cy = 5 + gy * 10;
            const o = 1; const l = 3;
            return <React.Fragment key={idx}>
               <path d={`M ${cx-o} ${cy-o} L ${cx-l} ${cy-o} M ${cx-o} ${cy-o} L ${cx-o} ${cy-l}`} stroke="#5d4037" fill="none" strokeWidth="0.5" />
               <path d={`M ${cx+o} ${cy-o} L ${cx+l} ${cy-o} M ${cx+o} ${cy-o} L ${cx+o} ${cy-l}`} stroke="#5d4037" fill="none" strokeWidth="0.5" />
               <path d={`M ${cx-o} ${cy+o} L ${cx-l} ${cy+o} M ${cx-o} ${cy+o} L ${cx-o} ${cy+l}`} stroke="#5d4037" fill="none" strokeWidth="0.5" />
               <path d={`M ${cx+o} ${cy+o} L ${cx+l} ${cy+o} M ${cx+o} ${cy+o} L ${cx+o} ${cy+l}`} stroke="#5d4037" fill="none" strokeWidth="0.5" />
            </React.Fragment>
        })}

        {selectedPiece && validMoves.map((m, i) => (
             <circle key={i} cx={5 + m.toX * 10} cy={5 + m.toY * 10} r="1.5" fill="rgba(0, 128, 0, 0.5)" />
        ))}
        
        {lastMove && (
             <>
               <rect x={5 + lastMove.fromX * 10 - 4.5} y={5 + lastMove.fromY * 10 - 4.5} width="9" height="9" fill="rgba(255, 255, 0, 0.3)" />
               <rect x={5 + lastMove.toX * 10 - 4.5} y={5 + lastMove.toY * 10 - 4.5} width="9" height="9" fill="rgba(255, 255, 0, 0.3)" />
             </>
        )}
      </svg>
    );
  };

  return (
    <div className="relative w-full max-w-md aspect-[9/10] mx-auto shadow-2xl rounded-lg overflow-hidden bg-[#eecfa1]">
      {renderGrid()}
      
      <div className="absolute inset-0 grid grid-cols-9 grid-rows-10 z-10">
         {Array.from({ length: 90 }).map((_, i) => {
             const x = i % 9;
             const y = Math.floor(i / 9);
             return (
                 <div 
                    key={i} 
                    className="w-full h-full cursor-pointer"
                    onClick={() => onSquareClick(x, y)}
                 />
             )
         })}
      </div>

      <div className="absolute inset-0 pointer-events-none z-20">
        {pieces.map((piece) => {
          const isSelected = selectedPiece?.id === piece.id;
          const isGeneralChecked = piece.type === PieceType.GENERAL && piece.color === checkedColor;
          
          return (
            <div
              key={piece.id}
              className={`absolute w-[10%] h-[9%] flex items-center justify-center transition-all duration-300 transform ${isSelected ? 'scale-110 drop-shadow-xl z-30' : 'z-20'}`}
              style={{
                left: `${(piece.x / 9) * 100}%`,
                top: `${(piece.y / 10) * 100}%`,
                width: `${100/9}%`,
                height: `${100/10}%`,
              }}
            >
              <div 
                className={`
                  w-[85%] h-[85%] rounded-full border-2 
                  flex items-center justify-center
                  shadow-md
                  font-chinese font-bold text-xl sm:text-2xl select-none
                  ${piece.color === Color.RED 
                    ? 'bg-[#f7f1e3] border-[#b71c1c] text-[#b71c1c]' 
                    : 'bg-[#f7f1e3] border-[#212121] text-[#212121]'}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  ${isGeneralChecked ? 'ring-4 ring-red-600 animate-pulse bg-red-100 shadow-[0_0_15px_rgba(220,38,38,0.8)]' : ''}
                `}
              >
                 <div className="mb-1">{PIECE_LABELS[`${piece.color}-${piece.type}`]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};