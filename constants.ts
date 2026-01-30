import { Direction, TileType } from './types';

// 1 = Pellet, 0 = Wall, 9 = Pacman, 8 = Ghost, 3 = Power Pellet
// 2 = Empty (runtime)
export const INITIAL_MAP = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 3, 0],
  [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 2, 2, 2, 0, 0, 0, 1, 0, 0, 0, 0],
  [2, 2, 2, 0, 1, 0, 2, 2, 8, 8, 8, 2, 2, 0, 1, 0, 2, 2, 2],
  [0, 0, 0, 0, 1, 0, 2, 0, 0, 2, 0, 0, 2, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 9, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
  [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
  [0, 3, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const MAP_WIDTH = INITIAL_MAP[0].length;
export const MAP_HEIGHT = INITIAL_MAP.length;

export const DIRECTIONS = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
  [Direction.NONE]: { x: 0, y: 0 },
};

export const INITIAL_GHOSTS = [
  { id: 1, color: 'bg-red-500', startPos: { x: 9, y: 8 } },
  { id: 2, color: 'bg-pink-400', startPos: { x: 8, y: 8 } },
  { id: 3, color: 'bg-cyan-400', startPos: { x: 10, y: 8 } },
  { id: 4, color: 'bg-orange-400', startPos: { x: 9, y: 7 } },
  { id: 5, color: 'bg-purple-400', startPos: { x: 8, y: 7 } },
  { id: 6, color: 'bg-green-400', startPos: { x: 10, y: 7 } },
];

export const ROUND_CONFIGS = {
  1: { speed: 130, name: 'EASY', ghostCount: 3 },
  2: { speed: 90, name: 'MODERATE', ghostCount: 4 },
  3: { speed: 70, name: 'HARD', ghostCount: 6 },
};

export const ROUND_START_PAUSE = {
  1: { duration: 2000, message: 'GET READY' },
  2: { duration: 2000, message: 'STAY SHARP' },
  3: { duration: 3000, message: 'FINAL ROUND' },
};

export const VULNERABLE_DURATION_MS = 10000;
export const STORAGE_KEY = 'pacman_leaderboard_v2';