<script setup lang="ts">
definePageMeta({
    middleware: ["auth"],
});

const { user } = useCurrentUser()
</script>

<template>
    <div class="max-w-2xl mx-auto py-10 space-y-8">
        <div class="flex items-center gap-4">
            <h1 class="text-3xl font-bold">Account Settings</h1>
        </div>

        <!-- Profile Section -->
        <AccountProfile />

        <!-- Appearance Section -->
        <AccountAppearance />

        <!-- Password Section -->
        <AccountPasswordChange v-if="user" />
    </div>
</template>
