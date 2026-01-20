
import { RankTier } from './types';

export const DEFAULT_GAME_ICON = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0OCIgZmlsbD0iI2VlY2ZhMSIgc3Ryb2tlPSIjNWQ0MDM3IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYjcxYzFjIiBzdHJva2Utd2lkdGg9IjEuNSIvPgogIDx0ZXh0IHg9IjUwIiB5PSI2NSIgZm9udC1mYW1pbHk9Ik5vdG8gU2VyaWYgU0MsIHNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSI0NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2I3MWMxYyI+5birPC90ZXh0Pgo8L3N2Zz4=";
export const DEFAULT_AVATAR_RED = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2Y3ZjFlMyIgc3Ryb2tlPSIjYjcxYzFjIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8dGV4dCB4PSI1MCIgY3k9IjY4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNiNzFjMWMiPue5pzwvdGV4dD4KPC9zdmc+";
export const DEFAULT_AVATAR_BLACK = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2Y3ZjFlMyIgc3Ryb2tlPSIjMjEyMTIxIiBzdHJva2Utd2lkdGg9IjMiLz4KICA8dGV4dCB4PSI1MCIgY3k9IjY4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMyMTIxMjEiPuWwhjwvdGV4dD4KPC9zdmc+";

export const AVATARS = [
  DEFAULT_GAME_ICON, 
  DEFAULT_AVATAR_RED, 
  DEFAULT_AVATAR_BLACK, 
  "🐉", "🐯", "🦅", "⚔️", "🛡️", "🔥", "❄️", "⚡", "☯️", "🏯"
];

export const RANK_UI_DATA: Record<RankTier, { color: string, bg: string, border: string }> = {
  [RankTier.BRONZE]: { color: 'text-orange-500', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
  [RankTier.SILVER]: { color: 'text-slate-300', bg: 'bg-slate-700/40', border: 'border-slate-400/30' },
  [RankTier.GOLD]: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  [RankTier.PLATINUM]: { color: 'text-cyan-400', bg: 'bg-cyan-900/20', border: 'border-cyan-400/30' },
  [RankTier.DIAMOND]: { color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-400/30' },
  [RankTier.MASTER]: { color: 'text-purple-500', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
  [RankTier.GRANDMASTER]: { color: 'text-red-500', bg: 'bg-red-900/20', border: 'border-red-500/30' },
};
