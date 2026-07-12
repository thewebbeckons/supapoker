<script setup lang="ts">
const cards = ['0', '1', '2', '3', '5', '8', '13', '?']

const players = [
  { name: 'Sarah', initials: 'SM', color: '#2563eb', voted: true },
  { name: 'Alex', initials: 'AK', color: '#0d9488', voted: true },
  { name: 'Jordan', initials: 'JP', color: '#7c3aed', voted: false },
  { name: 'Casey', initials: 'CT', color: '#ea580c', voted: true }
]

const stories = [
  { title: 'Checkout performance', status: 'active' },
  { title: 'Team invitations', status: 'pending' },
  { title: 'Billing webhooks', status: 'done' }
]

const pokeBurstKey = ref(0)

function pokeTeam() {
  pokeBurstKey.value += 1
}
</script>

<template>
  <div class="preview-window">
    <RoomBirdBurst :burst-key="pokeBurstKey" />

    <div class="window-bar">
      <div class="window-dots" aria-hidden="true"><i /><i /><i /></div>
      <div class="window-address">
        <UIcon name="i-lucide-lock-keyhole" />
        supapoker.com/rooms/sprint-24
      </div>
      <div class="window-live"><i /> CONNECTED</div>
    </div>

    <div class="room-shell">
      <main class="room-main">
        <header class="room-header">
          <div>
            <div class="room-kicker">SPRINT 24</div>
            <h3>Platform planning</h3>
            <p>Estimating the next release</p>
          </div>
          <button type="button" tabindex="-1"><UIcon name="i-lucide-square" /> Stop vote</button>
        </header>

        <div class="vote-stage">
          <div class="current-story">
            <span>CURRENT STORY</span>
            <h4>Checkout performance improvements</h4>
            <div><i /> VOTING OPEN</div>
          </div>

          <div class="card-row" aria-label="Planning poker cards">
            <div
              v-for="card in cards"
              :key="card"
              class="poker-card"
              :class="{ selected: card === '5' }"
            >
              <small>{{ card }}</small>
              <strong>{{ card }}</strong>
              <small>{{ card }}</small>
            </div>
          </div>

          <div class="selection-note">
            <UIcon name="i-lucide-mouse-pointer-2" /> You voted <b>5</b>
          </div>
        </div>

        <div class="stories-panel">
          <div class="stories-tabs"><b>ACTIVE STORIES</b><span>COMPLETED</span><span>ALL</span></div>
          <div class="story-list">
            <div v-for="story in stories" :key="story.title" :class="`story-${story.status}`">
              <UIcon :name="story.status === 'done' ? 'i-lucide-circle-check' : story.status === 'active' ? 'i-lucide-play' : 'i-lucide-circle'" />
              <span>{{ story.title }}</span>
              <small>{{ story.status }}</small>
            </div>
          </div>
        </div>
      </main>

      <aside class="room-sidebar">
        <div class="sidebar-heading"><span>PLAYERS</span><b>4</b></div>
        <div class="player-list">
          <div v-for="(player, index) in players" :key="player.name" class="player">
            <span class="avatar" :style="{ background: player.color }">{{ player.initials }}</span>
            <div><b>{{ player.name }}</b><small>{{ index === 0 ? 'Facilitator' : 'Online' }}</small></div>
            <i :class="{ voted: player.voted }" />
          </div>
        </div>
        <div class="vote-progress">
          <div><span>VOTE PROGRESS</span><b>3/4</b></div>
          <div class="progress-track"><i /></div>
        </div>
        <button
          type="button"
          class="poke-button"
          aria-label="Poke the team with a bird emoji burst"
          @click="pokeTeam"
        >
          🐦 POKE TEAM
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.preview-window {
  width: 100%;
  color: #d4d4d8;
  background: #0a0a0c;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 36px 100px rgba(0, 0, 0, 0.55), 0 0 60px rgba(37, 99, 235, 0.06);
}

.window-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 48px;
  padding: 0 1rem;
  color: #5c5c65;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: #0c0c0f;
}

.window-dots { display: flex; gap: 7px; }
.window-dots i { width: 7px; height: 7px; background: #303037; border-radius: 999px; }
.window-address { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 3rem; border: 1px solid #24242a; }
.window-live { display: flex; justify-content: flex-end; align-items: center; gap: .5rem; color: #71717a; }
.window-live i { width: 5px; height: 5px; border-radius: 99px; background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: connection-pulse 2s ease-in-out infinite; }

.room-shell { display: grid; grid-template-columns: minmax(0, 1fr) 230px; min-height: 650px; }
.room-main { display: flex; min-width: 0; flex-direction: column; }

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 98px;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.room-kicker,
.current-story span,
.current-story div,
.sidebar-heading,
.vote-progress span,
.stories-tabs,
.story-list small {
  font-size: .58rem;
  letter-spacing: .14em;
}

.room-kicker { color: #3b82f6; }
.room-header h3 { margin-top: .25rem; color: #f4f4f5; font-size: 1rem; font-weight: 600; }
.room-header p { margin-top: .18rem; color: #686871; font-size: .68rem; }
.room-header button { display: flex; align-items: center; gap: .45rem; padding: .55rem .75rem; color: #fca5a5; font-size: .62rem; border: 1px solid rgba(239, 68, 68, .32); background: rgba(239, 68, 68, .07); }

.vote-stage { display: grid; flex: 1; align-content: center; justify-items: center; min-height: 390px; padding: 2.5rem 1rem; background: radial-gradient(circle at center, rgba(37, 99, 235, .06), transparent 45%); }
.current-story { text-align: center; }
.current-story span { color: #60606a; }
.current-story h4 { margin-top: .55rem; color: #f4f4f5; font-size: 1rem; font-weight: 500; }
.current-story div { display: inline-flex; align-items: center; gap: .45rem; margin-top: .65rem; color: #60a5fa; letter-spacing: .08em; }
.current-story div i { width: 5px; height: 5px; border-radius: 99px; background: #3b82f6; }

.card-row { display: grid; grid-template-columns: repeat(8, minmax(44px, 64px)); gap: clamp(.35rem, 1vw, .75rem); margin-top: 2.2rem; }
.poker-card { position: relative; display: flex; height: 88px; align-items: center; justify-content: center; color: #7a7a84; border: 1px solid #29292f; background: #101014; transition: border-color 180ms ease, transform 180ms ease; }
.poker-card small { position: absolute; font-size: .5rem; }
.poker-card small:first-child { top: 6px; left: 7px; }
.poker-card small:last-child { right: 7px; bottom: 6px; transform: rotate(180deg); }
.poker-card strong { font-size: 1.45rem; font-weight: 450; }
.poker-card.selected { z-index: 1; color: #93c5fd; border-color: #3b82f6; background: #0d1930; box-shadow: 0 0 0 1px rgba(59,130,246,.16), 0 12px 28px rgba(0,0,0,.42); animation: selected-card 4s ease-in-out infinite; }
.selection-note { display: flex; align-items: center; gap: .45rem; margin-top: 1.6rem; color: #5f5f69; font-size: .62rem; }
.selection-note b { color: #93c5fd; }

.stories-panel { border-top: 1px solid rgba(255,255,255,.08); }
.stories-tabs { display: flex; gap: 1.5rem; min-height: 37px; align-items: center; padding: 0 1.25rem; color: #4e4e57; border-bottom: 1px solid rgba(255,255,255,.07); }
.stories-tabs b { align-self: stretch; display: flex; align-items: center; color: #a1a1aa; border-bottom: 1px solid #3b82f6; }
.story-list > div { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; min-height: 38px; padding: 0 1.25rem; color: #797983; font-size: .66rem; border-bottom: 1px solid rgba(255,255,255,.045); }
.story-list > div:last-child { border-bottom: 0; }
.story-list svg { width: 12px; color: #4b4b55; }
.story-list small { color: #45454d; }
.story-list .story-active { color: #d4d4d8; background: rgba(37,99,235,.05); box-shadow: inset 2px 0 #2563eb; }
.story-list .story-active svg, .story-list .story-active small { color: #3b82f6; }

.room-sidebar { display: flex; flex-direction: column; padding: 1.35rem 1rem; border-left: 1px solid rgba(255,255,255,.09); background: #0c0c0f; }
.sidebar-heading { display: flex; align-items: center; justify-content: space-between; color: #666670; }
.sidebar-heading b { display: grid; width: 20px; height: 20px; place-items: center; color: #a1a1aa; border: 1px solid #29292f; font-weight: 500; }
.player-list { display: grid; gap: .45rem; margin-top: 1.25rem; }
.player { display: grid; grid-template-columns: 32px 1fr 8px; gap: .65rem; align-items: center; padding: .6rem; border: 1px solid transparent; }
.player:hover { border-color: #25252b; background: #101014; }
.avatar { display: grid; width: 30px; height: 30px; place-items: center; color: white; font-size: .55rem; }
.player b, .player small { display: block; }
.player b { color: #c7c7ce; font-size: .65rem; font-weight: 500; }
.player small { margin-top: .15rem; color: #4d4d56; font-size: .52rem; }
.player > i { width: 6px; height: 6px; border-radius: 99px; background: #303038; }
.player > i.voted { background: #2563eb; box-shadow: 0 0 9px rgba(37,99,235,.8); animation: vote-pulse 3.4s ease-in-out infinite; }
.player:nth-child(2) > i { animation-delay: .7s; }
.player:nth-child(4) > i { animation-delay: 1.35s; }
.vote-progress { margin-top: auto; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,.07); }
.vote-progress > div:first-child { display: flex; justify-content: space-between; color: #5c5c65; }
.vote-progress b { color: #a1a1aa; font-size: .62rem; font-weight: 500; }
.progress-track { height: 2px; margin-top: .7rem; background: #202026; overflow: hidden; }
.progress-track i { display: block; width: 75%; height: 100%; background: #2563eb; box-shadow: 0 0 10px #2563eb; animation: progress-glow 3s ease-in-out infinite; }
.poke-button { margin-top: 1rem; padding: .65rem; color: #8b8b95; font-size: .56rem; letter-spacing: .1em; border: 1px solid #28282e; transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease, transform 120ms ease; cursor: pointer; }
.poke-button:hover { color: #d4d4d8; border-color: #3b82f6; background: rgba(37, 99, 235, .08); }
.poke-button:focus-visible { outline: 1px solid #60a5fa; outline-offset: 3px; }
.poke-button:active { transform: translateY(1px); }

@keyframes selected-card { 0%, 100% { transform: translateY(-5px); } 50% { transform: translateY(-9px); } }
@keyframes vote-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
@keyframes connection-pulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
@keyframes progress-glow { 0%, 100% { filter: brightness(.8); } 50% { filter: brightness(1.5); } }

@media (max-width: 900px) {
  .room-shell { grid-template-columns: minmax(0, 1fr) 180px; min-height: 570px; }
  .card-row { grid-template-columns: repeat(4, 50px); }
  .poker-card { height: 68px; }
  .vote-stage { min-height: 345px; }
}

@media (max-width: 640px) {
  .window-bar { grid-template-columns: 1fr auto; }
  .window-address { display: none; }
  .room-shell { display: block; min-height: auto; }
  .room-sidebar { display: none; }
  .room-header { min-height: 82px; padding: 1rem; }
  .room-header button { display: none; }
  .vote-stage { min-height: 355px; padding-inline: .5rem; }
  .card-row { gap: .4rem; }
  .poker-card { width: 48px; }
  .stories-tabs { gap: .8rem; padding-inline: 1rem; font-size: .48rem; }
}

@media (max-width: 430px) {
  .card-row { grid-template-columns: repeat(4, 42px); }
  .poker-card { width: 42px; height: 62px; }
  .current-story h4 { max-width: 260px; font-size: .85rem; }
}

@media (prefers-reduced-motion: reduce) {
  .window-live i, .poker-card.selected, .player > i.voted, .progress-track i { animation: none; }
}
</style>
