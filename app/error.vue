<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{ error: NuxtError }>()

const statusCode = computed(() => error?.statusCode || 500)

const copy = computed(() => {
  if (statusCode.value === 404) {
    return {
      label: 'PAGE NOT FOUND',
      titleTop: 'This page',
      titleBottom: 'folded.',
      body: 'It was bluffing about existing the whole time. Check the URL, or deal yourself a fresh room.'
    }
  }

  if (statusCode.value >= 500) {
    return {
      label: 'SERVER ERROR',
      titleTop: 'The server',
      titleBottom: 'folded.',
      body: 'Something on our end went all in and lost. We are already reshuffling — give it a moment.'
    }
  }

  return {
    label: 'SOMETHING WENT WRONG',
    titleTop: 'That did not',
    titleBottom: 'go to plan.',
    body: 'The request came back wrong and we are not going to pretend otherwise. Try again, or head back to the table.'
  }
})

const canRetry = computed(() => statusCode.value !== 404)

const foldedCards = [
  { value: '3', className: 'fold-card-1' },
  { value: '8', className: 'fold-card-2' },
  { value: '?', className: 'fold-card-3' },
  { value: '2', className: 'fold-card-4' }
]

function goHome() {
  clearError({ redirect: '/' })
}

function goToRooms() {
  clearError({ redirect: '/rooms' })
}

function retry() {
  window.location.reload()
}

useSeoMeta({
  title: () => `${statusCode.value} — SupaPoker`,
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="error-page">
    <a href="/" class="error-brand" aria-label="Back to SupaPoker home" @click.prevent="goHome">
      <img src="/logo.svg" alt="">
      <span>SupaPoker</span>
    </a>

    <div class="technical-grid" aria-hidden="true" />
    <div class="soft-glow" aria-hidden="true" />

    <div class="muck-pile" aria-hidden="true">
      <div
        v-for="card in foldedCards"
        :key="card.className"
        class="muck-card"
        :class="card.className"
      >
        <span>{{ card.value }}</span>
      </div>

      <div class="folded-card">
        <small>{{ statusCode }}</small>
        <strong>{{ statusCode }}</strong>
        <small>{{ statusCode }}</small>
        <em>FOLDED</em>
      </div>
    </div>

    <div class="error-copy">
      <p class="eyebrow">ERROR {{ statusCode }} · {{ copy.label }}</p>

      <h1>{{ copy.titleTop }}<br>{{ copy.titleBottom }}</h1>

      <p class="error-body">{{ copy.body }}</p>

      <div class="error-actions">
        <div class="action-row">
          <UButton
            size="xl"
            color="primary"
            icon="i-lucide-arrow-left"
            class="error-primary-button"
            @click="goHome"
          >
            Back to the table
          </UButton>

          <UButton
            v-if="canRetry"
            size="xl"
            color="neutral"
            variant="ghost"
            icon="i-lucide-rotate-cw"
            class="error-secondary-button"
            @click="retry"
          >
            Try again
          </UButton>
          <UButton
            v-else
            size="xl"
            color="neutral"
            variant="ghost"
            icon="i-lucide-layout-grid"
            class="error-secondary-button"
            @click="goToRooms"
          >
            My rooms
          </UButton>
        </div>

        <p class="error-note">
          <UIcon :name="canRetry ? 'i-lucide-life-buoy' : 'i-lucide-corner-down-left'" />
          {{ canRetry
            ? 'If it keeps happening, poke us with the bug button'
            : 'Nothing here was worth pointing anyway' }}
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.error-page {
  position: relative;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 6rem 2rem;
  overflow: hidden;
  color: #f5f5f7;
  background: #09090b;
  isolation: isolate;
}

.error-brand {
  position: absolute;
  z-index: 10;
  top: 1.15rem;
  left: 1.4rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #f4f4f5;
  font-size: 0.86rem;
  font-weight: 650;
  letter-spacing: -0.03em;
}

.error-brand img { width: 1.75rem; height: 1.75rem; }
.error-brand:focus-visible { outline: 1px solid #60a5fa; outline-offset: 2px; }

.error-copy {
  position: relative;
  z-index: 5;
  width: min(880px, 100%);
  text-align: center;
  animation: copy-arrive 700ms cubic-bezier(.22,.8,.28,1) both;
}

.eyebrow {
  margin-bottom: 1.1rem;
  color: #3b82f6;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
}

h1 {
  font-size: clamp(2.9rem, 6.6vw, 5.6rem);
  font-weight: 450;
  line-height: 0.99;
  letter-spacing: -0.07em;
  text-wrap: balance;
  text-shadow: 0 0 35px rgba(255, 255, 255, 0.08);
}

.error-body {
  max-width: 46ch;
  margin: 1.6rem auto 0;
  color: #8b8b95;
  font-size: clamp(0.86rem, 1.6vw, 1rem);
  line-height: 1.75;
}

.technical-grid {
  position: absolute;
  inset: 0;
  z-index: -3;
  background-image:
    linear-gradient(rgba(255,255,255,.034) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.034) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: radial-gradient(ellipse at center, black 15%, transparent 78%);
}

.soft-glow {
  position: absolute;
  z-index: -2;
  width: min(850px, 80vw);
  height: 470px;
  background: radial-gradient(ellipse, rgba(37,99,235,.17), transparent 68%);
  filter: blur(14px);
}

.muck-pile { position: absolute; inset: 0; z-index: -1; }

.muck-card,
.folded-card {
  position: absolute;
  aspect-ratio: .68;
  border: 1px solid #303038;
  background: #101014;
}

.muck-card {
  width: clamp(54px, 6vw, 82px);
  opacity: .34;
  background:
    linear-gradient(135deg, transparent 48%, rgba(59,130,246,.18) 49% 51%, transparent 52%),
    #0d111b;
}

.muck-card span {
  position: absolute;
  top: .45rem;
  left: .5rem;
  color: #3f3f48;
  font-size: .55rem;
}

.fold-card-1 { top: 21%; left: 11%; transform: rotate(-15deg); }
.fold-card-2 { top: 26%; right: 13%; transform: rotate(11deg); }
.fold-card-3 { bottom: 19%; left: 18%; transform: rotate(6deg); opacity: .22; }
.fold-card-4 { right: 20%; bottom: 15%; transform: rotate(-9deg); opacity: .2; }

.folded-card {
  top: 58%;
  left: 85%;
  display: grid;
  width: clamp(108px, 12vw, 158px);
  place-items: center;
  color: #93c5fd;
  border-color: rgba(59,130,246,.45);
  background: #0d1930;
  box-shadow: 0 22px 60px rgba(0,0,0,.55), 0 0 45px rgba(37,99,235,.16);
  transform: translate(-50%, -50%) rotate(-8deg);
  animation: fold-drop 5s ease-in-out infinite;
}

.folded-card strong { font-size: clamp(1.7rem, 3vw, 2.5rem); font-weight: 450; letter-spacing: -.05em; }
.folded-card small { position: absolute; font-size: .5rem; }
.folded-card small:first-of-type { top: .6rem; left: .65rem; }
.folded-card small:last-of-type { right: .65rem; bottom: .6rem; transform: rotate(180deg); }

.folded-card em {
  position: absolute;
  bottom: -.75rem;
  padding: .18rem .5rem;
  color: #60a5fa;
  border: 1px solid rgba(59,130,246,.4);
  background: #09090b;
  font-size: .48rem;
  font-style: normal;
  letter-spacing: .16em;
}

.error-actions {
  display: grid;
  justify-items: center;
  margin-top: clamp(1.75rem, 4vh, 2.5rem);
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.error-primary-button {
  border: 1px solid #60a5fa;
  border-radius: 0;
  box-shadow: 0 0 28px rgba(37, 99, 235, 0.18);
}

.error-secondary-button {
  color: #a1a1aa;
  border-radius: 0;
}

.error-note {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 1.15rem;
  color: #62626c;
  font-size: 0.67rem;
  letter-spacing: 0.04em;
  text-align: left;
}

@keyframes copy-arrive {
  from { opacity: 0; transform: translateY(12px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes fold-drop {
  0%, 100% { transform: translate(-50%, -50%) rotate(-8deg); }
  50% { transform: translate(-50%, calc(-50% + 10px)) rotate(-5deg); }
}

@media (max-width: 820px) {
  .error-page { padding: 5rem 1.25rem; }
  .muck-card { opacity: .18; }
  .fold-card-3, .fold-card-4 { display: none; }
  .folded-card { top: 76%; left: 72%; opacity: .55; }
}

@media (max-width: 540px) {
  .error-brand { top: .9rem; left: 1rem; }
  .error-brand span { display: none; }
  .fold-card-1 { left: 0; }
  .fold-card-2 { right: 1%; }
  .action-row {
    width: min(100%, 20rem);
    flex-direction: column;
  }
  .action-row :deep(button) { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .error-copy,
  .folded-card { animation: none; }
}
</style>
