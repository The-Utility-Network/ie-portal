'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
const VRScene = dynamic(() => import('./VRScene'), { ssr: false });
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
  const [hasStarted, setHasStarted] = useState(false);
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

  const handleStartExperience = async () => {
    // 1. Request motion sensor permission for iOS
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        console.log('Permission result:', permission);
      } catch (err) {
        console.error('DeviceMotion permission error:', err);
      }
    }

    // 2. Start audio
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => console.error("Initial audio playback failed:", e));
    }

    // 3. Reveal experience
    setHasStarted(true);
  };

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

      {/* Music Control - Only show if started */}
      {hasStarted && (
        <button
          onClick={toggleMusic}
          className="fixed z-[2500] rounded-full transition-all duration-300 hover:scale-110 pointer-events-auto
            top-[calc(env(safe-area-inset-top,0px)+4.5rem)] left-1/2 -translate-x-1/2 p-2.5
            md:top-auto md:bottom-8 md:right-8 md:p-3 md:left-auto md:translate-x-0 group"
          style={{
            background: 'rgba(127, 44, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(127, 44, 255, 0.4)',
            boxShadow: '0 0 15px rgba(127, 44, 255, 0.2)',
          }}
          title="Toggle Music"
        >
          {isPlaying ? (
            <SpeakerWaveIcon className="w-5 h-5 md:w-6 md:h-6 text-white animate-pulse" />
          ) : (
            <SpeakerXMarkIcon className="w-5 h-5 md:w-6 md:h-6 text-white/40 group-hover:text-white/70" />
          )}
        </button>
      )}

      {/* VR Scene Background */}
      <div className="absolute inset-0 z-0 select-none">
        <VRScene
          onLoad={() => setIsLoaded(true)}
        />
      </div>

      {/* Loading / Start Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 z-[5000] flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="flex flex-col items-center max-w-sm text-center px-6">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
              <img src="/Medallions/IE.png" className="relative w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-[0_0_20px_rgba(127,44,255,0.5)] animate-pulse-slow" />
            </div>

            {isLoaded ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] text-white mb-2 font-mono uppercase">
                  Invisible Enemies
                </h1>
                <p className="text-purple-300/60 text-xs md:text-sm font-mono mb-8 tracking-widest uppercase">
                  // PORTAL.READY.FOR.ENTRY
                </p>
                <button
                  onClick={handleStartExperience}
                  className="group relative px-8 py-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50 rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(127,44,255,0.3)]"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/0 via-white/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative text-white font-bold tracking-[0.3em] font-mono text-sm md:text-base">
                    ENTER_PORTAL
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="text-white font-mono tracking-[0.2em] text-lg animate-pulse-slow">
                  INITIALIZING_VIRTUAL_SPACE...
                </div>
                <div className="mt-4 w-32 h-[1px] bg-white/10 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-loading-bar" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Overlay */}
      {hasStarted && renderView()}

    </div>
  );
}
