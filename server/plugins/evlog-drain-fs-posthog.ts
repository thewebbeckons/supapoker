import type { DrainContext } from 'evlog'
import { createFsDrain } from 'evlog/fs'
import { createPostHogDrain } from 'evlog/posthog'
import { createDrainPipeline } from 'evlog/pipeline'

const pipeline = createDrainPipeline<DrainContext>({
  batch: { size: 50, intervalMs: 5000 },
  retry: { maxAttempts: 3 },
})

/**
 * Development writes to Local files; production sends to PostHog.
 * Reads POSTHOG_API_KEY, POSTHOG_HOST from the environment.
 */
const drains = import.meta.dev
  ? [createFsDrain()]
  : [pipeline(createPostHogDrain())]

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('evlog:drain', async (ctx) => {
    await Promise.all(drains.map(drain => drain(ctx)))
  })
})
