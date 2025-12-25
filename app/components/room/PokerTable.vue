<script lang="ts" setup>
const CARDS = [
    { label: '0', value: '0' },
    { label: '½', value: '0.5' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '5', value: '5' },
    { label: '8', value: '8' },
    { label: '13', value: '13' },
    { label: '20', value: '20' },
    { label: '40', value: '40' },
    { label: '100', value: '100' },
    { label: '?', value: '?' },
    { label: '☕', value: 'coffee', icon: 'i-lucide-coffee' }
]

defineProps<{
    modelValue: string | null
    isVoting: boolean
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

function selectCard(value: string) {
    emit('update:modelValue', value)
}
</script>

<template>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
        <button v-for="card in CARDS" :key="card.value" @click="selectCard(card.value)" :disabled="!isVoting"
            class="relative group flex flex-col items-center justify-center w-24 h-36 rounded-xl border-2 transition-all duration-200 bg-white dark:bg-neutral-800 shadow-sm"
            :class="[
                modelValue === card.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : 'border-neutral-200 dark:border-neutral-700',
                isVoting ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer hover:border-primary-200 dark:hover:border-primary-800' : 'opacity-50 cursor-not-allowed'
            ]">
            <!-- Card Content - Big Center -->
            <span class="text-4xl font-light"
                :class="modelValue === card.value ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-700 dark:text-neutral-200'">
                <UIcon v-if="card.icon" :name="card.icon" class="w-8 h-8" />
                <template v-else>{{ card.label }}</template>
            </span>

            <!-- Corner values -->
            <span class="absolute top-2 left-2 text-xs font-medium text-neutral-400">
                <template v-if="!card.icon">{{ card.label }}</template>
                <UIcon v-else :name="card.icon" class="w-3 h-3" />
            </span>
            <span class="absolute bottom-2 right-2 text-xs font-medium text-neutral-400 transform rotate-180">
                <template v-if="!card.icon">{{ card.label }}</template>
                <UIcon v-else :name="card.icon" class="w-3 h-3" />
            </span>

            <!-- Active Indicator overlay for selected card -->
            <div v-if="modelValue === card.value"
                class="absolute inset-0 rounded-xl bg-primary-500/10 dark:bg-primary-400/10 pointer-events-none">
            </div>
        </button>
    </div>
</template>
