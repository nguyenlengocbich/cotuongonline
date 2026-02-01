
import { GoogleGenAI, Type } from "@google/genai";
import { Piece, Color, PieceType, Move } from "../types";
import { getSafeMoves, isCheck } from "./xiangqiRules";

const boardToString = (pieces: Piece[]): string => {
  let boardStr = "";
  for (let y = 0; y <= 9; y++) {
    for (let x = 0; x <= 8; x++) {
      const p = pieces.find((piece) => piece.x === x && piece.y === y);
      if (!p) {
        boardStr += ".";
      } else {
        const c = p.color === Color.RED ? "R" : "B";
        let t = "";
        switch (p.type) {
          case PieceType.GENERAL: t = "G"; break;
          case PieceType.ADVISOR: t = "A"; break;
          case PieceType.ELEPHANT: t = "E"; break;
          case PieceType.HORSE: t = "H"; break;
          case PieceType.CHARIOT: t = "R"; break;
          case PieceType.CANNON: t = "C"; break;
          case PieceType.SOLDIER: t = "S"; break;
        }
        boardStr += `${c}${t}`;
      }
      boardStr += " ";
    }
    boardStr += "\n";
  }
  return boardStr;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getBestMove = async (
  pieces: Piece[], 
  turn: Color, 
  retries = 2,
  backoff = 300
): Promise<{ fromX: number, fromY: number, toX: number, toY: number, reasoning: string, isQuotaError?: boolean } | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-3-flash-preview";

    const myPieces = pieces.filter(p => p.color === turn);
    const legalMoves: Move[] = [];
    myPieces.forEach(p => {
      // QUAN TRỌNG: Sử dụng getSafeMoves thay vì getValidMoves để tránh AI đi nước phạm quy
      const moves = getSafeMoves(p, pieces);
      legalMoves.push(...moves);
    });

    if (legalMoves.length === 0) return null;

    if (legalMoves.length === 1) {
        return { ...legalMoves[0], reasoning: "Nước đi bắt buộc" };
    }

    const boardStr = boardToString(pieces);
    const movesList = legalMoves.map((m, i) => `${i}:(${m.fromX},${m.fromY})->(${m.toX},${m.toY})`).join("|");
    const amIChecked = isCheck(turn, pieces);

    const prompt = `Bạn là cao thủ Cờ Tướng. Lượt: ${turn === Color.BLACK ? 'Máy (Đen)' : 'Bạn (Đỏ)'}.
Bàn cờ (R=Đỏ, B=Đen, G=Tướng, R=Xe, C=Pháo, H=Mã, E=Tượng, A=Sĩ, S=Tốt):
${boardStr}

Giá trị: Xe=9, Pháo=4.5, Mã=4, Tượng/Sĩ=2, Tốt=1.
${amIChecked ? "CẢNH BÁO: Đang bị chiếu! Giải chiếu ngay." : ""}

Moves: ${movesList}
Chọn index tốt nhất. Ưu tiên tốc độ.
JSON: {"index": number, "reasoning": "ngắn"}`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            index: {
              type: Type.INTEGER,
              description: "Index của nước đi được chọn",
            },
            reasoning: {
              type: Type.STRING,
              description: "Lý do ngắn gọn",
            },
          },
          required: ["index", "reasoning"],
        },
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 200, 
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const result = JSON.parse(text);
    const selectedMove = legalMoves[result.index];
    
    if (!selectedMove) {
      return { ...legalMoves[Math.floor(Math.random() * legalMoves.length)], reasoning: "Tự động (Fallback)" };
    }

    return {
      ...selectedMove,
      reasoning: result.reasoning
    };

  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isQuota = errorMsg.includes("429") || error?.status === "RESOURCE_EXHAUSTED" || errorMsg.includes("quota");
    
    if (isQuota) {
      if (retries > 0) {
        await delay(backoff);
        return getBestMove(pieces, turn, retries - 1, backoff * 1.5);
      }
      return { fromX: -1, fromY: -1, toX: -1, toY: -1, reasoning: "Hết hạn mức API", isQuotaError: true };
    }
    
    const myPieces = pieces.filter(p => p.color === turn);
    const legalMoves: Move[] = [];
    myPieces.forEach(p => legalMoves.push(...getSafeMoves(p, pieces)));
    if (legalMoves.length > 0) {
        return { ...legalMoves[Math.floor(Math.random() * legalMoves.length)], reasoning: "Lỗi mạng - Đi ngẫu nhiên" };
    }
    return null;
  }
};
