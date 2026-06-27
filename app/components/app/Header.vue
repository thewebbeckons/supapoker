<script lang="ts" setup>
const { loggedIn, signOut } = useCurrentUser()
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
            <div v-else class="flex items-center gap-2">
                <UButton icon="i-lucide-user" to="/account" color="neutral" variant="ghost" />
                <UButton label="Logout" color="neutral" variant="ghost" icon="i-lucide-log-out" @click="logout" />
            </div>
        </template>
    </UHeader>
</template>
