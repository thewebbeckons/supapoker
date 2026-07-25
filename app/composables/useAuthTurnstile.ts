/**
 * Wires the Turnstile widget to a better-auth call. The captcha plugin reads the
 * token from the `x-captcha-response` header, and Turnstile tokens are
 * single-use, so the widget must be reset after every submit — success or not.
 */
export function useAuthTurnstile() {
  const config = useRuntimeConfig();
  const token = ref("");
  const failed = ref(false);
  const widget = useTemplateRef<{ reset: () => void }>("turnstileWidget");

  const siteKey = computed(() => config.public.turnstileSiteKey);
  const enabled = computed(() => Boolean(siteKey.value));

  /** False while a configured widget has yet to produce a token. */
  const solved = computed(() => !enabled.value || Boolean(token.value));

  function headers() {
    return token.value ? { "x-captcha-response": token.value } : {};
  }

  function reset() {
    token.value = "";
    widget.value?.reset();
  }

  return { token, failed, siteKey, enabled, solved, headers, reset };
}
