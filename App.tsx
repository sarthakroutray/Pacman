import React, { useState } from 'react';
import StartScreen from './components/StartScreen';
import GameScreen from './screens/GameScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>('START');
  const [teamName, setTeamName] = useState('');
  const [finalScore, setFinalScore] = useState(0);

  const handleStartGame = (name: string) => {
    setTeamName(name);
    setStatus('PLAYING');
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setStatus('GAME_OVER');
  };
  
  const handleGameWin = (score: number) => {
    setFinalScore(score);
    setStatus('VICTORY');
  };

  const handleRestart = () => {
    setStatus('START');
    setTeamName('');
    setFinalScore(0);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {status === 'START' && (
          <StartScreen onStart={handleStartGame} />
        )}

        {status === 'PLAYING' && (
          <GameScreen 
            teamName={teamName} 
            onGameOver={handleGameOver} 
            onGameWin={handleGameWin}
          />
        )}

        {(status === 'GAME_OVER' || status === 'VICTORY' || status === 'LEADERBOARD') && (
          <LeaderboardScreen 
            currentScore={finalScore} 
            teamName={teamName}
            onRestart={handleRestart}
            isGameOver={status === 'GAME_OVER' || status === 'VICTORY'}
            isVictory={status === 'VICTORY'}
          />
        )}
      </div>
    </div>
  );
};

export default App;