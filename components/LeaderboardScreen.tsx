import React, { useEffect, useState } from 'react';
import { HighScore } from '../types';
import { getLeaderboard } from '../utils/storage';

interface LeaderboardScreenProps {
  currentScore: number;
  teamName: string;
  onRestart: () => void;
  isGameOver: boolean; // Distinction between just viewing scores vs dying
  isVictory?: boolean;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ currentScore, teamName, onRestart, isGameOver, isVictory }) => {
  const [scores, setScores] = useState<HighScore[]>([]);

  useEffect(() => {
    setScores(getLeaderboard());
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto space-y-8 animate-fade-in p-6">
      {isGameOver && (
        <div className="text-center mb-8 scale-110">
          <h2 className={`text-6xl md:text-7xl font-bold mb-6 pixel-font drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] ${isVictory ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.8)]' : 'text-red-500'}`}>
            {isVictory ? 'MISSION COMPLETE' : 'GAME OVER'}
          </h2>
          {isVictory && (
             <p className="text-xl md:text-2xl text-yellow-300 mb-6 pixel-font animate-pulse tracking-wide">
               ALL GHOSTS ELIMINATED!
             </p>
          )}
          <p className="text-3xl md:text-4xl text-white pixel-font">
            TEAM: <span className="text-yellow-400">{teamName}</span>
          </p>
          <p className="text-2xl md:text-3xl text-white mt-4 pixel-font">
            FINAL SCORE: <span className="text-green-400">{currentScore}</span>
          </p>
        </div>
      )}

      <div className="bg-gray-900 border-8 border-blue-900 rounded-xl p-8 w-full shadow-2xl">
        <h3 className="text-3xl md:text-4xl text-blue-300 text-center mb-8 pixel-font underline decoration-4 underline-offset-8 drop-shadow-md">
          TOP 5 TEAMS
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-3 text-gray-400 text-sm md:text-lg border-b-2 border-gray-700 pb-4 pixel-font tracking-wider">
            <span className="text-left">RANK</span>
            <span className="text-center">TEAM</span>
            <span className="text-right">SCORE</span>
          </div>
          {scores.map((s, idx) => (
            <div key={idx} className={`grid grid-cols-3 pixel-font text-lg md:text-2xl py-2 ${s.teamName === teamName && s.score === currentScore && isGameOver ? 'text-yellow-300 animate-pulse font-bold' : 'text-white'}`}>
              <span className="text-left">#{idx + 1}</span>
              <span className="text-center">{s.teamName}</span>
              <span className="text-right">{s.score}</span>
            </div>
          ))}
          {scores.length === 0 && (
            <div className="text-center text-gray-500 py-6 pixel-font text-lg">NO SCORES YET</div>
          )}
        </div>
      </div>

      <button
        onClick={onRestart}
        className="mt-10 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-6 px-12 rounded-lg pixel-font text-xl md:text-2xl transition-transform active:scale-95 shadow-[0_0_15px_rgba(234,179,8,0.6)]"
      >
        PLAY AGAIN
      </button>
    </div>
  );
};

export default LeaderboardScreen;