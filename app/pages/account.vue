<script setup lang="ts">
const user = useSupabaseUser()
const isAnonymousUser = useIsAnonymousUser(user)
</script>

<template>
    <div class="max-w-2xl mx-auto py-10 space-y-8">
        <div class="flex items-center gap-4">
            <h1 class="text-3xl font-bold">Account Settings</h1>
        </div>

        <div
            v-if="isAnonymousUser"
            class="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-900 dark:border-warning-900 dark:bg-warning-950/40 dark:text-warning-100"
        >
            Guest accounts can update their display name and local preferences here. Sign up to unlock avatar uploads and password management.
        </div>

        <!-- Profile Section -->
        <AccountProfile />

        <!-- Appearance Section -->
        <AccountAppearance />

        <!-- Poke Sound Section -->
        <AccountPokeSound />

        <!-- Password Section -->
        <AccountPasswordChange v-if="!isAnonymousUser" />
    </div>
</template>
