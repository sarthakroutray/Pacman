import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  INITIAL_MAP, 
  DIRECTIONS, 
  INITIAL_GHOSTS, 
  MAP_WIDTH, 
  MAP_HEIGHT,
  ROUND_CONFIGS,
  ROUND_START_PAUSE,
  VULNERABLE_DURATION_MS
} from '../constants';
import { 
  Direction, 
  Position, 
  TileType, 
  GhostEntity, 
  GhostStatus
} from '../types';
import { saveScore } from '../utils/storage';
import { getNextGhostDirection, getOppositeDirection } from '../utils/ghostAI';

interface GameScreenProps {
  teamName: string;
  onGameOver: (score: number) => void;
  onGameWin: (score: number) => void;
}

type InternalGameStatus = 'ROUND_STARTING' | 'PLAYING' | 'RESPAWNING' | 'LEVEL_TRANSITION';

interface ScorePopup {
  id: number;
  x: number;
  y: number;
  score: number;
  timestamp: number;
}

// Internal Interface for the Ref-based Game State
interface GameStateRef {
  grid: number[][];
  pacman: { pos: Position; dir: Direction; nextDir: Direction; lastMoveTime: number };
  ghosts: GhostEntity[];
  score: number;
  lives: number;
  round: number;
  vulnerableUntil: number; // Timestamp
  ghostsEatenStreak: number; // For score multiplier (200, 400, 800, 1600)
  status: InternalGameStatus;
  pelletsRemaining: number;
  popups: ScorePopup[];
  
  // Power-up Logic
  powerPelletLocations: Position[];
  currentPowerPellets: number;
  
  // Pause/Timer Logic
  pauseTimer: number;        // Remaining time in ms
  pauseDuration: number;     // Total duration of current pause
  pauseMessage: string;      // Text to display
  
  frameCount: number;
  lastFrameTime: number;
}

// Configuration for Round-based Lighting Themes
const ROUND_THEMES = {
  1: {
    id: 1,
    // Calm Blue/Slate
    gradient: 'radial-gradient(circle at 50% 50%, #1e3a8a 0%, #020617 60%, #000000 100%)',
    glowColor: '#60a5fa',
    animClass: 'theme-anim-1'
  },
  2: {
    id: 2,
    // Tense Purple/Indigo
    gradient: 'radial-gradient(circle at 50% 50%, #581c87 0%, #1e1b4b 60%, #000000 100%)',
    glowColor: '#c084fc',
    animClass: 'theme-anim-2'
  },
  3: {
    id: 3,
    // Intense Red/Crimson
    gradient: 'radial-gradient(circle at 50% 50%, #7f1d1d 0%, #450a0a 60%, #000000 100%)',
    glowColor: '#f87171',
    animClass: 'theme-anim-3'
  }
};

const GameScreen: React.FC<GameScreenProps> = ({ teamName, onGameOver, onGameWin }) => {
  // --- Render State (Synced from Ref for UI updates) ---
  const [uiState, setUiState] = useState({
    score: 0,
    lives: 3,
    round: 1,
    fps: 0,
    pelletsRemaining: 0,
    popups: [] as ScorePopup[],
    // Visuals for pause
    isPaused: false,
    pauseMessage: '',
    countdown: 0,
    // Visuals for mechanics
    respawnFlash: false
  });
  
  // Scaling Constants
  // We scale the game based on a larger target tile size for better visibility
  const TARGET_TILE_SIZE_PX = 46; // ~46px per tile results in ~874px width
  const MAX_BOARD_WIDTH = MAP_WIDTH * TARGET_TILE_SIZE_PX;

  // We use a ref for the entire game logic to prevent Stale Closures and ensure high-perf updates
  const gameState = useRef<GameStateRef>({
    grid: INITIAL_MAP.map(row => [...row]),
    pacman: { 
      pos: { x: 9, y: 10 }, 
      dir: Direction.RIGHT, 
      nextDir: Direction.RIGHT,
      lastMoveTime: 0 
    },
    ghosts: [],
    score: 0,
    lives: 3,
    round: 1,
    vulnerableUntil: 0,
    ghostsEatenStreak: 0,
    status: 'ROUND_STARTING',
    pelletsRemaining: 0,
    popups: [],
    powerPelletLocations: [],
    currentPowerPellets: 0,
    pauseTimer: 0,
    pauseDuration: 0,
    pauseMessage: '',
    frameCount: 0,
    lastFrameTime: 0
  });

  // Render trigger for the canvas/grid
  const [tick, setTick] = useState(0); 

  // --- Initialization ---
  const initRound = useCallback((roundNum: number, keepScore: boolean = true) => {
    const config = ROUND_CONFIGS[roundNum as keyof typeof ROUND_CONFIGS];
    const pauseConfig = ROUND_START_PAUSE[roundNum as keyof typeof ROUND_START_PAUSE] || { duration: 2000, message: 'READY' };

    const initialGhosts = INITIAL_GHOSTS.slice(0, config.ghostCount).map(g => ({
      ...g,
      pos: { ...g.startPos },
      direction: Direction.UP, // Start moving up out of box
      status: GhostStatus.NORMAL
    }));

    // Reset Grid & Count Pellets
    const newGrid = INITIAL_MAP.map(row => [...row]);
    let pelletCount = 0;
    const powerPelletLocs: Position[] = [];

    newGrid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === TileType.PELLET || cell === TileType.POWER_PELLET) {
          pelletCount++;
        }
        if (cell === TileType.POWER_PELLET) {
          powerPelletLocs.push({ x, y });
        }
      });
    });

    gameState.current.grid = newGrid;
    gameState.current.pelletsRemaining = pelletCount;
    gameState.current.powerPelletLocations = powerPelletLocs;
    gameState.current.currentPowerPellets = powerPelletLocs.length;

    gameState.current.pacman = { 
      pos: { x: 9, y: 10 }, 
      dir: Direction.RIGHT, 
      nextDir: Direction.RIGHT,
      lastMoveTime: 0
    };
    gameState.current.ghosts = initialGhosts;
    gameState.current.round = roundNum;
    gameState.current.vulnerableUntil = 0;
    gameState.current.ghostsEatenStreak = 0;
    gameState.current.popups = [];
    
    // Set Pause State
    gameState.current.status = 'ROUND_STARTING';
    gameState.current.pauseTimer = pauseConfig.duration;
    gameState.current.pauseDuration = pauseConfig.duration;
    gameState.current.pauseMessage = `ROUND ${roundNum} - ${pauseConfig.message}`;

    if (!keepScore) gameState.current.score = 0;
    
    // Sync UI
    setUiState(prev => ({
      ...prev,
      round: roundNum,
      lives: gameState.current.lives,
      score: gameState.current.score,
      pelletsRemaining: pelletCount,
      popups: [],
      isPaused: true,
      pauseMessage: gameState.current.pauseMessage,
      countdown: Math.ceil(pauseConfig.duration / 1000),
      respawnFlash: false
    }));
    setTick(t => t + 1);
  }, []);

  const resetPositions = () => {
    // Snap Pacman back to start
    gameState.current.pacman.pos = { x: 9, y: 10 };
    gameState.current.pacman.dir = Direction.RIGHT;
    gameState.current.pacman.nextDir = Direction.RIGHT;
    
    // Snap Ghosts back to start
    gameState.current.ghosts.forEach((g, idx) => {
      if (g.status !== GhostStatus.EATEN) {
        g.pos = { ...INITIAL_GHOSTS[idx].startPos };
        g.direction = Direction.UP;
      }
    });

    // Enter short pause state for respawn
    gameState.current.status = 'RESPAWNING';
    gameState.current.pauseTimer = 1500;
    gameState.current.pauseDuration = 1500;
    gameState.current.pauseMessage = "READY!";

    setUiState(prev => ({
       ...prev,
       isPaused: true,
       pauseMessage: "READY!",
       countdown: 2
    }));
    setTick(t => t + 1);
  };

  // Initial Setup
  useEffect(() => {
    initRound(1, false);
    gameState.current.lastFrameTime = performance.now();
  }, [initRound]);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let newDir = Direction.NONE;
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W': newDir = Direction.UP; break;
        case 'ArrowDown': case 's': case 'S': newDir = Direction.DOWN; break;
        case 'ArrowLeft': case 'a': case 'A': newDir = Direction.LEFT; break;
        case 'ArrowRight': case 'd': case 'D': newDir = Direction.RIGHT; break;
      }
      
      if (newDir !== Direction.NONE) {
        gameState.current.pacman.nextDir = newDir;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Helpers ---
  const isValidMove = (grid: number[][], x: number, y: number, dir: Direction) => {
    const move = DIRECTIONS[dir];
    let nextX = Math.round(x + move.x);
    let nextY = Math.round(y + move.y);

    // Tunnel Wrapping
    if (nextX < 0) nextX = MAP_WIDTH - 1;
    if (nextX >= MAP_WIDTH) nextX = 0;

    if (nextY < 0 || nextY >= MAP_HEIGHT) return false;

    const tile = grid[nextY][nextX];
    return tile !== TileType.WALL && tile !== TileType.GHOST_SPAWN;
  };

  const isCentered = (pos: Position) => {
    return Math.abs(pos.x - Math.round(pos.x)) < 0.05 && Math.abs(pos.y - Math.round(pos.y)) < 0.05;
  };

  // --- Core Game Logic Loop (Runs in rAF) ---
  const update = (time: number) => {
    const state = gameState.current;
    
    const delta = time - state.lastFrameTime;
    state.lastFrameTime = time;

    // 0. FPS Counter
    state.frameCount++;
    if (state.frameCount % 30 === 0) {
      setUiState(prev => ({ ...prev, fps: Math.round(1000 / delta) }));
    }

    // --- PAUSE LOGIC ---
    if (state.status === 'ROUND_STARTING' || state.status === 'RESPAWNING' || state.status === 'LEVEL_TRANSITION') {
       if (state.status !== 'LEVEL_TRANSITION') { 
          state.pauseTimer -= delta;
          const currentCount = Math.ceil(state.pauseTimer / 1000);
          setUiState(prev => {
             if (prev.countdown !== currentCount) {
                return { ...prev, countdown: currentCount };
             }
             return prev;
          });

          if (state.pauseTimer <= 0) {
             state.status = 'PLAYING';
             setUiState(prev => ({ ...prev, isPaused: false }));
          }
       }
       return;
    }

    // --- 1. PACMAN LOGIC (ARCADE PHYSICS) ---
    const pacSpeedMs = ROUND_CONFIGS[state.round as keyof typeof ROUND_CONFIGS].speed;
    let moveDist = delta / pacSpeedMs;

    // A. Handle Immediate Reversal
    // If the player wants to reverse, we allow it immediately without waiting for center alignment.
    if (getOppositeDirection(state.pacman.dir) === state.pacman.nextDir) {
       state.pacman.dir = state.pacman.nextDir;
    }

    // B. Movement Loop (Iterative Step)
    let loops = 0;
    while (moveDist > 0 && loops < 5) {
       loops++;
       const tX = Math.round(state.pacman.pos.x);
       const tY = Math.round(state.pacman.pos.y);
       
       // Check if we are "At Center" (Crossing the integer boundary)
       const atCenter = Math.abs(state.pacman.pos.x - tX) < 0.01 && Math.abs(state.pacman.pos.y - tY) < 0.01;
       
       if (atCenter) {
           // 1. Snap to center to prevent drift
           state.pacman.pos.x = tX;
           state.pacman.pos.y = tY;

           // 2. Try Buffer Turn (Cornering)
           if (state.pacman.nextDir !== Direction.NONE && state.pacman.nextDir !== state.pacman.dir) {
               if (isValidMove(state.grid, tX, tY, state.pacman.nextDir)) {
                   state.pacman.dir = state.pacman.nextDir;
               }
           }

           // 3. Check if we can continue moving in current direction (Wall Collision)
           if (!isValidMove(state.grid, tX, tY, state.pacman.dir)) {
               moveDist = 0; // Hit wall, stop completely
               break;
           }
       }

       // C. Apply Movement to Next Tile Boundary
       const dir = state.pacman.dir;
       const move = DIRECTIONS[dir];
       if (dir === Direction.NONE) break;

       // Calculate distance to the next integer boundary (Tile Center)
       let distToNext = 0;
       if (move.x > 0) distToNext = (Math.floor(state.pacman.pos.x) + 1) - state.pacman.pos.x;
       else if (move.x < 0) distToNext = state.pacman.pos.x - (Math.ceil(state.pacman.pos.x) - 1);
       else if (move.y > 0) distToNext = (Math.floor(state.pacman.pos.y) + 1) - state.pacman.pos.y;
       else if (move.y < 0) distToNext = state.pacman.pos.y - (Math.ceil(state.pacman.pos.y) - 1);

       // Fix small float errors
       if (distToNext <= 0.0001) distToNext = 1.0; 

       if (moveDist >= distToNext) {
           // We reach the center of the next tile
           state.pacman.pos.x += move.x * distToNext;
           state.pacman.pos.y += move.y * distToNext;
           moveDist -= distToNext;
           // Continue loop -> next iteration will treat us as "atCenter"
       } else {
           // We assume valid corridor, just move
           state.pacman.pos.x += move.x * moveDist;
           state.pacman.pos.y += move.y * moveDist;
           moveDist = 0;
       }
    }

    // D. Tunnel Logic
    if (state.pacman.pos.x < -0.5) state.pacman.pos.x = MAP_WIDTH - 0.5;
    if (state.pacman.pos.x > MAP_WIDTH - 0.5) state.pacman.pos.x = -0.5;

    // E. Eat Pellets
    const pX = Math.round(state.pacman.pos.x);
    const pY = Math.round(state.pacman.pos.y);
    if (pY >= 0 && pY < MAP_HEIGHT && pX >= 0 && pX < MAP_WIDTH) {
       const item = state.grid[pY][pX];
       
       if (item === TileType.PELLET) {
         state.score += 10;
         state.grid[pY][pX] = TileType.EMPTY;
         state.pelletsRemaining--;
       } else if (item === TileType.POWER_PELLET) {
         state.score += 50;
         state.grid[pY][pX] = TileType.EMPTY;
         state.pelletsRemaining--;
         state.currentPowerPellets--; // Track specific consumption
         
         state.vulnerableUntil = time + VULNERABLE_DURATION_MS;
         state.ghostsEatenStreak = 0; // Reset streak on new power pellet
         state.ghosts.forEach(g => {
           if (g.status !== GhostStatus.EATEN) g.status = GhostStatus.VULNERABLE;
         });

         // --- RESPAWN LOGIC ---
         if (state.currentPowerPellets === 0) {
           // Condition: Are there any ghosts still alive?
           const ghostsAlive = state.ghosts.some(g => g.status !== GhostStatus.EATEN);
           
           if (ghostsAlive) {
             let respawnCount = 0;
             state.powerPelletLocations.forEach(pos => {
               // Double check if empty to avoid overwriting walls or Pac-Man
               if (state.grid[pos.y][pos.x] === TileType.EMPTY) {
                  state.grid[pos.y][pos.x] = TileType.POWER_PELLET;
                  respawnCount++;
               }
             });

             if (respawnCount > 0) {
               state.currentPowerPellets = respawnCount;
               // Important: Increase remaining count so the level doesn't end if we eat these
               state.pelletsRemaining += respawnCount;
               
               // Trigger Flash
               setUiState(prev => ({ ...prev, respawnFlash: true }));
               setTimeout(() => {
                 setUiState(prev => ({ ...prev, respawnFlash: false }));
               }, 500);
             }
           }
         }
       }
    }
    
    if (state.pelletsRemaining === 0) {
        handleLevelComplete();
        return; 
    }

    // --- 2. GHOST LOGIC ---
    // Maintain simple interpolated movement for ghosts, but robust against walls
    const moveFactor = delta / pacSpeedMs;
    const ghostSpeedMult = state.round === 1 ? 0.85 : (state.round === 2 ? 0.95 : 1.05);
    const ghostMoveFactor = moveFactor * ghostSpeedMult;
    
    // Blinky for Inky logic
    const blinky = state.ghosts.find(g => g.id === 1) || state.ghosts[0];
    const blinkyPos = blinky ? blinky.pos : { x: 0, y: 0 };

    state.ghosts.forEach(ghost => {
       if (ghost.status === GhostStatus.EATEN) return;

       const gMove = DIRECTIONS[ghost.direction];
       // We iterate movement to ensure we don't skip tile centers
       let distRemaining = ghostMoveFactor;
       let safetyCounter = 0;

       while (distRemaining > 0 && safetyCounter < 2) {
         safetyCounter++;
         
         const axis = (ghost.direction === Direction.LEFT || ghost.direction === Direction.RIGHT) ? 'x' : 'y';
         const currentVal = ghost.pos[axis];
         const dirSign = (ghost.direction === Direction.RIGHT || ghost.direction === Direction.DOWN) ? 1 : -1;
         
         // Find next integer coordinate in direction
         let nextInteger;
         if (dirSign > 0) nextInteger = Math.floor(currentVal) + 1;
         else nextInteger = Math.ceil(currentVal) - 1;
         
         // Distance to that center
         const distToCenter = Math.abs(nextInteger - currentVal);
         
         if (distToCenter <= distRemaining) {
            // We reach the center this frame
            ghost.pos[axis] = nextInteger;
            distRemaining -= distToCenter;

            // Snap completely to integer for clean turn
            ghost.pos.x = Math.round(ghost.pos.x);
            ghost.pos.y = Math.round(ghost.pos.y);

            // AI Turn Decision
            const nextDir = getNextGhostDirection(
               ghost, 
               state.pacman.pos, 
               state.pacman.dir, 
               blinkyPos, 
               state.grid, 
               state.round
            );
            
            if (nextDir !== Direction.NONE) {
              ghost.direction = nextDir;
            }
         } else {
            // Move partial distance
            ghost.pos.x += DIRECTIONS[ghost.direction].x * distRemaining;
            ghost.pos.y += DIRECTIONS[ghost.direction].y * distRemaining;
            distRemaining = 0;
         }
       }
       
       // Tunnel
       if (ghost.pos.x < -0.5) ghost.pos.x = MAP_WIDTH - 0.5;
       if (ghost.pos.x > MAP_WIDTH - 0.5) ghost.pos.x = -0.5;
    });

    // --- 3. TIMERS & COLLISIONS ---
    if (state.vulnerableUntil > 0 && time > state.vulnerableUntil) {
      state.vulnerableUntil = 0;
      state.ghostsEatenStreak = 0; // Reset streak when time expires
      state.ghosts.forEach(g => {
        if (g.status === GhostStatus.VULNERABLE) g.status = GhostStatus.NORMAL;
      });
    }

    // Cleanup expired popups (1 second duration)
    if (state.popups.length > 0) {
      state.popups = state.popups.filter(p => time - p.timestamp < 1000);
    }

    const COLLISION_DIST = 0.5;
    state.ghosts.forEach(ghost => {
      if (ghost.status === GhostStatus.EATEN) return;
      
      const dx = ghost.pos.x - state.pacman.pos.x;
      const dy = ghost.pos.y - state.pacman.pos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      if (dist < COLLISION_DIST) {
        if (ghost.status === GhostStatus.VULNERABLE) {
          ghost.status = GhostStatus.EATEN;
          
          // Score Calculation with Streak Multiplier
          state.ghostsEatenStreak++;
          const multiplier = Math.pow(2, state.ghostsEatenStreak - 1); // 1, 2, 4, 8...
          const points = 200 * multiplier; // 200, 400, 800, 1600
          state.score += points;

          // Add Popup Animation
          state.popups.push({
            id: Math.random(),
            x: ghost.pos.x,
            y: ghost.pos.y,
            score: points,
            timestamp: time
          });

        } else {
          handleDeath();
        }
      }
    });

    setUiState(prev => ({
      ...prev,
      score: state.score,
      pelletsRemaining: state.pelletsRemaining,
      popups: [...state.popups] // Create new reference to trigger render
    }));
    setTick(t => t + 1);
  };

  const handleDeath = () => {
    gameState.current.lives -= 1;
    setUiState(prev => ({ ...prev, lives: gameState.current.lives }));

    if (gameState.current.lives <= 0) {
      handleDemotionOrGameOver();
    } else {
      // Just reset positions, no fancy level restart
      resetPositions();
    }
  };

  const handleDemotionOrGameOver = () => {
    // Stop the game loop physics (via status)
    gameState.current.status = 'LEVEL_TRANSITION'; 
    const { round, score } = gameState.current;
    
    if (round === 1) {
      saveScore(teamName, score);
      onGameOver(score);
    } else {
      gameState.current.lives = 3;
      // Triggers initRound which handles the ROUND_START state
      initRound(1, true); 
    }
  };

  const handleLevelComplete = () => {
     gameState.current.status = 'LEVEL_TRANSITION';
     
     // Feedback
     setUiState(prev => ({
        ...prev,
        isPaused: true,
        pauseMessage: 'ROUND COMPLETE',
        countdown: 0
     }));
     
     setTimeout(() => {
        if (gameState.current.round < 3) {
            initRound(gameState.current.round + 1, true);
        } else {
            // VICTORY CONDITION: End of Round 3
            saveScore(teamName, gameState.current.score);
            onGameWin(gameState.current.score);
        }
     }, 2000);
  };

  const requestRef = useRef<number>(0);
  const animate = (time: number) => {
    update(time);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); 

  const getRotation = (dir: Direction) => {
    switch (dir) {
      case Direction.UP: return '-rotate-90';
      case Direction.DOWN: return 'rotate-90';
      case Direction.LEFT: return 'rotate-180';
      default: return 'rotate-0';
    }
  };

  const getGhostColor = (ghost: GhostEntity) => {
    if (ghost.status === GhostStatus.VULNERABLE) return 'bg-blue-300 animate-pulse';
    return ghost.color;
  };

  const { grid, pacman, ghosts, vulnerableUntil } = gameState.current;
  const isVulnerable = vulnerableUntil > 0 && performance.now() < vulnerableUntil;

  // Determine current effective round ID (cycles 1-3)
  const currentThemeId = ((uiState.round - 1) % 3) + 1;

  return (
    <div className="flex flex-col items-center w-full relative min-h-screen justify-center">
      <style>{`
        @keyframes floatUp {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          40% { transform: translate(-50%, -120%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -200%) scale(1); opacity: 0; }
        }
        .float-score {
          animation: floatUp 0.8s ease-out forwards;
        }
        @keyframes flash {
          0% { background-color: rgba(255, 255, 255, 0.4); box-shadow: 0 0 50px rgba(255,255,255,0.4) inset; }
          100% { background-color: transparent; box-shadow: none; }
        }
        .animate-flash {
          animation: flash 0.5s ease-out;
        }

        /* --- Dynamic Lighting Animations --- */
        @keyframes theme-pulse-1 {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
        @keyframes theme-pulse-2 {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.05); }
        }
        @keyframes theme-pulse-3 {
          0%, 100% { opacity: 0.3; transform: scale(1); filter: brightness(1); }
          50% { opacity: 0.6; transform: scale(1.02); filter: brightness(1.2); }
        }
        .theme-anim-1 { animation: theme-pulse-1 8s infinite ease-in-out; }
        .theme-anim-2 { animation: theme-pulse-2 5s infinite ease-in-out; }
        .theme-anim-3 { animation: theme-pulse-3 2.5s infinite ease-in-out; }
      `}</style>

      {/* DYNAMIC BACKGROUND LIGHTING */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden pointer-events-none">
        {[1, 2, 3].map((themeId) => {
          const theme = ROUND_THEMES[themeId as keyof typeof ROUND_THEMES];
          const isActive = currentThemeId === themeId;
          return (
            <div 
              key={themeId}
              className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
            >
              {/* Static Gradient Base */}
              <div 
                className="absolute inset-0" 
                style={{ background: theme.gradient }} 
              />
              {/* Pulsing Glow Overlay */}
              <div 
                className={`absolute inset-0 mix-blend-screen ${theme.animClass}`}
                style={{ 
                  background: `radial-gradient(circle at center, ${theme.glowColor} 0%, transparent 70%)` 
                }}
              />
            </div>
          );
        })}
      </div>

      {/* HUD: Scaled Up */}
      <div 
        className="flex justify-between w-full mb-6 px-4 text-white pixel-font z-10"
        style={{ maxWidth: `${MAX_BOARD_WIDTH}px` }}
      >
        <div className="flex flex-col gap-2">
          <p className="text-yellow-400 text-lg md:text-2xl drop-shadow-md">SCORE: {uiState.score}</p>
          <p className="text-green-400 text-sm md:text-lg opacity-80">FPS: {uiState.fps}</p>
        </div>
        <div className="text-center flex flex-col gap-2">
          <p className="text-blue-400 text-xl md:text-3xl font-bold drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]">ROUND {uiState.round}</p>
          <p className="text-sm md:text-xl text-pink-300">PELLETS: {uiState.pelletsRemaining}</p>
        </div>
        <div className="text-right flex flex-col gap-2">
          <p className="text-red-400 text-lg md:text-2xl drop-shadow-md">LIVES</p>
          <p className="text-xl md:text-3xl text-red-600 tracking-widest drop-shadow-sm">
            {Array(Math.max(0, uiState.lives)).fill('♥').join(' ')}
          </p>
        </div>
      </div>

      {/* MAZE CONTAINER */}
      <div className="relative bg-black border-8 border-blue-900 rounded-xl shadow-2xl overflow-hidden z-10">
        {/* Flash Overlay */}
        {uiState.respawnFlash && (
          <div className="absolute inset-0 z-40 pointer-events-none animate-flash"></div>
        )}
        
        <div 
          className="grid gap-0"
          style={{ 
            gridTemplateColumns: `repeat(${MAP_WIDTH}, 1fr)`,
            width: `min(98vw, ${MAX_BOARD_WIDTH}px)`, // Use larger width constraint
            aspectRatio: `${MAP_WIDTH}/${grid.length}`
          }}
        >
          {grid.map((row, y) => (
            row.map((cell, x) => (
              <div key={`${x}-${y}`} className="w-full h-full flex items-center justify-center relative">
                {/* Wall: Thicker border for larger tiles */}
                {cell === TileType.WALL && (
                  <div className="w-full h-full bg-blue-900/40 border-2 border-blue-600/50 box-border rounded-sm shadow-[inset_0_0_6px_rgba(59,130,246,0.4)]"></div>
                )}
                {/* Pellet: Slightly larger relative size (25%) */}
                {cell === TileType.PELLET && (
                  <div className="w-[25%] h-[25%] bg-pink-200 rounded-full shadow-[0_0_4px_#fff]"></div>
                )}
                {/* Power Pellet */}
                {cell === TileType.POWER_PELLET && (
                  <div className="w-[50%] h-[50%] bg-yellow-200 rounded-full animate-pulse shadow-[0_0_12px_#ff0]"></div>
                )}
                {/* Ghost Spawn: Thicker line */}
                {cell === TileType.GHOST_SPAWN && (
                  <div className="w-full h-[4px] bg-pink-500/50"></div>
                )}
              </div>
            ))
          ))}
        </div>

        {/* PACMAN SPRITE */}
        <div 
          className="absolute transition-transform duration-75 ease-linear will-change-transform"
          style={{
            width: `calc(100% / ${MAP_WIDTH})`,
            height: `calc(100% / ${grid.length})`,
            transform: `translate(${pacman.pos.x * 100}%, ${pacman.pos.y * 100}%)`,
            left: 0, top: 0
          }}
        >
          <div className={`w-[80%] h-[80%] mx-auto my-auto bg-yellow-400 rounded-full relative ${getRotation(pacman.dir)} shadow-[0_0_8px_rgba(250,204,21,0.6)]`}>
             <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-black" style={{ clipPath: 'polygon(100% 0, 0 50%, 100% 100%)' }}></div>
          </div>
        </div>

        {/* GHOST SPRITES */}
        {ghosts.map(ghost => {
          if (ghost.status === GhostStatus.EATEN) return null;
          return (
            <div 
              key={ghost.id}
              className="absolute transition-transform duration-100 ease-linear z-10 will-change-transform"
              style={{
                width: `calc(100% / ${MAP_WIDTH})`,
                height: `calc(100% / ${grid.length})`,
                transform: `translate(${ghost.pos.x * 100}%, ${ghost.pos.y * 100}%)`,
                left: 0, top: 0
              }}
            >
              <div className={`w-[80%] h-[80%] mx-auto my-auto ${getGhostColor(ghost)} rounded-t-full relative transition-colors duration-300 shadow-[0_0_8px_rgba(0,0,0,0.5)]`}>
                {ghost.status === GhostStatus.VULNERABLE ? (
                  <div className="flex justify-center space-x-1 pt-2 opacity-70">
                     <div className="w-[15%] h-[15%] bg-white rounded-full"></div>
                     <div className="w-[15%] h-[15%] bg-white rounded-full"></div>
                  </div>
                ) : (
                  <>
                    <div className="absolute top-[15%] left-[15%] w-[25%] h-[25%] bg-white rounded-full">
                      <div className="absolute top-[20%] right-0 w-[50%] h-[50%] bg-blue-900 rounded-full"></div>
                    </div>
                    <div className="absolute top-[15%] right-[15%] w-[25%] h-[25%] bg-white rounded-full">
                      <div className="absolute top-[20%] right-0 w-[50%] h-[50%] bg-blue-900 rounded-full"></div>
                    </div>
                  </>
                )}
                <div className="absolute bottom-0 w-full flex justify-between">
                  <div className="w-1/3 h-[20%] bg-black rounded-t-full"></div>
                  <div className="w-1/3 h-[20%] bg-black rounded-t-full"></div>
                  <div className="w-1/3 h-[20%] bg-black rounded-t-full"></div>
                </div>
              </div>
            </div>
          );
        })}

        {/* SCORE POPUPS */}
        {uiState.popups.map(popup => (
           <div 
             key={popup.id}
             className="absolute text-cyan-200 font-bold pixel-font z-50 float-score pointer-events-none"
             style={{
                left: `${(popup.x + 0.5) * 100 / MAP_WIDTH}%`, // Center horizontally in tile
                top: `${(popup.y + 0.5) * 100 / grid.length}%`, // Center vertically in tile
                fontSize: 'min(3vw, 20px)',
                textShadow: '2px 2px 0px #000'
             }}
           >
             {popup.score}
           </div>
        ))}

        {/* Round Start / Pause Overlay */}
        {uiState.isPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-20 backdrop-blur-sm">
             <p className="text-yellow-400 pixel-font text-center px-4 leading-loose tracking-widest text-2xl md:text-4xl animate-pulse shadow-black drop-shadow-xl">
               {uiState.pauseMessage}
             </p>
             {uiState.countdown > 0 && (
                <div className="mt-8 text-8xl text-white font-bold pixel-font drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]">
                  {uiState.countdown}
                </div>
             )}
          </div>
        )}
      </div>
      
      {isVulnerable && (
         <div className="mt-4 text-blue-300 text-lg md:text-xl pixel-font animate-pulse z-10">
            GHOSTS VULNERABLE!
         </div>
      )}
    </div>
  );
};

export default GameScreen;