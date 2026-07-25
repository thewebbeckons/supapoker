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

  /**
   * Resolves true once a token exists. An invisible widget can still be in
   * flight when the user submits, and there is nothing on screen to explain a
   * disabled button, so those callers await this instead of gating submit.
   * Resolves false if no token arrives in time.
   */
  function waitForToken(timeoutMs = 15_000) {
    if (solved.value) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      let stop = () => {};
      const timer = setTimeout(() => {
        stop();
        resolve(false);
      }, timeoutMs);

      stop = watch(token, (value) => {
        if (!value) return;
        clearTimeout(timer);
        stop();
        resolve(true);
      });
    });
  }

  function reset() {
    token.value = "";
    widget.value?.reset();
  }

  return { token, failed, siteKey, enabled, solved, headers, waitForToken, reset };
}
