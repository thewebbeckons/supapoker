<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    tone?: "default" | "muted";
    margin?: string;
  }>(),
  {
    tone: "default",
    margin: "0 0 16px",
  },
);

const fontStack =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";

const textStyle = computed(() => ({
  margin: props.margin,
  color: props.tone === "muted" ? "#8b8b95" : "#d4d4d8",
  fontFamily: fontStack,
  fontSize: "14px",
  lineHeight: "1.7",
}));
</script>

<template>
  <p :style="textStyle">
    <slot />
  </p>
</template>
