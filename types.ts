export interface MusicMix {
  id: string;
  style: string;
  country: string;
  continent: string;
  artist: string;
  year: string;
  bpm: number;
  description: string;
  searchQuery: string;
  videoId?: string; // Cache the YouTube ID once found
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface SearchCriteria {
  continent: string;
  country: string;
  style: string;
  year: string;
  bpm: string;
}

export interface GeneratedPlaylist {
  id: string;
  title: string;
  url: string;
}

export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
  };
}

export interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

declare global {
  interface Window {
    google: any;
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}