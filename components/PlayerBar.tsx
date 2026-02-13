import React, { useEffect, useRef, useState } from 'react';
import { MusicMix } from '../types';

interface PlayerBarProps {
  currentMix: MusicMix | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  videoId: string | undefined;
  onVideoEnd: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ 
  currentMix, 
  isPlaying, 
  onPlayPause, 
  onNext, 
  onPrev,
  videoId,
  onVideoEnd
}) => {
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setPlayerReady(true);
      };
    } else {
      setPlayerReady(true);
    }
  }, []);

  // Initialize Player when API is ready
  useEffect(() => {
    if (playerReady && !playerRef.current) {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '0',
        width: '0',
        playerVars: {
          'playsinline': 1,
          'controls': 0,
        },
        events: {
          'onStateChange': (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onVideoEnd();
            }
            if (event.data === window.YT.PlayerState.PLAYING) {
               setDuration(playerRef.current.getDuration());
            }
          }
        }
      });
    }
  }, [playerReady, onVideoEnd]);

  // Handle Video ID changes
  useEffect(() => {
    if (playerRef.current && videoId && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      // Wait a bit for buffering usually, but loadVideoById auto plays
    }
  }, [videoId]);

  // Handle Play/Pause props
  useEffect(() => {
    if (playerRef.current && playerRef.current.playVideo) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  // Progress Bar ticker
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!currentMix) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 shadow-2xl z-50">
      {/* Hidden container for YouTube logic */}
      <div id="yt-player" className="hidden"></div>
      
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Track Info */}
        <div className="flex items-center gap-4 w-1/3 overflow-hidden">
          <div className="w-12 h-12 bg-zinc-800 rounded flex items-center justify-center text-xs font-bold text-zinc-500 shrink-0">
             {currentMix.continent.substring(0,2).toUpperCase()}
          </div>
          <div className="truncate">
            <h4 className="text-white font-bold truncate text-sm">{currentMix.artist}</h4>
            <p className="text-zinc-400 text-xs truncate">{currentMix.style} • {currentMix.country}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-1/3">
          <div className="flex items-center gap-6 mb-2">
            <button onClick={onPrev} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            
            <button 
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-colors"
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            
            <button onClick={onNext} className="text-zinc-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <div className="h-1 bg-zinc-800 rounded-full flex-1 overflow-hidden relative">
               <div 
                 className="absolute top-0 left-0 h-full bg-indigo-500 transition-all duration-300"
                 style={{ width: `${progress}%` }}
               />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Placeholder for Volume/Extras */}
        <div className="w-1/3 flex justify-end">
           {videoId === undefined && isPlaying && (
             <span className="text-indigo-400 text-xs animate-pulse">Buscando video...</span>
           )}
        </div>

      </div>
    </div>
  );
};