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

const BURST_COUNT = 5;
const PARTICLES_PER_BURST = 22;
const BURST_STAGGER_MS = 180;
const PARTICLE_ANIMATION_MS = 1050;

const particles = ref<BirdParticle[]>([]);
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let burstTimers: ReturnType<typeof setTimeout>[] = [];

function clearCleanupTimer() {
  if (!cleanupTimer) return;
  clearTimeout(cleanupTimer);
  cleanupTimer = null;
}

function clearBurstTimers() {
  for (const timer of burstTimers) {
    clearTimeout(timer);
  }
  burstTimers = [];
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function createBurstParticles(originX: number, originY: number, burstIndex: number) {
  const emojis = ["🐦", "🪽", "🐤", "🐥"];

  return Array.from({ length: PARTICLES_PER_BURST }, (_, index) => {
    const angle = (Math.PI * 2 * index) / PARTICLES_PER_BURST + randomBetween(-0.18, 0.18);
    const distance = randomBetween(220, 430);

    return {
      id: `${burstIndex}-${index}-${crypto.randomUUID()}`,
      emoji: emojis[(index + burstIndex) % emojis.length] ?? "🐦",
      x: originX + randomBetween(-3, 3),
      y: originY + randomBetween(-3, 3),
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - randomBetween(40, 110),
      rotate: randomBetween(-420, 420),
      size: randomBetween(28, 52),
    };
  });
}

function burst() {
  clearCleanupTimer();
  clearBurstTimers();
  particles.value = [];

  for (let index = 0; index < BURST_COUNT; index += 1) {
    const timer = setTimeout(() => {
      particles.value = [
        ...particles.value,
        ...createBurstParticles(randomBetween(15, 85), randomBetween(18, 78), index),
      ];
    }, index * BURST_STAGGER_MS);

    burstTimers.push(timer);
  }

  cleanupTimer = setTimeout(() => {
    particles.value = [];
    burstTimers = [];
  }, (BURST_COUNT - 1) * BURST_STAGGER_MS + PARTICLE_ANIMATION_MS + 100);
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
  clearBurstTimers();
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
  animation: bird-burst 1050ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
