<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'

useSeoMeta({
  title: 'About — SupaPoker',
  description: 'Why SupaPoker exists, plus a suspiciously direct route to sending feedback.'
})

const feedbackKinds = [
  { label: 'An idea', value: 'idea' },
  { label: 'A bug', value: 'bug' },
  { label: 'Something else', value: 'other' }
]

const feedbackKindLabels = {
  idea: 'Idea',
  bug: 'Bug',
  other: 'Feedback'
} as const

const feedbackSchema = z.object({
  kind: z.enum(['idea', 'bug', 'other']),
  title: z.string().trim().min(4, 'Give me at least four characters to work with.').max(120, 'Keep the headline under 120 characters.'),
  details: z.string().trim().min(10, 'A tiny bit more detail would help.').max(4000, 'That is a magnificent amount of feedback. Please keep it under 4,000 characters.')
})

type FeedbackSchema = z.output<typeof feedbackSchema>

const feedback = reactive<FeedbackSchema>({
  kind: 'idea',
  title: '',
  details: ''
})

async function openFeedbackIssue(event: FormSubmitEvent<FeedbackSchema>) {
  const kind = feedbackKindLabels[event.data.kind]
  const params = new URLSearchParams({
    title: `[${kind}] ${event.data.title.trim()}`,
    body: [
      `## ${kind}`,
      '',
      event.data.details.trim(),
      '',
      '---',
      '_Drafted from the SupaPoker feedback form._'
    ].join('\n')
  })

  await navigateTo(
    `https://github.com/thewebbeckons/supapoker/issues/new?${params.toString()}`,
    { external: true }
  )
}
</script>

<template>
  <main class="about-page">
    <section class="about-hero" aria-labelledby="about-title">
      <div class="hero-grid" aria-hidden="true" />
      <p class="eyebrow"><span /> ABOUT / SUPAPOKER</p>
      <h1 id="about-title">
        Planning poker,<br>
        <span>minus the performance art.</span>
      </h1>
      <div class="about-copy">
        <p>
          SupaPoker is a quick, real-time room for teams that need a number and would quite like to get on with their day.
        </p>
        <p>
          I built it because estimation already has enough suspense. It didn’t also need spreadsheets, setup theatre, or a meeting before the meeting.
        </p>
      </div>
      <div class="tiny-manifesto" aria-label="The SupaPoker philosophy">
        <span>Start fast</span>
        <span>Vote honestly</span>
        <span>Move along</span>
      </div>
    </section>

    <section class="feedback-section" aria-labelledby="feedback-title">
      <div class="feedback-intro">
        <p class="eyebrow"><span /> FEEDBACK</p>
        <h2 id="feedback-title">Found a rough edge?</h2>
        <p>
          Or have an oddly specific idea? Send it over. This makes a tidy GitHub issue draft; you get the final say before it’s posted.
        </p>
        <div class="issue-note">
          <UIcon name="i-lucide-github" aria-hidden="true" />
          <span>You’ll review the draft on GitHub before posting</span>
        </div>
      </div>

      <UForm
        :schema="feedbackSchema"
        :state="feedback"
        class="feedback-form"
        @submit="openFeedbackIssue"
      >
        <UFormField name="kind" label="What are we working with?" required>
          <USelect
            v-model="feedback.kind"
            :items="feedbackKinds"
            icon="i-lucide-message-square-dashed"
            class="w-full"
          />
        </UFormField>

        <UFormField name="title" label="The short version" required>
          <UInput
            v-model="feedback.title"
            placeholder="The cards are plotting against me"
            maxlength="120"
            class="w-full"
          />
        </UFormField>

        <UFormField name="details" label="The useful details" required>
          <UTextarea
            v-model="feedback.details"
            placeholder="What happened, what should have happened, and any clues you found along the way…"
            :rows="6"
            autoresize
            :maxrows="10"
            maxlength="4000"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          trailing-icon="i-lucide-arrow-up-right"
          class="issue-button"
        >
          Draft the issue
        </UButton>
      </UForm>
    </section>

    <section class="coffee-section" aria-labelledby="coffee-title">
      <div class="coffee-icon" aria-hidden="true">
        <UIcon name="i-lucide-coffee" />
      </div>
      <div>
        <p class="eyebrow">OPTIONAL FUEL</p>
        <h2 id="coffee-title">Still feeling generous?</h2>
        <p>Keep the servers humming and the developer questionably caffeinated.</p>
      </div>
      <UButton
        to="https://buymeacoffee.com/667z7beckons"
        external
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="outline"
        size="lg"
        icon="i-lucide-coffee"
        class="coffee-button"
      >
        Buy me a coffee
      </UButton>
    </section>
  </main>
</template>

<style scoped>
.about-page {
  --about-line: rgb(255 255 255 / 11%);
  --about-muted: #8b8b95;
  max-width: 72rem;
  margin-inline: auto;
  border-inline: 1px solid var(--about-line);
  background: #09090b;
}

.about-hero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  min-height: 35rem;
  padding: clamp(4.5rem, 10vw, 8rem) clamp(1.5rem, 7vw, 6rem) 4rem;
  border-bottom: 1px solid var(--about-line);
}

.hero-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .42;
  background-image:
    linear-gradient(rgb(255 255 255 / 3.5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 3.5%) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: linear-gradient(to bottom right, black, transparent 78%);
}

.about-hero::after {
  position: absolute;
  z-index: -1;
  top: 3rem;
  left: 14%;
  width: min(44rem, 80vw);
  height: 24rem;
  content: '';
  background: radial-gradient(ellipse, rgb(37 99 235 / 14%), transparent 67%);
  filter: blur(14px);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: .65rem;
  color: #71717a;
  font-size: .68rem;
  letter-spacing: .18em;
}

.eyebrow span {
  width: 1.5rem;
  height: 1px;
  background: #2563eb;
  box-shadow: 0 0 10px #2563eb;
}

h1 {
  max-width: 60rem;
  margin-top: 1.5rem;
  color: #f5f5f7;
  font-size: clamp(3rem, 7vw, 6.25rem);
  font-weight: 450;
  line-height: .98;
  letter-spacing: -.065em;
  text-wrap: balance;
}

h1 span { color: #3b82f6; }

.about-copy {
  display: grid;
  max-width: 57rem;
  margin-top: clamp(2.5rem, 5vw, 4rem);
  gap: 1.5rem 3rem;
  color: #a1a1aa;
  font-size: clamp(.9rem, 1.5vw, 1.04rem);
  line-height: 1.8;
}

.tiny-manifesto {
  display: flex;
  flex-wrap: wrap;
  margin-top: 3rem;
  color: #71717a;
  font-size: .68rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tiny-manifesto span {
  padding: .7rem 1rem;
  border: 1px solid var(--about-line);
}

.tiny-manifesto span + span { border-left: 0; }

.feedback-section {
  display: grid;
  grid-template-columns: minmax(0, .8fr) minmax(22rem, 1.2fr);
  gap: clamp(3rem, 8vw, 7rem);
  padding: clamp(4rem, 8vw, 7rem) clamp(1.5rem, 7vw, 6rem);
  border-bottom: 1px solid var(--about-line);
}

.feedback-intro h2,
.coffee-section h2 {
  margin-top: 1rem;
  color: #f4f4f5;
  font-size: clamp(1.7rem, 3vw, 2.5rem);
  font-weight: 500;
  letter-spacing: -.04em;
}

.feedback-intro > p:not(.eyebrow),
.coffee-section > div > p:last-child {
  margin-top: 1.2rem;
  color: var(--about-muted);
  font-size: .88rem;
  line-height: 1.75;
}

.issue-note {
  display: flex;
  align-items: center;
  gap: .55rem;
  margin-top: 2rem;
  color: #62626c;
  font-size: .7rem;
}

.feedback-form {
  display: grid;
  gap: 1.4rem;
  padding: clamp(1.25rem, 4vw, 2.5rem);
  border: 1px solid var(--about-line);
  background:
    linear-gradient(135deg, rgb(255 255 255 / 2.5%), transparent 45%),
    #0d0d10;
  box-shadow: 12px 12px 0 rgb(0 0 0 / 18%);
}

.feedback-form :deep(input),
.feedback-form :deep(textarea),
.feedback-form :deep(button[role='combobox']) {
  background: #09090b;
}

.issue-button {
  justify-self: start;
  border-radius: 0;
}

.coffee-section {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1.5rem;
  padding: clamp(2.5rem, 6vw, 4rem) clamp(1.5rem, 7vw, 6rem);
  background: #0d0d10;
}

.coffee-icon {
  display: grid;
  width: 4rem;
  aspect-ratio: 1;
  place-items: center;
  color: #60a5fa;
  font-size: 1.35rem;
  border: 1px solid rgb(59 130 246 / 35%);
  background: rgb(37 99 235 / 8%);
}

.coffee-section h2 { margin-top: .45rem; }
.coffee-section > div > p:last-child { margin-top: .5rem; }
.coffee-button { border-radius: 0; }

@media (min-width: 700px) {
  .about-copy { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 800px) {
  .feedback-section { grid-template-columns: 1fr; }
  .coffee-section { grid-template-columns: auto 1fr; }
  .coffee-button { grid-column: 1 / -1; justify-content: center; }
}

@media (max-width: 520px) {
  .about-hero { min-height: auto; }
  .tiny-manifesto { display: grid; }
  .tiny-manifesto span + span { border-top: 0; border-left: 1px solid var(--about-line); }
  .feedback-section { gap: 2.5rem; }
  .feedback-form { box-shadow: 7px 7px 0 rgb(0 0 0 / 18%); }
}

@media (prefers-reduced-motion: no-preference) {
  .about-hero > :not(.hero-grid) {
    animation: about-reveal .65s both;
  }

  .about-hero > :nth-child(3) { animation-delay: .08s; }
  .about-hero > :nth-child(4) { animation-delay: .16s; }
  .about-hero > :nth-child(5) { animation-delay: .24s; }
}

@keyframes about-reveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
