<script setup lang="ts">
	const { landing = false } = defineProps<{ landing?: boolean }>();
	const year = new Date().getUTCFullYear();
</script>

<template>
	<UFooter :class="{ 'landing-app-footer': landing }">
		<template #left> SupaPoker </template>
		<template #right>
			<div
				class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-end"
			>
				<NuxtLink
					to="https://buymeacoffee.com/667z7beckons"
					external
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Buy me a coffee (opens in a new tab)"
					class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-toned focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
				>
					<UIcon
						name="i-lucide-coffee"
						class="size-3.5"
						aria-hidden="true"
					/>
					<span>Buy me a coffee</span>
				</NuxtLink>
				<span>Copyright © {{ year }} SupaPoker</span>
			</div>
		</template>
	</UFooter>
</template>

<style scoped>
	:global(.landing-app-footer) {
		color: #71717a !important;
		background: #09090b !important;
		border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
	}
</style>
