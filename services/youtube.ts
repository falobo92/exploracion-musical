import { YouTubeVideo } from "../types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Searches for a video ID based on a query.
 */
export const searchVideo = async (query: string, accessToken: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?part=id,snippet&q=${encodeURIComponent(query)}&maxResults=1&type=video`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("YouTube Search Error", err);
      throw new Error("Failed to search video");
    }

    const data = await response.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    return null;
  } catch (error) {
    console.error("Search API Exception:", error);
    return null;
  }
};

/**
 * Creates a new playlist on the authenticated user's channel.
 */
export const createPlaylist = async (title: string, description: string, accessToken: string): Promise<string> => {
  const response = await fetch(`${YOUTUBE_API_BASE}/playlists?part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        title: title,
        description: description,
      },
      status: {
        privacyStatus: "private", // Default to private for safety
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create playlist");
  }

  const data = await response.json();
  return data.id;
};

/**
 * Adds a video to a playlist.
 */
export const addVideoToPlaylist = async (playlistId: string, videoId: string, accessToken: string) => {
  const response = await fetch(`${YOUTUBE_API_BASE}/playlistItems?part=snippet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        playlistId: playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId: videoId,
        },
      },
    }),
  });

  if (!response.ok) {
    console.error("Failed to add video to playlist");
  }
};
