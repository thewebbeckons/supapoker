<template>
    <div class="flex min-h-screen items-center justify-center relative">
        <UButton icon="i-lucide-arrow-left" to="/" variant="ghost" color="neutral" class="absolute top-4 left-4"
            label="Back" />
        <div class="w-full max-w-sm px-4">
            <slot />
        </div>
    </div>
</template>
