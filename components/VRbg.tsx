'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import VRScene from './VRScene';
import PortalHUD from './PortalHUD';
import AnalyzePanel from './Analyze';
import Directory from './Directory';
import Chatbot from './Chatbot';
import LearnPanel from './Learn';
import Form from './MintForm';
import Mythology from './Mythology';
import Reserve from './Reserve';

export default function VRBackground() {
  const [currentView, setCurrentView] = useState('Diamond Viewer'); // Start with Net view
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Chatbot State
  const [messages, setMessages] = useState<{ sender: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [optionsVisible, setOptionsVisible] = useState(true);

  // Initialize Audio
  useEffect(() => {
    // Standard audio for iehome
    audioRef.current = new Audio('/TheGameOfLife.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'Diamond Viewer': // NET
        return <AnalyzePanel />;
      case 'Chat':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[100px] md:bottom-[120px] flex items-center justify-center px-2 md:px-4 pt-20 md:pt-28 pointer-events-none">
            <div className="w-full h-full max-w-5xl pointer-events-auto">
              <Chatbot
                messages={messages}
                setMessages={setMessages}
                input={input}
                setInput={setInput}
                optionsVisible={optionsVisible}
                setOptionsVisible={setOptionsVisible}
              />
            </div>
          </div>
        );
      case 'Directory':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[100px] md:bottom-[120px] flex items-center justify-center px-2 md:px-4 pt-20 md:pt-28 pointer-events-none">
            <div className="w-full h-full max-w-[98vw] overflow-hidden pointer-events-auto">
              <Directory />
            </div>
          </div>
        );
      case 'Learn':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[100px] md:bottom-[120px] flex items-center justify-center px-2 md:px-4 pt-20 md:pt-28 pointer-events-none">
            <div className="w-full h-full max-w-5xl overflow-auto pointer-events-auto">
              <LearnPanel />
            </div>
          </div>
        );
      case 'Reserve':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[100px] md:bottom-[120px] flex items-center justify-center px-2 md:px-4 pt-20 md:pt-28 pointer-events-none">
            <div className="w-full h-full max-w-5xl overflow-auto pointer-events-auto">
              <Reserve />
            </div>
          </div>
        );
      case 'Buy':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[100px] md:bottom-[120px] flex items-center justify-center px-2 md:px-4 pt-20 md:pt-28 pointer-events-none">
            <div className="w-full h-full max-w-4xl overflow-auto pointer-events-auto">
              <Form />
            </div>
          </div>
        );
      case 'Mythology':
        return (
          <div className="absolute inset-x-0 top-0 bottom-[100px] md:bottom-[120px] flex items-center justify-center px-2 md:px-4 pt-20 md:pt-28 pointer-events-none">
            <div className="w-full h-full max-w-5xl overflow-auto pointer-events-auto">
              <Mythology />
            </div>
          </div>
        );
      default:
        return null; // Show nothing or default
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white">
      {/* HUD Navigation */}
      <PortalHUD
        onNavigate={(view) => {
          if (currentView === view) {
            setCurrentView(''); // Toggle off
          } else {
            setCurrentView(view);
          }
        }}
        currentView={currentView}
      />

      {/* Music Control */}
      <button
        onClick={toggleMusic}
        className="fixed z-[2000] rounded-full transition-all duration-300 hover:scale-110 pointer-events-auto
          bottom-4 right-4 p-2 md:bottom-8 md:right-8 md:p-3"
        style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
        title="Toggle Music"
      >
        {isPlaying ? (
          <div className="animate-pulse text-white">🔊</div>
        ) : (
          <div className="text-white/50">🔇</div>
        )}
      </button>

      {/* VR Scene Background */}
      <div className="absolute inset-0 z-0 select-none">
        <VRScene
          onLoad={() => setIsLoaded(true)}
        />
      </div>

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-[5000] flex items-center justify-center bg-black">
          <div className="flex flex-col items-center">
            <img src="/Medallions/IE.png" className="w-16 h-16 animate-pulse mb-4" />
            <div className="text-white font-mono tracking-widest text-xl">
              INITIALIZING_PORTAL...
            </div>
          </div>
        </div>
      )}

      {/* Main Content Overlay */}
      {renderView()}

    </div>
  );
}
