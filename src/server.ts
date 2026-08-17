import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // 1. Direct server-to-server Notion API Proxy
      if (url.pathname.startsWith("/api/notion")) {
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

        const notionPath = url.pathname.replace(/^\/api\/notion/, "") + url.search;
        const targetUrl = `https://api.notion.com/v1${notionPath.startsWith("/") ? notionPath : `/${notionPath}`}`;

        const authHeader = request.headers.get("authorization") || "";
        const notionVersion = request.headers.get("notion-version") || "2022-06-28";

        const forwardHeaders: Record<string, string> = {
          "Authorization": authHeader,
          "Notion-Version": notionVersion,
          "Content-Type": "application/json",
        };

        const bodyData = ["GET", "HEAD"].includes(request.method) ? null : await request.text();

        const notionRes = await fetch(targetUrl, {
          method: request.method,
          headers: forwardHeaders,
          body: bodyData,
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
      }

      // 2. Standard TanStack Start SSR handler
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
