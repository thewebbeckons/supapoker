<script setup lang="ts">
	const { landing = false } = defineProps<{ landing?: boolean }>();
	const year = new Date().getUTCFullYear();
</script>

<template>
	<UFooter :class="{ 'landing-app-footer': landing }">
		<template #left> SupaPoker </template>
		<template #right> Copyright © {{ year }} SupaPoker </template>
	</UFooter>
</template>

<style scoped>
	:global(.landing-app-footer) {
		color: #71717a !important;
		background: #09090b !important;
		border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
	}
</style>
