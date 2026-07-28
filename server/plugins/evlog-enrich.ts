import {
  createGeoEnricher,
  createRequestSizeEnricher,
  createTraceContextEnricher,
  createUserAgentEnricher,
} from 'evlog/enrichers'

const enrichers = [
  createUserAgentEnricher(),
  createGeoEnricher(),
  createRequestSizeEnricher(),
  createTraceContextEnricher(),
]

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('evlog:enrich', async (ctx) => {
    for (const enrich of enrichers) await enrich(ctx)
  })
})
