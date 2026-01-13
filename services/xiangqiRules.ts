import { Piece, PieceType, Color, Move } from '../types';

export const INITIAL_BOARD_SETUP: Piece[] = [
  // RED (Bottom, y=9 to y=5)
  { id: 'r_c1', type: PieceType.CHARIOT, color: Color.RED, x: 0, y: 9 },
  { id: 'r_h1', type: PieceType.HORSE, color: Color.RED, x: 1, y: 9 },
  { id: 'r_e1', type: PieceType.ELEPHANT, color: Color.RED, x: 2, y: 9 },
  { id: 'r_a1', type: PieceType.ADVISOR, color: Color.RED, x: 3, y: 9 },
  { id: 'r_g', type: PieceType.GENERAL, color: Color.RED, x: 4, y: 9 },
  { id: 'r_a2', type: PieceType.ADVISOR, color: Color.RED, x: 5, y: 9 },
  { id: 'r_e2', type: PieceType.ELEPHANT, color: Color.RED, x: 6, y: 9 },
  { id: 'r_h2', type: PieceType.HORSE, color: Color.RED, x: 7, y: 9 },
  { id: 'r_c2', type: PieceType.CHARIOT, color: Color.RED, x: 8, y: 9 },
  { id: 'r_cn1', type: PieceType.CANNON, color: Color.RED, x: 1, y: 7 },
  { id: 'r_cn2', type: PieceType.CANNON, color: Color.RED, x: 7, y: 7 },
  { id: 'r_s1', type: PieceType.SOLDIER, color: Color.RED, x: 0, y: 6 },
  { id: 'r_s2', type: PieceType.SOLDIER, color: Color.RED, x: 2, y: 6 },
  { id: 'r_s3', type: PieceType.SOLDIER, color: Color.RED, x: 4, y: 6 },
  { id: 'r_s4', type: PieceType.SOLDIER, color: Color.RED, x: 6, y: 6 },
  { id: 'r_s5', type: PieceType.SOLDIER, color: Color.RED, x: 8, y: 6 },

  // BLACK (Top, y=0 to y=4)
  { id: 'b_c1', type: PieceType.CHARIOT, color: Color.BLACK, x: 0, y: 0 },
  { id: 'b_h1', type: PieceType.HORSE, color: Color.BLACK, x: 1, y: 0 },
  { id: 'b_e1', type: PieceType.ELEPHANT, color: Color.BLACK, x: 2, y: 0 },
  { id: 'b_a1', type: PieceType.ADVISOR, color: Color.BLACK, x: 3, y: 0 },
  { id: 'b_g', type: PieceType.GENERAL, color: Color.BLACK, x: 4, y: 0 },
  { id: 'b_a2', type: PieceType.ADVISOR, color: Color.BLACK, x: 5, y: 0 },
  { id: 'b_e2', type: PieceType.ELEPHANT, color: Color.BLACK, x: 6, y: 0 },
  { id: 'b_h2', type: PieceType.HORSE, color: Color.BLACK, x: 7, y: 0 },
  { id: 'b_c2', type: PieceType.CHARIOT, color: Color.BLACK, x: 8, y: 0 },
  { id: 'b_cn1', type: PieceType.CANNON, color: Color.BLACK, x: 1, y: 2 },
  { id: 'b_cn2', type: PieceType.CANNON, color: Color.BLACK, x: 7, y: 2 },
  { id: 'b_s1', type: PieceType.SOLDIER, color: Color.BLACK, x: 0, y: 3 },
  { id: 'b_s2', type: PieceType.SOLDIER, color: Color.BLACK, x: 2, y: 3 },
  { id: 'b_s3', type: PieceType.SOLDIER, color: Color.BLACK, x: 4, y: 3 },
  { id: 'b_s4', type: PieceType.SOLDIER, color: Color.BLACK, x: 6, y: 3 },
  { id: 'b_s5', type: PieceType.SOLDIER, color: Color.BLACK, x: 8, y: 3 },
];

export const getPieceAt = (pieces: Piece[], x: number, y: number): Piece | undefined => {
  return pieces.find((p) => p.x === x && p.y === y);
};

const isInsidePalace = (x: number, y: number, color: Color) => {
  if (color === Color.RED) return x >= 3 && x <= 5 && y >= 7 && y <= 9;
  return x >= 3 && x <= 5 && y >= 0 && y <= 2;
};

export const getValidMoves = (piece: Piece, pieces: Piece[]): Move[] => {
  const moves: Move[] = [];
  const target = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;
    const existing = getPieceAt(pieces, tx, ty);
    if (existing && existing.color === piece.color) return false;
    moves.push({ fromX: piece.x, fromY: piece.y, toX: tx, toY: ty });
    return !existing;
  };

  const { x, y, color } = piece;
  const isRed = color === Color.RED;

  switch (piece.type) {
    case PieceType.GENERAL:
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (isInsidePalace(nx, ny, color)) target(nx, ny);
      });
      break;

    case PieceType.ADVISOR:
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (isInsidePalace(nx, ny, color)) target(nx, ny);
      });
      break;

    case PieceType.ELEPHANT:
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (isRed && ny < 5) return;
        if (!isRed && ny > 4) return;
        const eyeX = x + dx / 2;
        const eyeY = y + dy / 2;
        if (!getPieceAt(pieces, eyeX, eyeY)) target(nx, ny);
      });
      break;

    case PieceType.HORSE:
      [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        const legX = x + (Math.abs(dx) === 2 ? dx / 2 : 0);
        const legY = y + (Math.abs(dy) === 2 ? dy / 2 : 0);
        if (!getPieceAt(pieces, legX, legY)) target(nx, ny);
      });
      break;

    case PieceType.CHARIOT:
      for (let i = x + 1; i <= 8; i++) if (!target(i, y)) break;
      for (let i = x - 1; i >= 0; i--) if (!target(i, y)) break;
      for (let i = y + 1; i <= 9; i++) if (!target(x, i)) break;
      for (let i = y - 1; i >= 0; i--) if (!target(x, i)) break;
      break;

    case PieceType.CANNON:
        const scan = (dx: number, dy: number) => {
          let hasJumped = false;
          let cx = x + dx;
          let cy = y + dy;
          while (cx >= 0 && cx <= 8 && cy >= 0 && cy <= 9) {
            const p = getPieceAt(pieces, cx, cy);
            if (!hasJumped) {
              if (!p) moves.push({ fromX: x, fromY: y, toX: cx, toY: cy });
              else hasJumped = true;
            } else {
              if (p) {
                if (p.color !== color) moves.push({ fromX: x, fromY: y, toX: cx, toY: cy });
                break; 
              }
            }
            cx += dx;
            cy += dy;
          }
        };
        scan(1, 0); scan(-1, 0); scan(0, 1); scan(0, -1);
      break;

    case PieceType.SOLDIER:
      const forward = isRed ? -1 : 1;
      target(x, y + forward);
      const crossedRiver = isRed ? y <= 4 : y >= 5;
      if (crossedRiver) {
        target(x + 1, y);
        target(x - 1, y);
      }
      break;
  }
  return moves;
};

export const isCheck = (color: Color, pieces: Piece[]): boolean => {
  const general = pieces.find(p => p.type === PieceType.GENERAL && p.color === color);
  if (!general) return false;

  const opponentColor = color === Color.RED ? Color.BLACK : Color.RED;
  const opponentPieces = pieces.filter(p => p.color === opponentColor);

  for (const p of opponentPieces) {
    const moves = getValidMoves(p, pieces);
    if (moves.some(m => m.toX === general.x && m.toY === general.y)) {
      return true;
    }
  }

  // Lộ mặt tướng (Flying General rule)
  const otherGeneral = pieces.find(p => p.type === PieceType.GENERAL && p.color === opponentColor);
  if (otherGeneral && otherGeneral.x === general.x) {
    let pieceBetween = false;
    const minY = Math.min(general.y, otherGeneral.y);
    const maxY = Math.max(general.y, otherGeneral.y);
    for (let i = minY + 1; i < maxY; i++) {
      if (getPieceAt(pieces, general.x, i)) {
        pieceBetween = true;
        break;
      }
    }
    if (!pieceBetween) return true;
  }

  return false;
};

export const getRandomMove = (pieces: Piece[], color: Color): Move | null => {
  const myPieces = pieces.filter(p => p.color === color);
  const allMoves: Move[] = [];
  const shuffledPieces = [...myPieces].sort(() => Math.random() - 0.5);
  for (const p of shuffledPieces) {
    const moves = getValidMoves(p, pieces);
    if (moves.length > 0) {
        allMoves.push(...moves);
        if (allMoves.length > 20) break;
    }
  }
  if (allMoves.length === 0) return null;
  return allMoves[Math.floor(Math.random() * allMoves.length)];
};