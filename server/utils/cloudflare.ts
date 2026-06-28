import type { H3Event } from "h3";

export interface AppEnv {
  ROOM_SESSION?: DurableObjectNamespace;
  EMAIL?: {
    send(message: {
      to: string | string[];
      from: { email: string; name?: string };
      subject: string;
      html: string;
      text: string;
    }): Promise<unknown>;
  };
}

export function getCloudflareEnv(event: H3Event): AppEnv {
  const req = event.node.req as typeof event.node.req & {
    runtime?: { cloudflare?: { env?: AppEnv } };
  };

  return req.runtime?.cloudflare?.env ?? (event.context.cloudflare?.env as AppEnv | undefined) ?? {};
}

export function requireRoomSessionNamespace(event: H3Event) {
  const env = getCloudflareEnv(event);
  if (!env.ROOM_SESSION) {
    throw createError({
      statusCode: 500,
      message: "Room realtime binding is not configured.",
    });
  }
  return env.ROOM_SESSION;
}
