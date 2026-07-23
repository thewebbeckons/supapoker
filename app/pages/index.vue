<script setup lang="ts">
definePageMeta({
  middleware: ['redirect-authenticated']
})

const isGuestRoomModalOpen = ref(false)

useSeoMeta({
  title: 'SupaPoker — Planning poker without the ceremony',
  description: 'A fast, real-time planning poker room for focused agile teams.'
})

const heroCards = [
  { value: '3', className: 'deck-card-1' },
  { value: '5', className: 'deck-card-2' },
  { value: '8', className: 'deck-card-3' },
  { value: '13', className: 'deck-card-4' },
  { value: '?', className: 'deck-card-5' },
  { value: '2', className: 'deck-card-6' }
]

const features = [
  {
    index: '01',
    title: 'Live vote sync',
    description: 'Votes appear the moment your team submits them. No refreshes, no waiting, no drift.',
    icon: 'i-lucide-radio-tower'
  },
  {
    index: '02',
    title: 'Blind by default',
    description: 'Everyone thinks independently. Reveal together when the room is ready and keep estimates honest.',
    icon: 'i-lucide-eye-off'
  },
  {
    index: '03',
    title: 'Stories stay in flow',
    description: 'Move from backlog to vote to done without leaving the room or losing the conversation.',
    icon: 'i-lucide-list-checks'
  }
]
</script>

<template>
  <div class="landing-page">
    <section class="landing-hero" aria-labelledby="landing-title">
      <div class="hero-glow" aria-hidden="true" />
      <div class="hero-grid" aria-hidden="true" />
      <div class="floating-deck" aria-hidden="true">
        <div
          v-for="card in heroCards"
          :key="card.className"
          class="flip-card"
          :class="card.className"
        >
          <div class="flip-card-inner">
            <div class="card-face card-back"><span>SP</span></div>
            <div class="card-face card-front">
              <small>{{ card.value }}</small>
              <strong>{{ card.value }}</strong>
              <small>{{ card.value }}</small>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-copy">
        <h1 id="landing-title" class="reveal reveal-1">
          Estimates without<br>
          the <span>ceremony.</span>
        </h1>

        <p class="hero-description reveal reveal-2">
          Start right now. Vote in real time. Get back to literally anything else.
        </p>

        <div class="hero-actions reveal reveal-3">
          <UButton
            size="xl"
            color="primary"
            trailing-icon="i-lucide-arrow-right"
            class="landing-primary-button"
            @click="isGuestRoomModalOpen = true"
          >
            Start planning free
          </UButton>
          <UButton
            to="/login"
            size="xl"
            color="neutral"
            variant="ghost"
            icon="i-lucide-log-in"
            class="landing-secondary-button"
          >
            Log in
          </UButton>
        </div>

        <p class="hero-note reveal reveal-3">
          <UIcon name="i-lucide-circle-check" />
          Free to start · no credit card
        </p>
      </div>
    </section>

    <section class="preview-section" aria-label="SupaPoker room preview">
      <div class="preview-label">
        <span>THE ROOM</span>
        <span class="preview-status"><i /> LIVE PREVIEW</span>
      </div>
      <LandingRoomPreview />
    </section>

    <section class="features-section" aria-labelledby="features-title">
      <div class="section-heading">
        <p>BUILT FOR THE DECISION</p>
        <h2 id="features-title">Everything between “ready?” and “done.”</h2>
      </div>

      <div class="features-grid">
        <article v-for="feature in features" :key="feature.title" class="feature-card">
          <span class="feature-index">{{ feature.index }}</span>
          <UIcon :name="feature.icon" class="feature-icon" />
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section class="landing-cta" aria-labelledby="cta-title">
      <div class="cta-scanline" aria-hidden="true" />
      <p>YOUR NEXT ESTIMATION SESSION</p>
      <h2 id="cta-title">Less setup. Better signal.</h2>
      <UButton
        size="xl"
        color="primary"
        trailing-icon="i-lucide-arrow-right"
        class="landing-primary-button"
        @click="isGuestRoomModalOpen = true"
      >
        Create your first room
      </UButton>
    </section>

    <LandingGuestRoomModal v-model="isGuestRoomModalOpen" />
  </div>
</template>

<style scoped>
.landing-page {
  --landing-bg: #09090b;
  --landing-panel: #0d0d10;
  --landing-line: rgba(255, 255, 255, 0.11);
  --landing-muted: #8b8b95;
  position: relative;
  overflow: hidden;
  color: #f5f5f7;
  background: var(--landing-bg);
  border-inline: 1px solid var(--landing-line);
}

.landing-hero {
  position: relative;
  display: grid;
  min-height: 640px;
  place-items: center;
  padding: 7rem 1.5rem 5rem;
  text-align: center;
  border-bottom: 1px solid var(--landing-line);
  isolation: isolate;
}

.hero-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: 0.3;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: linear-gradient(to bottom, black, transparent 92%);
}

.hero-glow {
  position: absolute;
  z-index: -1;
  top: 6rem;
  left: 50%;
  width: min(760px, 90vw);
  height: 380px;
  transform: translateX(-50%);
  background: radial-gradient(ellipse, rgba(37, 99, 235, 0.15), transparent 67%);
  filter: blur(12px);
}

.hero-copy { max-width: 880px; }

.preview-label,
.section-heading > p,
.landing-cta > p,
.feature-index,
.hero-note {
  font-size: 0.7rem;
  letter-spacing: 0.16em;
}

.preview-status i {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #3b82f6;
  box-shadow: 0 0 12px #2563eb;
}

h1 {
  font-size: clamp(3.25rem, 8vw, 6.6rem);
  font-weight: 450;
  line-height: 0.98;
  letter-spacing: -0.07em;
  text-wrap: balance;
  text-shadow: 0 0 35px rgba(255, 255, 255, 0.08);
}

h1 span { color: #3b82f6; }

.hero-description {
  max-width: 620px;
  margin: 1.8rem auto 0;
  color: var(--landing-muted);
  font-size: clamp(0.95rem, 2vw, 1.1rem);
  line-height: 1.75;
}

.floating-deck {
  position: absolute;
  inset: 0;
  z-index: -1;
  perspective: 1000px;
  pointer-events: none;
}

.flip-card {
  position: absolute;
  width: clamp(54px, 6vw, 82px);
  aspect-ratio: .68;
  perspective: 800px;
  opacity: .44;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: hero-card-flip 8s cubic-bezier(.7,0,.3,1) infinite;
}

.card-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #303038;
  background: #101014;
  backface-visibility: hidden;
}

.card-back {
  color: #3b82f6;
  background:
    linear-gradient(135deg, transparent 48%, rgba(59,130,246,.22) 49% 51%, transparent 52%),
    #0d111b;
}

.card-back span { font-size: .7rem; letter-spacing: .12em; }
.card-front { color: #a9a9b2; transform: rotateY(180deg); }
.card-front strong { font-size: 1.35rem; font-weight: 450; }
.card-front small { position: absolute; font-size: .45rem; }
.card-front small:first-child { top: .4rem; left: .45rem; }
.card-front small:last-child { right: .45rem; bottom: .4rem; transform: rotate(180deg); }

.deck-card-1 { top: 18%; left: 9%; transform: rotate(-12deg); }
.deck-card-2 { top: 20%; right: 11%; transform: rotate(9deg); }
.deck-card-3 { bottom: 18%; left: 16%; transform: rotate(7deg); }
.deck-card-4 { right: 18%; bottom: 14%; transform: rotate(-8deg); }
.deck-card-5 { top: 9%; left: 35%; transform: rotate(5deg) scale(.78); opacity: .22; }
.deck-card-6 { right: 34%; bottom: 5%; transform: rotate(13deg) scale(.72); opacity: .18; }
.deck-card-2 .flip-card-inner { animation-delay: -1.4s; }
.deck-card-3 .flip-card-inner { animation-delay: -3.2s; }
.deck-card-4 .flip-card-inner { animation-delay: -5.1s; }
.deck-card-5 .flip-card-inner { animation-delay: -2.4s; }
.deck-card-6 .flip-card-inner { animation-delay: -6.4s; }

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

.landing-primary-button {
  border: 1px solid #60a5fa;
  border-radius: 0;
  box-shadow: 0 0 28px rgba(37, 99, 235, 0.18);
}

.landing-secondary-button {
  color: #a1a1aa;
  border-radius: 0;
}

.hero-note {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.45rem;
  margin-top: 1.25rem;
  color: #62626c;
  letter-spacing: 0.04em;
}

.preview-section { padding: 0 4.5rem 6rem; }

.preview-label {
  display: flex;
  justify-content: space-between;
  padding: 1rem 0;
  color: #676771;
}

.preview-status { display: inline-flex; align-items: center; gap: 0.5rem; }
.preview-status i { animation: live-pulse 2.2s ease-in-out infinite; }

.features-section {
  padding: 7rem 4.5rem;
  border-top: 1px solid var(--landing-line);
}

.section-heading { max-width: 670px; }
.section-heading > p,
.landing-cta > p { color: #3b82f6; }

.section-heading h2,
.landing-cta h2 {
  margin-top: 1rem;
  font-size: clamp(2.2rem, 5vw, 4rem);
  font-weight: 450;
  line-height: 1.08;
  letter-spacing: -0.05em;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 3.5rem;
  border-top: 1px solid var(--landing-line);
  border-left: 1px solid var(--landing-line);
}

.feature-card {
  position: relative;
  min-height: 285px;
  padding: 2rem;
  background: linear-gradient(145deg, rgba(255,255,255,0.018), transparent 55%);
  border-right: 1px solid var(--landing-line);
  border-bottom: 1px solid var(--landing-line);
  transition: background-color 240ms ease;
}

.feature-card:hover { background-color: rgba(37, 99, 235, 0.05); }
.feature-index { position: absolute; top: 1.15rem; right: 1.2rem; color: #44444c; }
.feature-icon { width: 1.6rem; height: 1.6rem; margin-top: 2.4rem; color: #3b82f6; }
.feature-card h3 { margin-top: 2rem; font-size: 1.1rem; font-weight: 600; }
.feature-card p { margin-top: 0.8rem; color: var(--landing-muted); font-size: 0.83rem; line-height: 1.7; }

.landing-cta {
  position: relative;
  display: grid;
  justify-items: center;
  padding: 7rem 1.5rem;
  text-align: center;
  border-top: 1px solid var(--landing-line);
  background: radial-gradient(circle at 50% 120%, rgba(37, 99, 235, 0.2), transparent 48%);
  overflow: hidden;
}

.landing-cta .landing-primary-button { margin-top: 2rem; }
.cta-scanline { position: absolute; inset: 0; opacity: 0.16; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.025) 3px 4px); pointer-events: none; }

.reveal { animation: reveal-up 700ms cubic-bezier(.22,.8,.28,1) both; }
.reveal-1 { animation-delay: 60ms; }
.reveal-2 { animation-delay: 130ms; }
.reveal-3 { animation-delay: 210ms; }
.reveal-4 { animation-delay: 290ms; }

@keyframes reveal-up {
  from { opacity: 0; transform: translateY(12px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes hero-card-flip {
  0%, 32% { transform: rotateY(0deg) translateY(0); }
  45%, 82% { transform: rotateY(180deg) translateY(-7px); }
  95%, 100% { transform: rotateY(360deg) translateY(0); }
}

@keyframes live-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

@media (max-width: 820px) {
  .landing-hero { min-height: 590px; padding-top: 5rem; }
  .flip-card { opacity: .26; }
  .deck-card-5, .deck-card-6 { display: none; }
  .preview-section { padding: 0 1rem 4rem; }
  .features-section { padding: 5rem 1.25rem; }
  .features-grid { grid-template-columns: 1fr; }
  .feature-card { min-height: 230px; }
}

@media (max-width: 520px) {
  h1 { font-size: 3.25rem; }
  .hero-actions { flex-direction: column; align-items: stretch; }
  .deck-card-1 { left: 1%; }
  .deck-card-2 { right: 2%; }
  .deck-card-3 { left: 5%; }
  .deck-card-4 { right: 7%; }
  .preview-label { font-size: 0.6rem; }
}

@media (prefers-reduced-motion: reduce) {
  .reveal, .preview-status i, .flip-card-inner { animation: none; }
}
</style>
