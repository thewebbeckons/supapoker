<script setup lang="ts">
	const { landing = false } = defineProps<{ landing?: boolean }>();
</script>

<template>
	<UFooter :class="{ 'landing-app-footer': landing }">
		<template #left> SupaPoker </template>
		<template #right>
			<NuxtLink
				to="/about"
				class="inline-flex items-center gap-1.5 text-muted hover:text-toned focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
			>
				<UIcon
					name="i-lucide-info"
					class="size-3.5"
					aria-hidden="true"
				/>
				<span>About</span>
			</NuxtLink>
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
