<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'

const open = defineModel<boolean>({ required: true })

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
  kind: 'bug',
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
  <UModal
    v-model:open="open"
    title="Found a rough edge?"
    description="Send it over. This makes a tidy GitHub issue draft for you to review."
    :ui="{
      content: 'sm:max-w-xl',
      header: 'border-b border-default',
      body: 'p-0'
    }"
  >
    <template #body>
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
            :rows="5"
            autoresize
            :maxrows="9"
            maxlength="4000"
            class="w-full"
          />
        </UFormField>

        <div class="form-footer">
          <p>
            <UIcon name="i-lucide-github" aria-hidden="true" />
            You’ll review it on GitHub before posting.
          </p>
          <UButton
            type="submit"
            color="primary"
            trailing-icon="i-lucide-arrow-up-right"
            class="submit-button"
          >
            Draft the issue
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<style scoped>
.feedback-form {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 2.5%), transparent 45%),
    var(--ui-bg);
}

.feedback-form :deep(input),
.feedback-form :deep(textarea),
.feedback-form :deep(button[role='combobox']) {
  background: #09090b;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: .25rem;
}

.form-footer p {
  display: flex;
  align-items: center;
  gap: .45rem;
  color: var(--ui-text-dimmed);
  font-size: .68rem;
  line-height: 1.5;
}

.submit-button {
  flex: none;
  border-radius: 0;
}

@media (max-width: 520px) {
  .feedback-form {
    padding: 1.25rem;
  }

  .form-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .submit-button {
    justify-content: center;
  }
}
</style>
