<script lang="ts" setup>
	const { landing = false } = defineProps<{ landing?: boolean }>();
	const { user, loggedIn, signOut } = useCurrentUser();
	const isMounted = ref(false);

	onMounted(() => {
		isMounted.value = true;
	});

	async function logout() {
		await signOut();
		await navigateTo("/");
	}

	const items = [
		{
			label: "Rooms",
			icon: "i-lucide-home",
			to: "/rooms",
		},
	];

	const { data: profile } = useProfile();

	const userName = computed(
		() =>
			profile.value?.name || user.value?.name || user.value?.email || "Account",
	);
	const userEmail = computed(
		() => profile.value?.email || user.value?.email || "",
	);
	const userAvatar = computed(() => ({
		src: profile.value?.avatar || user.value?.image || undefined,
		alt: userName.value,
	}));

	const userMenuItems = computed(() => [
		[
			{
				label: "Account settings",
				icon: "i-lucide-settings",
				to: "/account",
			},
		],
		[
			{
				label: "Log out",
				icon: "i-lucide-log-out",
				color: "error" as const,
				onSelect: logout,
			},
		],
	]);
</script>

<template>
	<UHeader :class="{ 'landing-app-header': landing }">
		<template #title>
			<NuxtLink
				to="/"
				class="flex items-center gap-2 font-bold text-xl"
				:style="landing ? { color: '#f4f4f5' } : undefined"
			>
				<img
					v-if="landing"
					src="/logo-pixel-dark.svg"
					alt="SupaPoker Logo"
					class="h-8 w-8"
				/>
				<ClientOnly v-else>
					<UColorModeImage
						light="/logo-pixel-light.svg"
						dark="/logo-pixel-dark.svg"
						alt="SupaPoker Logo"
						class="h-8 w-8"
					/>
					<template #fallback>
						<img
							src="/logo-pixel-light.svg"
							alt="SupaPoker Logo"
							class="h-8 w-8"
						/>
					</template>
				</ClientOnly>
				SupaPoker
			</NuxtLink>
			<UBadge
				color="info"
				variant="subtle"
				>Beta</UBadge
			>
		</template>
		<UNavigationMenu
			v-if="isMounted && loggedIn"
			:items="items"
			class="hidden sm:flex"
		/>
		<template #right>
			<div
				v-if="!isMounted"
				class="hidden items-center gap-2 sm:flex"
			>
				<USkeleton class="h-9 w-24" />
				<USkeleton class="h-9 w-24" />
			</div>
			<div
				v-else-if="!loggedIn"
				class="hidden items-center gap-2 sm:flex"
			>
				<UButton
					label="Login"
					to="/login"
					variant="outline"
					color="neutral"
					:class="{ 'landing-login-button': landing }"
				/>
				<UButton
					label="Sign up"
					to="/signup"
					color="primary"
					:class="{ 'landing-signup-button': landing }"
				/>
			</div>
			<UDropdownMenu
				v-else
				:items="userMenuItems"
				:content="{ align: 'end', side: 'bottom', sideOffset: 10 }"
				arrow
				class="hidden sm:block"
				:ui="{ content: 'w-72', item: 'h-9' }"
			>
				<UButton
					color="neutral"
					variant="ghost"
					class="h-10 gap-2 px-2"
				>
					<UAvatar
						:src="userAvatar.src"
						:alt="userAvatar.alt"
						size="sm"
					/>
				</UButton>

				<template #content-top>
					<div class="px-2 py-2">
						<UUser
							:name="userName"
							:description="userEmail"
							:avatar="userAvatar"
							size="md"
						/>
					</div>
					<USeparator />
				</template>
			</UDropdownMenu>
		</template>
		<template #body>
			<div class="flex min-h-[calc(100dvh-6rem)] flex-col gap-4">
				<div
					v-if="!isMounted"
					class="grid gap-2"
				>
					<USkeleton class="h-10 w-full" />
					<USkeleton class="h-10 w-full" />
				</div>
				<div
					v-else-if="!loggedIn"
					class="grid gap-2"
				>
					<UButton
						label="Login"
						to="/login"
						variant="outline"
						color="neutral"
						block
					/>
					<UButton
						label="Sign up"
						to="/signup"
						color="primary"
						block
					/>
				</div>
				<div
					v-else
					class="flex flex-1 flex-col gap-3"
				>
					<UUser
						:name="userName"
						:description="userEmail"
						:avatar="userAvatar"
						size="md"
						class="px-2 pb-2"
					/>
					<UNavigationMenu
						:items="items"
						orientation="vertical"
						class="w-full"
					/>
					<UButton
						label="Account settings"
						icon="i-lucide-settings"
						to="/account"
						color="neutral"
						variant="ghost"
						block
						class="justify-start"
					/>
					<UButton
						label="Log out"
						icon="i-lucide-log-out"
						color="error"
						variant="ghost"
						block
						class="mt-auto justify-start"
						@click="logout"
					/>
				</div>
			</div>
		</template>
	</UHeader>
</template>

<style scoped>
:global(.landing-app-header) {
	--ui-header-height: 4.5rem;
	color: #f4f4f5 !important;
	background: rgba(9, 9, 11, 0.92) !important;
	border-bottom-color: rgba(255, 255, 255, 0.1) !important;
	backdrop-filter: blur(18px);
}

:global(.landing-login-button) {
	color: #a1a1aa !important;
	background: transparent !important;
	box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16) !important;
}

:global(.landing-signup-button) { border-radius: 0; }

:global(.landing-app-header button) { color: #a1a1aa; }
</style>
