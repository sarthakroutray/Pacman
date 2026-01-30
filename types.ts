export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  NONE = 'NONE'
}

export interface Position {
  x: number;
  y: number;
}

export enum TileType {
  WALL = 0,
  PELLET = 1,
  EMPTY = 2,
  POWER_PELLET = 3,
  PACMAN_SPAWN = 9,
  GHOST_SPAWN = 8,
}

export enum GhostStatus {
  NORMAL = 'NORMAL',
  VULNERABLE = 'VULNERABLE',
  EATEN = 'EATEN'
}

export interface GhostEntity {
  id: number;
  pos: Position;
  color: string;
  startPos: Position;
  direction: Direction;
  status: GhostStatus;
}

export interface HighScore {
  teamName: string;
  score: number;
  date: string;
}

export type GameStatus = 'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY' | 'LEADERBOARD';

export interface GameConfig {
  round: number;
  speed: number; // ms per move (lower is faster)
  ghostCount: number;
}