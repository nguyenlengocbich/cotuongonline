
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
  // Làm tròn tọa độ khi tìm kiếm để tránh lỗi sai số
  const rx = Math.round(x);
  const ry = Math.round(y);
  return pieces.find((p) => Math.round(p.x) === rx && Math.round(p.y) === ry);
};

const isInsidePalace = (x: number, y: number, color: Color) => {
  if (color === Color.RED) return x >= 3 && x <= 5 && y >= 7 && y <= 9;
  return x >= 3 && x <= 5 && y >= 0 && y <= 2;
};

export const getValidMoves = (piece: Piece, pieces: Piece[]): Move[] => {
  const moves: Move[] = [];
  const x = Math.round(piece.x);
  const y = Math.round(piece.y);
  const color = piece.color;

  const addMove = (tx: number, ty: number): boolean => {
    if (tx < 0 || tx > 8 || ty < 0 || ty > 9) return false;
    const existing = getPieceAt(pieces, tx, ty);
    if (existing && existing.color === color) return false;
    moves.push({ fromX: x, fromY: y, toX: tx, toY: ty });
    return !existing;
  };

  switch (piece.type) {
    case PieceType.GENERAL:
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (isInsidePalace(nx, ny, color)) addMove(nx, ny);
      });
      break;

    case PieceType.ADVISOR:
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (isInsidePalace(nx, ny, color)) addMove(nx, ny);
      });
      break;

    case PieceType.ELEPHANT:
      [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        const isRedSide = color === Color.RED;
        if (isRedSide && ny < 5) return;
        if (!isRedSide && ny > 4) return;
        const eyeX = x + dx / 2;
        const eyeY = y + dy / 2;
        if (!getPieceAt(pieces, eyeX, eyeY)) addMove(nx, ny);
      });
      break;

    case PieceType.HORSE:
      [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]].forEach(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        const legX = x + (Math.abs(dx) === 2 ? dx / 2 : 0);
        const legY = y + (Math.abs(dy) === 2 ? dy / 2 : 0);
        if (legX >= 0 && legX <= 8 && legY >= 0 && legY <= 9 && !getPieceAt(pieces, legX, legY)) {
          addMove(nx, ny);
        }
      });
      break;

    case PieceType.CHARIOT:
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        let nx = x + dx, ny = y + dy;
        while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
          const p = getPieceAt(pieces, nx, ny);
          if (!p) {
            moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
          } else {
            if (p.color !== color) moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
            break;
          }
          nx += dx; ny += dy;
        }
      });
      break;

    case PieceType.CANNON:
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        let nx = x + dx, ny = y + dy;
        let hasJumped = false;
        while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
          const p = getPieceAt(pieces, nx, ny);
          if (!hasJumped) {
            if (!p) moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
            else hasJumped = true;
          } else {
            if (p) {
              if (p.color !== color) moves.push({ fromX: x, fromY: y, toX: nx, toY: ny });
              break;
            }
          }
          nx += dx; ny += dy;
        }
      });
      break;

    case PieceType.SOLDIER:
      const forward = color === Color.RED ? -1 : 1;
      addMove(x, y + forward);
      const crossedRiver = color === Color.RED ? y <= 4 : y >= 5;
      if (crossedRiver) {
        addMove(x + 1, y);
        addMove(x - 1, y);
      }
      break;
  }
  return moves;
};

export const isCheck = (color: Color, pieces: Piece[]): boolean => {
  const general = pieces.find(p => p.type === PieceType.GENERAL && p.color === color);
  if (!general) return false;

  // Luôn làm tròn tọa độ Tướng để đảm bảo chính xác
  const gx = Math.round(general.x);
  const gy = Math.round(general.y);

  const opponentColor = color === Color.RED ? Color.BLACK : Color.RED;
  const opponentPieces = pieces.filter(p => p.color === opponentColor);

  // Map tối ưu hóa: Key luôn là số nguyên "x,y"
  const boardMap = new Map<string, Piece>();
  pieces.forEach(p => boardMap.set(`${Math.round(p.x)},${Math.round(p.y)}`, p));
  const hasPiece = (x: number, y: number) => boardMap.has(`${Math.round(x)},${Math.round(y)}`);

  // 1. Kiểm tra Lộ mặt tướng (Flying General)
  const otherGeneral = pieces.find(p => p.type === PieceType.GENERAL && p.color === opponentColor);
  if (otherGeneral && Math.round(otherGeneral.x) === gx) {
    let blocked = false;
    const minY = Math.min(gy, Math.round(otherGeneral.y));
    const maxY = Math.max(gy, Math.round(otherGeneral.y));
    for (let i = minY + 1; i < maxY; i++) {
      if (hasPiece(gx, i)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return true;
  }

  // 2. Kiểm tra các quân tấn công của đối thủ
  for (const p of opponentPieces) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    const dx = Math.abs(px - gx);
    const dy = Math.abs(py - gy);

    switch (p.type) {
      case PieceType.CHARIOT:
        if (px === gx) { // Cùng cột
          let blocked = false;
          const min = Math.min(py, gy);
          const max = Math.max(py, gy);
          for (let i = min + 1; i < max; i++) {
            if (hasPiece(px, i)) { blocked = true; break; }
          }
          if (!blocked) return true;
        } else if (py === gy) { // Cùng hàng
          let blocked = false;
          const min = Math.min(px, gx);
          const max = Math.max(px, gx);
          for (let i = min + 1; i < max; i++) {
            if (hasPiece(i, py)) { blocked = true; break; }
          }
          if (!blocked) return true;
        }
        break;

      case PieceType.CANNON:
        if (px === gx) { // Cùng cột
          let count = 0;
          const min = Math.min(py, gy);
          const max = Math.max(py, gy);
          for (let i = min + 1; i < max; i++) {
            if (hasPiece(px, i)) count++;
          }
          if (count === 1) return true;
        } else if (py === gy) { // Cùng hàng
          let count = 0;
          const min = Math.min(px, gx);
          const max = Math.max(px, gx);
          for (let i = min + 1; i < max; i++) {
            if (hasPiece(i, py)) count++;
          }
          if (count === 1) return true;
        }
        break;

      case PieceType.HORSE:
        if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) {
          const legX = px + (dx === 2 ? (gx > px ? 1 : -1) : 0);
          const legY = py + (dy === 2 ? (gy > py ? 1 : -1) : 0);
          // Kiểm tra xem có quân cản chân Mã không
          if (legX >= 0 && legX <= 8 && legY >= 0 && legY <= 9 && !hasPiece(legX, legY)) return true;
        }
        break;

      case PieceType.SOLDIER:
        if (dx + dy === 1) { // Khoảng cách Manhattan = 1 (kề nhau)
          const isTargetForward = p.color === Color.RED ? gy < py : gy > py;
          const isCrossedRiver = p.color === Color.RED ? py <= 4 : py >= 5;
          // Tốt chưa qua sông chỉ đi thẳng, qua sông đi thẳng + ngang
          if (isTargetForward || (isCrossedRiver && dy === 0)) return true;
        }
        break;
    }
  }

  return false;
};

export const wouldBeInCheck = (move: Move, pieces: Piece[], color: Color): boolean => {
  const piece = getPieceAt(pieces, move.fromX, move.fromY);
  if (!piece) return false;
  
  const tx = Math.round(move.toX);
  const ty = Math.round(move.toY);

  // Tạo bàn cờ giả lập: 
  // 1. Lọc bỏ chính xác quân bị ăn tại đích đến (dựa trên tọa độ làm tròn)
  // 2. Cập nhật vị trí quân mình
  const simulatedPieces = pieces
    .filter(p => Math.round(p.x) !== tx || Math.round(p.y) !== ty)
    .map(p => p.id === piece.id ? { ...p, x: tx, y: ty } : p);
    
  return isCheck(color, simulatedPieces);
};

export const getSafeMoves = (piece: Piece, pieces: Piece[]): Move[] => {
  const validMoves = getValidMoves(piece, pieces);
  // Lọc bỏ những nước đi khiến Tướng của chính mình bị chiếu
  return validMoves.filter(move => !wouldBeInCheck(move, pieces, piece.color));
};

export const hasValidMoves = (pieces: Piece[], color: Color): boolean => {
  const myPieces = pieces.filter(p => p.color === color);
  for (const p of myPieces) {
    const safeMoves = getSafeMoves(p, pieces);
    if (safeMoves.length > 0) return true;
  }
  return false;
};

export const getRandomMove = (pieces: Piece[], color: Color): Move | null => {
  const myPieces = pieces.filter(p => p.color === color);
  const allMoves: Move[] = [];
  for (const p of myPieces) {
    allMoves.push(...getSafeMoves(p, pieces));
  }
  if (allMoves.length === 0) return null;
  return allMoves[Math.floor(Math.random() * allMoves.length)];
};

export const isPawnProgress = (move: Move, piecesBefore: Piece[]): boolean => {
  const piece = getPieceAt(piecesBefore, move.fromX, move.fromY);
  if (!piece || piece.type !== PieceType.SOLDIER) return false;
  const isRed = piece.color === Color.RED;
  const movedForward = isRed ? move.toY < move.fromY : move.toY > move.fromY;
  const crossedRiver = isRed ? move.fromY <= 4 : move.fromY >= 5;
  return crossedRiver && movedForward;
};

export const isChase = (color: Color, piecesAfterMove: Piece[]): boolean => false;
