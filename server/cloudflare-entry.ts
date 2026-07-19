import cloudflareHandler from "nitropack/presets/cloudflare/runtime/cloudflare-module";
import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import {
  encodeRoomConnectionUser,
  isRoomSocketBootstrap,
  ROOM_SESSION_USER_HEADER,
} from "~/utils/room-realtime";
import type { AppEnv } from "./utils/cloudflare";
import { RoomSession } from "./durable-objects/room-session";

interface CloudflareEnv extends AppEnv {
  ROOM_SESSION: DurableObjectNamespace<RoomSession>;
  MAINTENANCE_SECRET?: string;
  NUXT_PUBLIC_SITE_URL?: string;
}

const ROOM_SOCKET_PATH = /^\/api\/rooms\/([^/]+)\/socket\/?$/;
const WEBSOCKET_HEADERS = [
  "connection",
  "upgrade",
  "sec-websocket-extensions",
  "sec-websocket-key",
  "sec-websocket-protocol",
  "sec-websocket-version",
];

async function authorizeRoomSocket(
  request: Request,
  env: CloudflareEnv,
  context: ExecutionContext,
) {
  const headers = new Headers(request.headers);
  for (const header of WEBSOCKET_HEADERS) headers.delete(header);
  headers.set("accept", "application/json");

  const authRequest = new Request(request.url, {
    method: "GET",
    headers,
  });

  return cloudflareHandler.fetch(authRequest, env, context);
}

const handler = {
  ...cloudflareHandler,
  async fetch(
    request: Request,
    env: CloudflareEnv,
    context: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const socketMatch = ROOM_SOCKET_PATH.exec(url.pathname);
    const isRoomSocket = request.headers.get("upgrade")?.toLowerCase() === "websocket"
      && socketMatch;

    if (!isRoomSocket) {
      return cloudflareHandler.fetch(request, env, context);
    }

    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) {
      return new Response("Invalid websocket origin.", { status: 403 });
    }

    if (!env.ROOM_SESSION) {
      return new Response("Room realtime binding is not configured.", { status: 500 });
    }

    let roomId: string;
    try {
      roomId = decodeURIComponent(socketMatch[1]);
    } catch {
      return new Response("Invalid room identifier.", { status: 400 });
    }

    try {
      const authResponse = await authorizeRoomSocket(request, env, context);
      if (!authResponse.ok) return authResponse;

      const bootstrap: unknown = await authResponse.json();
      if (!isRoomSocketBootstrap(bootstrap) || bootstrap.state.room?.id !== roomId) {
        console.error(JSON.stringify({
          message: "invalid room socket bootstrap",
          roomId,
        }));
        return new Response("Unable to initialize room connection.", { status: 500 });
      }

      const stub = env.ROOM_SESSION.getByName(roomId);
      await stub.commitStateSync(bootstrap.syncSequence, bootstrap.state);

      const headers = new Headers(request.headers);
      headers.set(ROOM_SESSION_USER_HEADER, encodeRoomConnectionUser(bootstrap.user));
      return stub.fetch(new Request(request, { headers }));
    } catch (error) {
      console.error(JSON.stringify({
        message: "room websocket upgrade failed",
        roomId,
        error: error instanceof Error ? error.message : String(error),
      }));
      return new Response("Unable to connect to room realtime.", { status: 500 });
    }
  },
  async scheduled(
    _controller: ScheduledController,
    env: CloudflareEnv,
    context: ExecutionContext,
  ): Promise<void> {
    if (!env.MAINTENANCE_SECRET) {
      console.error("[guest-cleanup] MAINTENANCE_SECRET is not configured");
      return;
    }

    try {
      const origin = env.NUXT_PUBLIC_SITE_URL || "https://supapoker.dev";
      const request = new Request(new URL("/api/internal/maintenance/guests", origin), {
        method: "POST",
        headers: {
          "x-supapoker-maintenance-secret": env.MAINTENANCE_SECRET,
        },
      });
      const response = await cloudflareHandler.fetch(request, env, context);
      if (!response.ok) {
        console.error("[guest-cleanup] Scheduled cleanup failed", {
          status: response.status,
          body: await response.text(),
        });
      }
    } catch (error) {
      console.error("[guest-cleanup] Scheduled cleanup threw", {
        error: error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
      });
    }
  },
};

export default handler;
export { RoomSession };
