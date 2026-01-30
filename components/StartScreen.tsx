import React, { useState } from 'react';

interface StartScreenProps {
  onStart: (teamName: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      onStart(name.trim().toUpperCase());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-12 animate-fade-in w-full">
      <h1 className="text-6xl md:text-7xl text-yellow-400 font-bold tracking-widest text-shadow-retro pixel-font text-center leading-snug drop-shadow-[0_4px_8px_rgba(250,204,21,0.5)]">
        PAC-MAN<br/>GHOST HUNT
      </h1>
      
      <div className="bg-gray-800 p-10 md:p-14 rounded-xl border-8 border-blue-800 shadow-2xl w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-10">
          <label className="text-white text-2xl md:text-3xl text-center pixel-font drop-shadow-md">ENTER TEAM NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-black text-yellow-400 border-4 border-yellow-600 p-6 text-center text-3xl md:text-4xl outline-none focus:border-yellow-300 pixel-font uppercase shadow-inner"
            placeholder="AAA"
            maxLength={10}
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 px-8 rounded-lg pixel-font text-xl md:text-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            INSERT COIN (START)
          </button>
        </form>
      </div>
      
      <div className="text-gray-400 text-sm md:text-lg mt-8 pixel-font text-center max-w-3xl leading-relaxed opacity-80">
        <span className="text-yellow-300">MISSION:</span> EAT POWER PELLETS TO HUNT GHOSTS.<br/>
        CLEAR THE ROUND BY ELIMINATING ALL GHOSTS!
      </div>
    </div>
  );
};

export default StartScreen;