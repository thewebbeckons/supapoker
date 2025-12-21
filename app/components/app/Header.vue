<script lang="ts" setup>
const user = useSupabaseUser()
const supabase = useSupabaseClient()

async function logout() {
    await supabase.auth.signOut()
    navigateTo('/')
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
            <NuxtLink to="/">SupaPoker</NuxtLink>
            <UBadge color="info" variant="subtle">Beta</UBadge>
        </template>
        <UNavigationMenu v-if="user" :items="items" />
        <template #right>
            <div v-if="!user" class="flex items-center gap-2">
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