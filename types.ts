
export enum Color {
  RED = 'red',
  BLACK = 'black',
}

export enum PieceType {
  GENERAL = 'general',
  ADVISOR = 'advisor',
  ELEPHANT = 'elephant',
  HORSE = 'horse',
  CHARIOT = 'chariot',
  CANNON = 'cannon',
  SOLDIER = 'soldier',
}

export interface Piece {
  id: string;
  type: PieceType;
  color: Color;
  x: number; // 0-8
  y: number; // 0-9
}

export interface Move {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export enum GameStatus {
  IDLE = 'idle',
  PLAYING = 'playing',
  CHECKMATE = 'checkmate',
  STALEMATE = 'stalemate',
  RESIGNED = 'resigned',
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  onlineMatches: number;
  points: number;
  rankTier: RankTier;
  subRank: number; // 1 to 5 (I to V)
  wins: number;
  losses: number;
}

export enum RankTier {
  BRONZE = 'Đồng',
  SILVER = 'Bạc',
  GOLD = 'Vàng',
  PLATINUM = 'Bạch Kim',
  DIAMOND = 'Kim Cương',
  MASTER = 'Cao Thủ',
  GRANDMASTER = 'Chiến Tướng',
}

export const RANK_ORDER = [
  RankTier.BRONZE,
  RankTier.SILVER,
  RankTier.GOLD,
  RankTier.PLATINUM,
  RankTier.DIAMOND,
  RankTier.MASTER,
  RankTier.GRANDMASTER
];

/**
 * Công thức điểm cần để lên division n (từ 0): 100n + 200
 * Tổng điểm để đạt đến division n: S_n = 50n^2 + 150n
 */
export const getDivisionThreshold = (n: number) => 50 * n * n + 150 * n;

export const RANK_THRESHOLDS = {
  [RankTier.BRONZE]: getDivisionThreshold(0),      // 0
  [RankTier.SILVER]: getDivisionThreshold(5),      // 2,000
  [RankTier.GOLD]: getDivisionThreshold(10),       // 6,500
  [RankTier.PLATINUM]: getDivisionThreshold(15),   // 13,500
  [RankTier.DIAMOND]: getDivisionThreshold(20),    // 23,000
  [RankTier.MASTER]: getDivisionThreshold(25),     // 35,000
  [RankTier.GRANDMASTER]: getDivisionThreshold(30),// 49,500
};

export const getRankFromPoints = (points: number): { tier: RankTier, subRank: number } => {
  // Giải phương trình 50n^2 + 150n - P = 0 để tìm n
  // n = (-150 + sqrt(150^2 + 4 * 50 * P)) / (2 * 50)
  // n = (-150 + sqrt(22500 + 200P)) / 100
  const nRaw = (-150 + Math.sqrt(22500 + 200 * points)) / 100;
  const n = Math.floor(Math.max(0, nRaw));
  
  const tierIndex = Math.floor(n / 5);
  const subRankIndex = n % 5;
  
  if (tierIndex >= 6) return { tier: RankTier.GRANDMASTER, subRank: 1 };
  
  const tier = RANK_ORDER[tierIndex];
  const subRank = 5 - subRankIndex;
  
  return { tier, subRank };
};

export const getRomanNumeral = (num: number): string => {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V'];
  return numerals[num] || '';
};

export interface MatchRecord {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  mode: 'online' | 'ai';
  moves: Move[];
}
