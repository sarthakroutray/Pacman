import { Direction, Position, GhostEntity, GhostStatus, TileType } from '../types';
import { DIRECTIONS, MAP_WIDTH, MAP_HEIGHT } from '../constants';

/**
 * Calculates Manhattan distance (Taxicab geometry) between two grid points.
 * Standard for grid-based pathfinding like Pac-Man.
 * Formula: |x1 - x2| + |y1 - y2|
 */
const getDistance = (p1: Position, p2: Position): number => {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
};

/**
 * Returns the position of the tile in front of the entity based on direction.
 */
const getNextTile = (pos: Position, dir: Direction): Position => {
  const move = DIRECTIONS[dir];
  return { x: Math.round(pos.x + move.x), y: Math.round(pos.y + move.y) };
};

/**
 * The "No Reverse" rule is critical for Pac-Man ghost physics.
 * Ghosts cannot reverse direction unless they are in specific modes (like switching to frightened).
 */
export const getOppositeDirection = (dir: Direction): Direction => {
  switch (dir) {
    case Direction.UP: return Direction.DOWN;
    case Direction.DOWN: return Direction.UP;
    case Direction.LEFT: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.LEFT;
    default: return Direction.NONE;
  }
};

/**
 * Determines the target tile based on Ghost Personality and Game Round.
 */
export const getTargetPosition = (
  ghost: GhostEntity,
  pacmanPos: Position,
  pacmanDir: Direction,
  blinkyPos: Position, // Red ghost position (needed for Inky)
  round: number
): Position => {
  // Round 1: Everyone is aggressive but simple (Direct Chase) to keep it easy but active.
  if (round === 1) {
    return pacmanPos; 
  }

  // Round 2+: Enable Personalities
  switch (ghost.id) {
    case 1: // BLINKY (Red) - The Chaser
      // Target: Pac-Man's exact tile.
      return pacmanPos;

    case 2: // PINKY (Pink) - The Ambusher
      // Target: 4 tiles in front of Pac-Man.
      // Logic: Try to cut him off.
      let targetX = pacmanPos.x + (DIRECTIONS[pacmanDir].x * 4);
      let targetY = pacmanPos.y + (DIRECTIONS[pacmanDir].y * 4);
      return { x: targetX, y: targetY };

    case 3: // INKY (Cyan) - The Predictor (Round 3+)
      if (round < 3) return pacmanPos; // Act like Blinky in Round 2
      
      // Target: Vector based on Blinky's position relative to Pacman.
      // 1. Select 2 tiles in front of Pacman
      const pivotX = pacmanPos.x + (DIRECTIONS[pacmanDir].x * 2);
      const pivotY = pacmanPos.y + (DIRECTIONS[pacmanDir].y * 2);
      
      // 2. Vector from Blinky to Pivot
      const vecX = pivotX - blinkyPos.x;
      const vecY = pivotY - blinkyPos.y;

      // 3. Double that vector from Blinky
      return {
        x: blinkyPos.x + (vecX * 2),
        y: blinkyPos.y + (vecY * 2)
      };

    case 4: // CLYDE (Orange) - The Poker/Trapper
      // Logic: If > 8 tiles away (Manhattan), chase Pacman. If < 8 tiles, retreat to bottom-left corner.
      const dist = getDistance(ghost.pos, pacmanPos);
      if (dist > 8) {
        return pacmanPos;
      } else {
        return { x: 0, y: MAP_HEIGHT - 1 };
      }

    case 5: // PURPLE (New) - The Trailer
      // Target: 4 tiles BEHIND Pac-Man.
      // Acts as rear-guard support for Pinky/Blinky, punishing sudden reversals.
      const backX = pacmanPos.x - (DIRECTIONS[pacmanDir].x * 4);
      const backY = pacmanPos.y - (DIRECTIONS[pacmanDir].y * 4);
      return { x: backX, y: backY };

    case 6: // GREEN (New) - The Mirror
      // Target: Mirrored position across the map center.
      // Denies safe zones on the opposite side of the map, forcing engagement.
      return {
        x: MAP_WIDTH - 1 - pacmanPos.x,
        y: MAP_HEIGHT - 1 - pacmanPos.y
      };

    default:
      return pacmanPos;
  }
};

/**
 * Main AI Function.
 * Returns the best direction to move to reach the calculated target.
 */
export const getNextGhostDirection = (
  ghost: GhostEntity,
  pacmanPos: Position,
  pacmanDir: Direction,
  blinkyPos: Position,
  grid: number[][],
  round: number
): Direction => {
  
  // 1. Handle Frightened/Vulnerable Mode (Random Logic)
  if (ghost.status === GhostStatus.VULNERABLE) {
    // In frightened mode, ghosts pick a random turn at each intersection.
    // We forbid immediate reversal to avoid jitter, unless dead end.
    const movesNoReverse = getAvailableMoves(ghost, grid, false);
    
    if (movesNoReverse.length > 0) {
       return movesNoReverse[Math.floor(Math.random() * movesNoReverse.length)];
    }
    // Dead end
    return getOppositeDirection(ghost.direction);
  }

  // 2. Determine Strategy Target
  const target = getTargetPosition(ghost, pacmanPos, pacmanDir, blinkyPos, round);

  // 3. Get Valid Moves (excluding reverse direction to prevent jitter)
  const validMoves = getAvailableMoves(ghost, grid, false);

  // Case A: Dead End (Forced Reversal)
  // This is the ONLY time a ghost reverses in normal play.
  if (validMoves.length === 0) {
     return getOppositeDirection(ghost.direction);
  }
  
  // Case B: Corridor (No Decision needed)
  // Optimization: Don't run pathfinding if there's only one way to go.
  // This satisfies "Decide only at intersections".
  if (validMoves.length === 1) {
     return validMoves[0];
  }

  // Case C: Intersection (Decision Time)
  // 4. Choose move that minimizes Manhattan distance to Target
  let bestDir = validMoves[0];
  let minDistance = Infinity;

  for (const dir of validMoves) {
    const nextTile = getNextTile(ghost.pos, dir);
    const dist = getDistance(nextTile, target);
    
    if (dist < minDistance) {
      minDistance = dist;
      bestDir = dir;
    }
  }

  return bestDir;
};

/**
 * Returns all valid directions from current position, excluding walls and reverse direction.
 */
const getAvailableMoves = (
  ghost: GhostEntity, 
  grid: number[][], 
  allowReverse: boolean
): Direction[] => {
  const moves: Direction[] = [];
  const opposite = getOppositeDirection(ghost.direction);
  
  // Current integer position
  const x = Math.round(ghost.pos.x);
  const y = Math.round(ghost.pos.y);

  // Priority order for array: UP, LEFT, DOWN, RIGHT 
  // This ensures standard Pac-Man tie-breaking behavior (Up/Left bias)
  const checkOrder = [Direction.UP, Direction.LEFT, Direction.DOWN, Direction.RIGHT];

  checkOrder.forEach(dir => {
    // Rule: Don't reverse unless allowed
    if (!allowReverse && dir === opposite) return;

    const dx = DIRECTIONS[dir].x;
    const dy = DIRECTIONS[dir].y;
    
    const nextX = x + dx;
    const nextY = y + dy;

    // Boundary check
    if (nextY >= 0 && nextY < MAP_HEIGHT && nextX >= 0 && nextX < MAP_WIDTH) {
      const tile = grid[nextY][nextX];
      // Ghost Spawn tile (8) is walkable.
      if (tile !== TileType.WALL) {
        moves.push(dir);
      }
    } else if (nextX < 0 || nextX >= MAP_WIDTH) {
       // Tunnel Handling: allow entry
       moves.push(dir);
    }
  });

  return moves;
};