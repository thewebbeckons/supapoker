<script setup lang="ts">
const props = defineProps<{
  burstKey: number;
}>();

interface BirdParticle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  size: number;
}

const particles = ref<BirdParticle[]>([]);
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function clearCleanupTimer() {
  if (!cleanupTimer) return;
  clearTimeout(cleanupTimer);
  cleanupTimer = null;
}

function burst() {
  clearCleanupTimer();
  const emojis = ["🐦", "🪽", "🐤", "🐥"];
  particles.value = Array.from({ length: 34 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 34;
    const distance = 180 + Math.random() * 260;
    return {
      id: crypto.randomUUID(),
      emoji: emojis[index % emojis.length] ?? "🐦",
      x: 50 + (Math.random() * 12 - 6),
      y: 48 + (Math.random() * 10 - 5),
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 80,
      rotate: Math.random() * 720 - 360,
      size: 22 + Math.random() * 18,
    };
  });

  cleanupTimer = setTimeout(() => {
    particles.value = [];
  }, 1200);
}

watch(
  () => props.burstKey,
  (value, previous) => {
    if (value === previous || value === 0) return;
    burst();
  },
);

onUnmounted(() => {
  clearCleanupTimer();
});
</script>

<template>
  <div class="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden="true">
    <span
      v-for="particle in particles"
      :key="particle.id"
      class="bird-particle absolute select-none"
      :style="{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        '--bird-dx': `${particle.dx}px`,
        '--bird-dy': `${particle.dy}px`,
        '--bird-rotate': `${particle.rotate}deg`,
        fontSize: `${particle.size}px`,
      }"
    >
      {{ particle.emoji }}
    </span>
  </div>
</template>

<style scoped>
.bird-particle {
  animation: bird-burst 1150ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transform: translate(-50%, -50%);
}

@keyframes bird-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
  }
  12% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--bird-dx)), calc(-50% + var(--bird-dy))) scale(1.15) rotate(var(--bird-rotate));
  }
}
</style>
