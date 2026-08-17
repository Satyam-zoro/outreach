export const config = {
  runtime: "edge",
};

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const url = new URL(request.url);
    const queryPath = url.searchParams.get("path");
    const path = queryPath || url.pathname.replace(/^\/api\/notion/, "") || "";
    const cleanPath = path.startsWith("/") ? path : `/${path}`;

    const targetUrl = `https://api.notion.com/v1${cleanPath}`;

    const authHeader = request.headers.get("authorization") || (process.env.NOTION_TOKEN ? `Bearer ${process.env.NOTION_TOKEN}` : "");
    const notionVersion = request.headers.get("notion-version") || "2022-06-28";

    const forwardHeaders: Record<string, string> = {
      Authorization: authHeader,
      "Notion-Version": notionVersion,
      "Content-Type": "application/json",
    };

    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();

    const notionRes = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body,
    });

    const resHeaders = new Headers(notionRes.headers);
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    resHeaders.set("Access-Control-Allow-Headers", "*");

    const resText = await notionRes.text();
    return new Response(resText, {
      status: notionRes.status,
      headers: resHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
