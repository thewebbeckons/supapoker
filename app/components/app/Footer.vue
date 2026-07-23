<script setup lang="ts">
	const { landing = false } = defineProps<{ landing?: boolean }>();
	const isFeedbackOpen = ref(false);
</script>

<template>
	<UFooter :class="{ 'landing-app-footer': landing }">
		<template #left> SupaPoker </template>
		<template #right>
			<div
				class="footer-actions"
				aria-label="SupaPoker links"
			>
				<UTooltip text="Buy me a coffee">
					<UButton
						to="https://buymeacoffee.com/667z7beckons"
						external
						target="_blank"
						rel="noopener noreferrer"
						icon="i-lucide-coffee"
						color="neutral"
						variant="ghost"
						aria-label="Buy me a coffee (opens in a new tab)"
						class="footer-action"
					/>
				</UTooltip>

				<UTooltip text="View on GitHub">
					<UButton
						to="https://github.com/thewebbeckons/supapoker"
						external
						target="_blank"
						rel="noopener noreferrer"
						icon="i-lucide-github"
						color="neutral"
						variant="ghost"
						aria-label="View SupaPoker on GitHub (opens in a new tab)"
						class="footer-action"
					/>
				</UTooltip>

				<UTooltip text="Send feedback">
					<UButton
						icon="i-lucide-bug"
						color="neutral"
						variant="ghost"
						aria-label="Send feedback"
						class="footer-action"
						@click="isFeedbackOpen = true"
					/>
				</UTooltip>
			</div>
		</template>
	</UFooter>

	<AppFeedbackModal v-model="isFeedbackOpen" />
</template>

<style scoped>
	.footer-actions {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.footer-action {
		border-radius: 0;
		color: var(--ui-text-muted);
	}

	.footer-action:hover {
		color: var(--ui-text-highlighted);
		background: var(--ui-bg-accented);
	}

	:global(.landing-app-footer) {
		color: #71717a !important;
		background: #09090b !important;
		border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
	}

	:global(.landing-app-footer .footer-action) {
		color: #71717a;
	}

	:global(.landing-app-footer .footer-action:hover) {
		color: #f4f4f5;
		background: rgba(255, 255, 255, 0.06);
	}
</style>
