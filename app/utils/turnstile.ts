/**
 * Turnstile actions. Each flow gets its own action so a token minted for one
 * context cannot be replayed against another; the server rejects any token
 * whose reported action does not match the endpoint it arrived at.
 *
 * Shared with the server (see `server/utils/auth.ts`) so the widget and the
 * verifier can never drift apart.
 */
export const AUTH_TURNSTILE_ACTION = "auth-v1";
