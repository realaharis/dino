// Simple real-time messaging API
export const config = { runtime: "edge" };

export default async function handler(req) {
  const CHAT_SERVER = (process.env.CHAT_SERVER_URL || "").replace(/\/$/, "");
  
  if (!CHAT_SERVER) {
    return new Response(
      JSON.stringify({ error: "Chat server not configured" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const messageEndpoint = `${CHAT_SERVER}${url.pathname}${url.search}`;
    
    // Prepare headers for chat server
    const chatHeaders = new Headers();
    const skipHeaders = new Set([
      "host", "connection", "keep-alive", "transfer-encoding",
      "upgrade", "te", "trailer", "proxy-connection",
      "proxy-authenticate", "proxy-authorization"
    ]);

    for (const [key, value] of req.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (!skipHeaders.has(lowerKey) && !lowerKey.startsWith("x-vercel-")) {
        chatHeaders.set(key, value);
      }
    }

    // Forward client info
    const clientIP = req.headers.get("x-real-ip") || 
                     req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (clientIP) {
      chatHeaders.set("x-forwarded-for", clientIP);
    }

    // Send message to chat server
    const chatResponse = await fetch(messageEndpoint, {
      method: req.method,
      headers: chatHeaders,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
      redirect: "manual",
    });

    return chatResponse;

  } catch (err) {
    console.error("chat server error:", err);
    return new Response(
      JSON.stringify({ error: "Unable to reach chat server" }), 
      { 
        status: 502, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}
