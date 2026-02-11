<script setup lang="ts">
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="text-xl font-semibold">Appearance</h2>
            <p class="text-sm text-neutral-500">Customize the look and feel</p>
        </template>

        <div class="flex items-center justify-between">
            <div>
                <p class="font-medium text-neutral-900 dark:text-white">Color Theme</p>
                <p class="text-sm text-neutral-500">Choose your preferred theme</p>
            </div>
            <ClientOnly>
                <!-- Using UColorModeSelect as requested -->
                <UColorModeSelect class="w-48" />
                <template #fallback>
                    <USkeleton class="h-10 w-48" />
                </template>
            </ClientOnly>
        </div>
    </UCard>
</template>
