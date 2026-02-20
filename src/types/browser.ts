export {};

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
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: { message?: string }) => void;
          }) => {
            requestAccessToken: (overrides?: unknown) => void;
          };
        };
      };
    };
  }
}

export interface GoogleTokenResponse {
  error?: string;
  error_description?: string;
  access_token?: string;
  expires_in?: string | number;
}
