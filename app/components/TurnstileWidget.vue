<script lang="ts">
interface TurnstileApi {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

let scriptLoadPromise: Promise<void> | null = null;

function getTurnstileApi() {
  return (window as typeof window & { turnstile?: TurnstileApi }).turnstile;
}

function loadTurnstileScript() {
  if (getTurnstileApi()) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  document.querySelector<HTMLScriptElement>('script[data-supapoker-turnstile]')?.remove();

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      script.remove();
      scriptLoadPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.supapokerTurnstile = "true";
    script.addEventListener("load", () => {
      if (getTurnstileApi()) resolve();
      else fail();
    }, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}
</script>

<script setup lang="ts">
const props = defineProps<{ siteKey: string }>();
const token = defineModel<string>({ default: "" });
const emit = defineEmits<{ error: [] }>();
const container = useTemplateRef<HTMLElement>("container");
let widgetId: string | null = null;

function getApi() {
  return getTurnstileApi();
}

async function renderWidget() {
  if (!props.siteKey || !container.value || widgetId) return;
  try {
    await loadTurnstileScript();
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
