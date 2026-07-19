<script setup lang="ts">
const concepts = [
  { id: 'floating-deck', short: '01', name: 'Floating deck' },
  { id: 'at-the-table', short: '02', name: 'At the table' },
  { id: 'card-rail', short: '03', name: 'Card rail' },
  { id: 'consensus', short: '04', name: 'Consensus' },
  { id: 'quiet-signal', short: '05', name: 'Quiet signal' }
]

const deckCards = [
  { value: '3', className: 'deck-card-1' },
  { value: '5', className: 'deck-card-2' },
  { value: '8', className: 'deck-card-3' },
  { value: '13', className: 'deck-card-4' },
  { value: '?', className: 'deck-card-5' },
  { value: '2', className: 'deck-card-6' }
]

const railCards = ['0', '1', '2', '3', '5', '8', '13', '?']
const activeIndex = ref(0)
let conceptObserver: IntersectionObserver | undefined

function goToConcept(index: number) {
  const targetIndex = (index + concepts.length) % concepts.length
  document.getElementById(concepts[targetIndex]!.id)?.scrollIntoView({ behavior: 'smooth' })
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    goToConcept(activeIndex.value + 1)
  }

  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    goToConcept(activeIndex.value - 1)
  }
}

onMounted(() => {
  conceptObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

      if (!visibleEntry) return
      const nextIndex = concepts.findIndex(concept => concept.id === visibleEntry.target.id)
      if (nextIndex >= 0) activeIndex.value = nextIndex
    },
    { threshold: [0.45, 0.7] }
  )

  document.querySelectorAll<HTMLElement>('[data-hero-concept]').forEach((section) => {
    conceptObserver?.observe(section)
  })

  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  conceptObserver?.disconnect()
  window.removeEventListener('keydown', handleKeydown)
})

definePageMeta({ layout: false })

useSeoMeta({
  title: 'Hero concepts — SupaPoker',
  description: 'SupaPoker landing hero design explorations.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="concept-lab">
    <header class="lab-header">
      <NuxtLink to="/" class="lab-brand" aria-label="Back to SupaPoker landing page">
        <img src="/logo-pixel-dark.svg" alt="">
        <span>SupaPoker</span>
      </NuxtLink>
      <span class="lab-title">Hero explorations</span>
    </header>

    <section
      id="floating-deck"
      data-hero-concept
      class="concept concept-one"
      :class="{ active: activeIndex === 0 }"
      aria-labelledby="concept-one-title"
    >
      <div class="technical-grid" aria-hidden="true" />
      <div class="soft-glow" aria-hidden="true" />
      <div class="floating-deck" aria-hidden="true">
        <div
          v-for="card in deckCards"
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

      <div class="concept-copy concept-copy-centered">
        <h1 id="concept-one-title">
          Estimates without<br>
          the <span>ceremony.</span>
        </h1>
        <LandingHeroConceptActions />
      </div>
    </section>

    <section
      id="at-the-table"
      data-hero-concept
      class="concept concept-two"
      :class="{ active: activeIndex === 1 }"
      aria-labelledby="concept-two-title"
    >
      <div class="table-grid" aria-hidden="true" />
      <div class="table-orbit" aria-hidden="true">
        <div class="orbit-line" />
        <div class="seat seat-a"><i /><span>VOTED</span></div>
        <div class="seat seat-b"><i /><span>VOTED</span></div>
        <div class="seat seat-c"><i /><span>THINKING</span></div>
        <div class="seat seat-d"><i /><span>VOTED</span></div>
        <div class="table-stack">
          <div class="stack-card stack-card-back" />
          <div class="stack-card stack-card-mid" />
          <div class="stack-card stack-card-top">
            <small>5</small><strong>5</strong><small>5</small>
          </div>
        </div>
      </div>

      <div class="concept-copy split-copy">
        <h1 id="concept-two-title">
          Estimates<br>
          without the<br>
          <span>ceremony.</span>
        </h1>
        <LandingHeroConceptActions />
      </div>
    </section>

    <section
      id="card-rail"
      data-hero-concept
      class="concept concept-three"
      :class="{ active: activeIndex === 2 }"
      aria-labelledby="concept-three-title"
    >
      <div class="rail-light" aria-hidden="true" />
      <div class="card-rail" aria-hidden="true">
        <div
          v-for="(card, index) in railCards"
          :key="card"
          class="rail-card"
          :class="{ selected: card === '5' }"
          :style="{ '--rail-delay': `${index * 85}ms` }"
        >
          <small>{{ card }}</small>
          <strong>{{ card }}</strong>
          <small>{{ card }}</small>
        </div>
      </div>

      <div class="concept-copy concept-copy-centered rail-copy">
        <h1 id="concept-three-title">
          Estimates without<br>
          the <span>ceremony.</span>
        </h1>
        <LandingHeroConceptActions />
      </div>
    </section>

    <section
      id="consensus"
      data-hero-concept
      class="concept concept-four"
      :class="{ active: activeIndex === 3 }"
      aria-labelledby="concept-four-title"
    >
      <div class="consensus-rings" aria-hidden="true">
        <div class="ring ring-outer" />
        <div class="ring ring-inner" />
        <div class="consensus-pip pip-one"><span>SM</span><i /></div>
        <div class="consensus-pip pip-two"><span>AK</span><i /></div>
        <div class="consensus-pip pip-three"><span>JP</span><i /></div>
        <div class="consensus-pip pip-four"><span>CT</span><i /></div>
      </div>
      <div class="result-stamp" aria-hidden="true">
        <span>CONSENSUS</span>
        <strong>5</strong>
      </div>

      <div class="concept-copy concept-copy-centered consensus-copy">
        <h1 id="concept-four-title">
          Estimates without<br>
          the <span>ceremony.</span>
        </h1>
        <LandingHeroConceptActions />
      </div>
    </section>

    <section
      id="quiet-signal"
      data-hero-concept
      class="concept concept-five"
      :class="{ active: activeIndex === 4 }"
      aria-labelledby="concept-five-title"
    >
      <div class="quiet-lines" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div class="corner-card corner-card-left" aria-hidden="true"><span>3</span></div>
      <div class="corner-card corner-card-right" aria-hidden="true"><span>8</span></div>

      <div class="concept-copy quiet-copy">
        <h1 id="concept-five-title">
          Estimates without<br>
          the <span class="inline-card-word">ceremony.<i>5</i></span>
        </h1>
        <LandingHeroConceptActions />
      </div>
    </section>

    <nav class="concept-nav" aria-label="Hero concept navigation">
      <button
        type="button"
        class="nav-arrow"
        aria-label="Previous concept"
        @click="goToConcept(activeIndex - 1)"
      >
        <UIcon name="i-lucide-arrow-left" />
      </button>

      <div class="nav-options">
        <button
          v-for="(concept, index) in concepts"
          :key="concept.id"
          type="button"
          class="nav-option"
          :class="{ active: activeIndex === index }"
          :aria-current="activeIndex === index ? 'true' : undefined"
          @click="goToConcept(index)"
        >
          <span>{{ concept.short }}</span>
          <b>{{ concept.name }}</b>
        </button>
      </div>

      <button
        type="button"
        class="nav-arrow"
        aria-label="Next concept"
        @click="goToConcept(activeIndex + 1)"
      >
        <UIcon name="i-lucide-arrow-right" />
      </button>
    </nav>
  </main>
</template>

<style scoped>
.concept-lab {
  --lab-bg: #09090b;
  --lab-panel: #0d0d10;
  --lab-line: rgba(255, 255, 255, 0.11);
  position: relative;
  height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  color: #f5f5f7;
  background: var(--lab-bg);
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
}

.lab-header {
  position: fixed;
  z-index: 50;
  top: 0;
  left: 0;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 1.15rem 1.4rem;
  pointer-events: none;
}

.lab-brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #f4f4f5;
  font-size: 0.86rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  pointer-events: auto;
}

.lab-brand img { width: 1.75rem; height: 1.75rem; }

.lab-title {
  color: #55555f;
  font-size: 0.61rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.concept {
  position: relative;
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 6rem 2rem 8rem;
  overflow: hidden;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  isolation: isolate;
}

.concept + .concept { border-top: 1px solid var(--lab-line); }

.concept-copy {
  position: relative;
  z-index: 5;
}

.concept.active .concept-copy { animation: copy-arrive 700ms cubic-bezier(.22,.8,.28,1) both; }

.concept-copy-centered {
  width: min(880px, 100%);
  text-align: center;
}

h1 {
  font-size: clamp(3.2rem, 8vw, 6.75rem);
  font-weight: 450;
  line-height: 0.98;
  letter-spacing: -0.075em;
  text-wrap: balance;
  text-shadow: 0 0 35px rgba(255, 255, 255, 0.08);
}

h1 > span { color: #3b82f6; }

.technical-grid,
.table-grid {
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

.floating-deck { position: absolute; inset: 0; z-index: -1; perspective: 1000px; }

.flip-card {
  position: absolute;
  width: clamp(54px, 6vw, 82px);
  aspect-ratio: .68;
  perspective: 800px;
  opacity: .48;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  animation: card-flip 8s cubic-bezier(.7,0,.3,1) infinite;
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

.deck-card-1 { top: 19%; left: 10%; transform: rotate(-12deg); }
.deck-card-2 { top: 23%; right: 12%; transform: rotate(9deg); }
.deck-card-3 { bottom: 20%; left: 17%; transform: rotate(7deg); }
.deck-card-4 { right: 19%; bottom: 16%; transform: rotate(-8deg); }
.deck-card-5 { top: 10%; left: 35%; transform: rotate(5deg) scale(.78); opacity: .24; }
.deck-card-6 { right: 34%; bottom: 8%; transform: rotate(13deg) scale(.72); opacity: .2; }
.deck-card-2 .flip-card-inner { animation-delay: -1.4s; }
.deck-card-3 .flip-card-inner { animation-delay: -3.2s; }
.deck-card-4 .flip-card-inner { animation-delay: -5.1s; }
.deck-card-5 .flip-card-inner { animation-delay: -2.4s; }
.deck-card-6 .flip-card-inner { animation-delay: -6.4s; }

.concept-two {
  justify-items: start;
  background: radial-gradient(circle at 76% 50%, rgba(37,99,235,.1), transparent 28%);
}

.table-grid {
  opacity: .55;
  background-size: 72px 72px;
  mask-image: linear-gradient(90deg, transparent, black 35%, black);
}

.split-copy {
  width: min(1280px, 100%);
  margin-inline: auto;
  padding-left: clamp(0rem, 5vw, 5rem);
}

.split-copy h1 { font-size: clamp(3.5rem, 7vw, 6.7rem); }
.split-copy :deep(.concept-actions) { justify-items: start; }
.split-copy :deep(.action-row) { justify-content: flex-start; }

.table-orbit {
  position: absolute;
  top: 50%;
  right: clamp(-10rem, 3vw, 3rem);
  width: min(48vw, 670px);
  aspect-ratio: 1;
  transform: translateY(-50%);
}

.orbit-line {
  position: absolute;
  inset: 12%;
  border: 1px solid rgba(255,255,255,.13);
  border-radius: 50%;
  box-shadow: inset 0 0 70px rgba(37,99,235,.025);
}

.orbit-line::after {
  position: absolute;
  inset: 13%;
  border: 1px dashed rgba(255,255,255,.06);
  border-radius: inherit;
  content: '';
}

.seat {
  position: absolute;
  display: flex;
  align-items: center;
  gap: .45rem;
  color: #55555f;
  font-size: .52rem;
  letter-spacing: .12em;
}

.seat i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 12px rgba(59,130,246,.8);
  animation: status-pulse 2.8s ease-in-out infinite;
}

.seat-c i { background: #34343b; box-shadow: none; animation: none; }
.seat-a { top: 8%; left: 45%; }
.seat-b { top: 48%; right: 2%; }
.seat-c { bottom: 7%; left: 45%; }
.seat-d { top: 48%; left: 1%; }

.table-stack {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(100px, 11vw, 145px);
  aspect-ratio: .68;
  transform: translate(-50%, -50%);
}

.stack-card {
  position: absolute;
  inset: 0;
  border: 1px solid #32323a;
  background: #101014;
}

.stack-card-back { transform: translate(-18px, 10px) rotate(-7deg); opacity: .42; }
.stack-card-mid { transform: translate(17px, 8px) rotate(6deg); opacity: .7; }
.stack-card-top {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #93c5fd;
  border-color: #3b82f6;
  background: #0d1930;
  box-shadow: 0 18px 55px rgba(0,0,0,.5), 0 0 35px rgba(37,99,235,.15);
  animation: selected-float 4s ease-in-out infinite;
}

.stack-card-top strong { font-size: clamp(2rem, 4vw, 3.4rem); font-weight: 450; }
.stack-card-top small { position: absolute; font-size: .62rem; }
.stack-card-top small:first-child { top: .7rem; left: .8rem; }
.stack-card-top small:last-child { right: .8rem; bottom: .7rem; transform: rotate(180deg); }

.concept-three {
  background:
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px) center / 104px 100%,
    #09090b;
}

.rail-light {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(59,130,246,.2), transparent);
  box-shadow: 0 0 80px 25px rgba(37,99,235,.05);
  transform: translate(-50%, 3.5rem);
}

.card-rail {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  display: flex;
  width: max-content;
  gap: clamp(.5rem, 1vw, 1rem);
  transform: translate(-50%, -50%);
}

.rail-card {
  position: relative;
  display: flex;
  width: clamp(54px, 6vw, 80px);
  aspect-ratio: .68;
  align-items: center;
  justify-content: center;
  color: #44444d;
  border: 1px solid #24242b;
  background: rgba(13,13,16,.9);
  animation: rail-breathe 5s ease-in-out infinite;
  animation-delay: var(--rail-delay);
}

.rail-card strong { font-size: clamp(1rem, 2vw, 1.5rem); font-weight: 450; }
.rail-card small { position: absolute; font-size: .42rem; }
.rail-card small:first-child { top: .4rem; left: .45rem; }
.rail-card small:last-child { right: .45rem; bottom: .4rem; transform: rotate(180deg); }
.rail-card.selected {
  color: #93c5fd;
  border-color: #3b82f6;
  background: #0d1930;
  box-shadow: 0 0 32px rgba(37,99,235,.16);
  transform: translateY(-9px);
}

.rail-copy {
  z-index: 3;
  padding: 1.2rem 0;
  background: radial-gradient(ellipse, #09090b 34%, rgba(9,9,11,.96) 54%, transparent 74%);
}

.concept-four {
  background: radial-gradient(circle at center, rgba(37,99,235,.08), transparent 38%);
}

.consensus-rings { position: absolute; inset: 0; }
.ring { position: absolute; top: 50%; left: 50%; border-radius: 50%; transform: translate(-50%, -50%); }
.ring-outer { width: min(82vw, 990px); aspect-ratio: 1.65; border: 1px solid rgba(255,255,255,.09); }
.ring-inner { width: min(62vw, 750px); aspect-ratio: 1.65; border: 1px dashed rgba(255,255,255,.06); }

.consensus-pip {
  position: absolute;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: #92929c;
  border: 1px solid #303037;
  background: #101014;
  font-size: .58rem;
}

.consensus-pip i {
  position: absolute;
  right: -3px;
  bottom: -3px;
  width: 7px;
  height: 7px;
  border: 1px solid #09090b;
  border-radius: 50%;
  background: #3b82f6;
  box-shadow: 0 0 10px rgba(59,130,246,.7);
}

.pip-one { top: calc(50% - min(24vw, 290px)); left: 50%; }
.pip-two { top: 50%; right: calc(50% - min(42vw, 510px)); }
.pip-three { bottom: calc(50% - min(24vw, 290px)); left: 50%; }
.pip-four { top: 50%; left: calc(50% - min(42vw, 510px)); }

.result-stamp {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: clamp(2rem, 8vw, 8rem);
  display: grid;
  width: 92px;
  aspect-ratio: .72;
  place-items: center;
  align-content: center;
  color: #60a5fa;
  border: 1px solid rgba(59,130,246,.35);
  background: rgba(13,25,48,.34);
  box-shadow: 0 0 35px rgba(37,99,235,.08);
  transform: translateY(-50%) rotate(7deg);
}

.result-stamp span { font-size: .46rem; letter-spacing: .12em; }
.result-stamp strong { margin-top: .4rem; font-size: 2rem; font-weight: 450; }
.consensus-copy { background: radial-gradient(ellipse, #09090b 25%, rgba(9,9,11,.94) 58%, transparent 74%); }

.concept-five {
  background:
    linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px) center / 100% 84px,
    #09090b;
}

.quiet-copy { width: min(1120px, 100%); text-align: left; }
.quiet-copy h1 { font-size: clamp(3.5rem, 9vw, 8.4rem); line-height: .95; }
.quiet-copy :deep(.concept-actions) { justify-items: start; }
.quiet-copy :deep(.action-row) { justify-content: flex-start; }

.inline-card-word {
  position: relative;
  display: inline-block;
  padding: .02em .13em .08em .05em;
  color: #3b82f6;
  border: 1px solid rgba(59,130,246,.35);
  background: rgba(13,25,48,.32);
  box-shadow: 0 0 50px rgba(37,99,235,.1);
}

.inline-card-word i {
  position: absolute;
  top: .5rem;
  right: .6rem;
  font-size: .07em;
  font-style: normal;
  letter-spacing: 0;
}

.quiet-lines { position: absolute; inset: 0; }
.quiet-lines i { position: absolute; top: 0; width: 1px; height: 100%; background: linear-gradient(transparent, rgba(255,255,255,.07), transparent); }
.quiet-lines i:nth-child(1) { left: 10%; }
.quiet-lines i:nth-child(2) { left: 30%; }
.quiet-lines i:nth-child(3) { left: 50%; }
.quiet-lines i:nth-child(4) { left: 70%; }
.quiet-lines i:nth-child(5) { left: 90%; }

.corner-card {
  position: absolute;
  width: 80px;
  aspect-ratio: .68;
  color: #44444d;
  border: 1px solid #25252c;
  background: #0d0d10;
  opacity: .48;
}

.corner-card span { position: absolute; top: .55rem; left: .6rem; font-size: .6rem; }
.corner-card-left { bottom: 8%; left: 5%; transform: rotate(12deg); }
.corner-card-right { top: 13%; right: 7%; transform: rotate(-9deg); animation: quiet-tilt 6s ease-in-out infinite; }

.concept-nav {
  position: fixed;
  z-index: 60;
  bottom: 1.25rem;
  left: 50%;
  display: flex;
  max-width: calc(100vw - 2rem);
  align-items: stretch;
  padding: .35rem;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(13,13,16,.86);
  box-shadow: 0 18px 70px rgba(0,0,0,.5);
  backdrop-filter: blur(18px);
  transform: translateX(-50%);
}

.nav-options { display: flex; min-width: 0; }
.nav-option,
.nav-arrow {
  color: #62626c;
  transition: color 180ms ease, background-color 180ms ease;
  cursor: pointer;
}

.nav-option {
  display: flex;
  min-width: 110px;
  flex-direction: column;
  align-items: flex-start;
  padding: .62rem .8rem;
  border-left: 1px solid rgba(255,255,255,.07);
}

.nav-option span { font-size: .5rem; letter-spacing: .12em; }
.nav-option b { margin-top: .16rem; font-size: .62rem; font-weight: 500; white-space: nowrap; }
.nav-option:hover { color: #b4b4bd; background: rgba(255,255,255,.035); }
.nav-option.active { color: #dbeafe; background: rgba(37,99,235,.13); box-shadow: inset 0 -1px #3b82f6; }

.nav-arrow {
  display: grid;
  width: 42px;
  flex: 0 0 42px;
  place-items: center;
}

.nav-arrow:hover { color: #f4f4f5; background: rgba(255,255,255,.04); }
.nav-arrow :deep(svg) { width: 14px; height: 14px; }
.nav-option:focus-visible,
.nav-arrow:focus-visible,
.lab-brand:focus-visible { outline: 1px solid #60a5fa; outline-offset: 2px; }

@keyframes copy-arrive {
  from { opacity: 0; transform: translateY(12px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}

@keyframes card-flip {
  0%, 32% { transform: rotateY(0deg) translateY(0); }
  45%, 82% { transform: rotateY(180deg) translateY(-7px); }
  95%, 100% { transform: rotateY(360deg) translateY(0); }
}

@keyframes status-pulse {
  0%, 100% { opacity: .45; transform: scale(.75); }
  50% { opacity: 1; transform: scale(1.15); }
}

@keyframes selected-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes rail-breathe {
  0%, 100% { border-color: #24242b; }
  50% { border-color: #34343c; }
}

@keyframes quiet-tilt {
  0%, 100% { transform: rotate(-9deg) translateY(0); }
  50% { transform: rotate(-5deg) translateY(8px); }
}

@media (max-width: 980px) {
  .nav-option { min-width: 72px; align-items: center; }
  .nav-option b { display: none; }
  .table-orbit { right: -18vw; width: 64vw; opacity: .55; }
  .split-copy { padding-left: 0; }
  .result-stamp { right: 2rem; opacity: .5; }
}

@media (max-width: 720px) {
  .concept { padding-inline: 1.25rem; }
  .lab-title { display: none; }
  h1 { font-size: clamp(3rem, 14vw, 5.2rem); }
  .flip-card { opacity: .28; }
  .deck-card-5, .deck-card-6 { display: none; }
  .table-orbit { top: 23%; right: -8rem; width: 26rem; transform: none; opacity: .35; }
  .split-copy { align-self: end; margin-bottom: 5vh; }
  .split-copy h1 { font-size: clamp(3.25rem, 14vw, 5.4rem); }
  .split-copy :deep(.concept-actions),
  .quiet-copy :deep(.concept-actions) { justify-items: center; }
  .split-copy :deep(.action-row),
  .quiet-copy :deep(.action-row) { justify-content: center; }
  .split-copy, .quiet-copy { text-align: center; }
  .card-rail { opacity: .35; }
  .rail-copy { background: radial-gradient(ellipse, #09090b 25%, rgba(9,9,11,.96) 52%, transparent 76%); }
  .ring-outer { width: 62rem; }
  .ring-inner { width: 44rem; }
  .ring { opacity: .35; }
  .consensus-pip { opacity: .5; }
  .result-stamp { display: none; }
  .corner-card { opacity: .2; }
  .concept-nav { bottom: .75rem; }
}

@media (max-width: 420px) {
  .nav-arrow { width: 36px; flex-basis: 36px; }
  .nav-option { min-width: 44px; padding-inline: .55rem; }
  .lab-header { padding: .9rem 1rem; }
  .lab-brand span { display: none; }
  .deck-card-1 { left: 1%; }
  .deck-card-2 { right: 2%; }
  .deck-card-3 { left: 5%; }
  .deck-card-4 { right: 7%; }
}

@media (prefers-reduced-motion: reduce) {
  .concept-lab { scroll-behavior: auto; }
  .concept.active .concept-copy,
  .flip-card-inner,
  .seat i,
  .stack-card-top,
  .rail-card,
  .corner-card-right { animation: none; }
}
</style>
