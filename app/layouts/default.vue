<script setup lang="ts">
const route = useRoute()
const isLandingPage = computed(() => route.path === '/')
const isRoomPage = computed(() => /^\/rooms\/[^/]+$/.test(route.path))
</script>

<template>
    <div :class="isLandingPage ? 'landing-layout' : isRoomPage ? 'room-layout' : 'space-y-8'">
        <AppHeader :landing="isLandingPage" />
        <UContainer :class="isLandingPage ? 'landing-container' : 'xl:px-0'">
            <slot />
        </UContainer>
        <AppFooter :landing="isLandingPage" />
    </div>
</template>

<style scoped>
.landing-layout { background: #09090b; }
.landing-container { max-width: 90rem; padding-inline: 0; }
.room-layout { min-height: 100dvh; background: #09090b; }
</style>
