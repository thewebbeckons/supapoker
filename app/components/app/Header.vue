<script lang="ts" setup>
const { user, loggedIn, signOut } = useCurrentUser()
const isMounted = ref(false)

onMounted(() => {
    isMounted.value = true
})

async function logout() {
    await signOut()
    await navigateTo('/')
}

const items = [
    {
        label: 'Rooms',
        icon: 'i-lucide-home',
        to: '/rooms'
    },
]

const { data: profile } = useAsyncData(
    'header-profile',
    async () => {
        if (!user.value) return null

        return $fetch<{
            name: string
            email: string
            avatar: string | null
        }>('/api/profile')
    },
    {
        watch: [user],
        default: () => null,
    },
)

const userName = computed(() => profile.value?.name || user.value?.name || user.value?.email || 'Account')
const userEmail = computed(() => profile.value?.email || user.value?.email || '')
const userAvatar = computed(() => ({
    src: profile.value?.avatar || user.value?.image || undefined,
    alt: userName.value,
}))

const userMenuItems = computed(() => [
    [{
        label: 'Account settings',
        icon: 'i-lucide-settings',
        to: '/account',
    }],
    [{
        label: 'Log out',
        icon: 'i-lucide-log-out',
        color: 'error' as const,
        onSelect: logout,
    }],
])

</script>

<template>
    <UHeader>
        <template #title>
            <NuxtLink to="/" class="flex items-center gap-2 font-bold text-xl">
                <ClientOnly>
                    <UColorModeImage light="/logo-pixel-light.svg" dark="/logo-pixel-dark.svg" alt="SupaPoker Logo" class="h-8 w-8" />
                    <template #fallback>
                        <img src="/logo-pixel-light.svg" alt="SupaPoker Logo" class="h-8 w-8" />
                    </template>
                </ClientOnly>
                SupaPoker
            </NuxtLink>
            <UBadge color="info" variant="subtle">Beta</UBadge>
        </template>
        <UNavigationMenu v-if="isMounted && loggedIn" :items="items" />
        <template #right>
            <div v-if="!isMounted" class="flex items-center gap-2">
                <USkeleton class="h-9 w-24" />
                <USkeleton class="h-9 w-24" />
            </div>
            <div v-else-if="!loggedIn" class="flex items-center gap-2">
                <UButton label="Login" to="/login" variant="outline" color="neutral" />
                <UButton label="Sign up" to="/signup" color="primary" />
            </div>
            <UDropdownMenu
                v-else
                :items="userMenuItems"
                :content="{ align: 'end', side: 'bottom', sideOffset: 10 }"
                arrow
                :ui="{ content: 'w-72', item: 'h-9' }"
            >
                <UButton
                    color="neutral"
                    variant="ghost"
                    class="h-10 gap-2 px-2"
                    trailing-icon="i-lucide-chevrons-up-down"
                >
                    <UAvatar
                        :src="userAvatar.src"
                        :alt="userAvatar.alt"
                        size="sm"
                    />
                    <span class="hidden max-w-36 truncate text-sm font-medium sm:inline">
                        {{ userName }}
                    </span>
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
            <div class="flex flex-col gap-4">
                <UNavigationMenu
                    v-if="isMounted && loggedIn"
                    :items="items"
                    orientation="vertical"
                    class="w-full"
                />

                <div v-if="!isMounted" class="grid gap-2">
                    <USkeleton class="h-10 w-full" />
                    <USkeleton class="h-10 w-full" />
                </div>
                <div v-else-if="!loggedIn" class="grid gap-2">
                    <UButton label="Login" to="/login" variant="outline" color="neutral" block />
                    <UButton label="Sign up" to="/signup" color="primary" block />
                </div>
                <div v-else class="grid gap-2">
                    <UUser
                        :name="userName"
                        :description="userEmail"
                        :avatar="userAvatar"
                        size="md"
                        class="px-2 py-1"
                    />
                    <USeparator />
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
                        class="justify-start"
                        @click="logout"
                    />
                </div>
            </div>
        </template>
    </UHeader>
</template>
