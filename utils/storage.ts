import { HighScore } from '../types';
import { STORAGE_KEY } from '../constants';

export const getLeaderboard = (): HighScore[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load leaderboard", e);
    return [];
  }
};

export const saveScore = (teamName: string, score: number) => {
  const current = getLeaderboard();
  const newScore: HighScore = {
    teamName,
    score,
    date: new Date().toISOString()
  };
  
  const updated = [...current, newScore]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Keep top 5
    
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
};