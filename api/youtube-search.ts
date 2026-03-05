import type { IncomingMessage, ServerResponse } from "http";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const SEARCH_MAX_RESULTS = 12;

const ipHits = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Method not allowed" }));
  }

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    res.writeHead(429, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Too many requests. Try again in a minute." }));
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const q = url.searchParams.get("q");
  if (!q) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing query parameter 'q'" }));
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "YouTube API key not configured on server" }));
  }

  try {
    const searchParams = new URLSearchParams({
      part: "id,snippet",
      q,
      maxResults: String(SEARCH_MAX_RESULTS),
      type: "video",
      videoEmbeddable: "true",
      videoDuration: "medium",
      safeSearch: "none",
      key: apiKey,
    });
    const searchUrl = `${YOUTUBE_API_BASE}/search?${searchParams.toString()}`;
    const upstream = await fetch(searchUrl);
    const data = await upstream.json();

    if (!upstream.ok) {
      res.writeHead(upstream.status, {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      });
      return res.end(JSON.stringify(data));
    }

    const videoIds = (data.items ?? [])
      .map((item: any) => item.id?.videoId)
      .filter((videoId: string | undefined): videoId is string => Boolean(videoId));

    if (videoIds.length > 0) {
      const videosParams = new URLSearchParams({
        part: "snippet,contentDetails,statistics",
        id: videoIds.join(","),
        maxResults: String(videoIds.length),
        key: apiKey,
      });
      const videosUrl = `${YOUTUBE_API_BASE}/videos?${videosParams.toString()}`;
      const videoResponse = await fetch(videosUrl);
      const videoData = await videoResponse.json().catch(() => ({ items: [] }));

      if (videoResponse.ok) {
        const videosById = new Map<string, any>(
          (videoData.items ?? [])
            .map((item: any) => [item.id, item] as const)
            .filter((entry: readonly [string | undefined, any]): entry is readonly [string, any] => Boolean(entry[0])),
        );

        data.items = (data.items ?? []).map((item: any) => {
          const enriched = videosById.get(item.id?.videoId);
          if (!enriched) return item;

          return {
            ...item,
            snippet: {
              ...item.snippet,
              ...enriched.snippet,
            },
            contentDetails: enriched.contentDetails,
            statistics: enriched.statistics,
          };
        });
      }
    }

    res.writeHead(upstream.status, {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    });
    return res.end(JSON.stringify(data));
  } catch (err: any) {
    res.writeHead(502, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: err.message || "Upstream request failed" }));
  }
}
