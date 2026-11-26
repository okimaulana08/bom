export interface DailyStreakReward {
  day: number; // 1..7
  label: string;
  coins?: number;
  dust?: number;
  randomMythic?: boolean;
  highlight?: boolean;
}

export const DAILY_STREAK_REWARDS: DailyStreakReward[] = [
  { day: 1, label: '150 Coins', coins: 150 },
  { day: 2, label: '60 Dust', dust: 60 },
  { day: 3, label: '250 Coins', coins: 250 },
  { day: 4, label: '100 Dust', dust: 100 },
  { day: 5, label: '350 Coins', coins: 350 },
  { day: 6, label: '150 Dust', dust: 150 },
  {
    day: 7,
    label: '500 Coins + 1 Mythic!',
    coins: 500,
    randomMythic: true,
    highlight: true,
  },
];

export function getYesterdayDateKey(today = new Date()): string {
  const prev = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(
    prev.getDate()
  ).padStart(2, '0')}`;
}
