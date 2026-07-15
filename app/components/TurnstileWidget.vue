<script setup lang="ts">
interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

const props = defineProps<{ siteKey: string }>();
const token = defineModel<string>({ default: "" });
const emit = defineEmits<{ error: [] }>();
const container = useTemplateRef<HTMLElement>("container");
let widgetId: string | null = null;

function getApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

function loadScript() {
  const existing = document.querySelector<HTMLScriptElement>('script[data-supapoker-turnstile]');
  if (existing) {
    if (getApi()) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.supapokerTurnstile = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
    document.head.appendChild(script);
  });
}

async function renderWidget() {
  if (!props.siteKey || !container.value || widgetId) return;
  try {
    await loadScript();
    const api = getApi();
    if (!api || !container.value) throw new Error("Turnstile is unavailable");
    widgetId = api.render(container.value, {
      sitekey: props.siteKey,
      action: "turnstile-spin-v1",
      theme: "dark",
      callback: (value: string) => { token.value = value; },
      "expired-callback": () => { token.value = ""; },
      "error-callback": () => {
        token.value = "";
        emit("error");
      },
    });
  } catch {
    emit("error");
  }
}

function reset() {
  token.value = "";
  if (widgetId) getApi()?.reset(widgetId);
}

onMounted(renderWidget);
watch(() => props.siteKey, renderWidget);
onBeforeUnmount(() => {
  if (widgetId) getApi()?.remove(widgetId);
});

defineExpose({ reset });
</script>

<template>
  <div
    ref="container"
    class="cf-turnstile min-h-[65px]"
    :data-sitekey="siteKey"
    data-action="turnstile-spin-v1"
  />
</template>
