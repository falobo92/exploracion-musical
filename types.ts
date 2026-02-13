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
  videoId?: string;
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

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
    YT: any;
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrides?: any) => void;
          };
        };
      };
    };
  }
}
