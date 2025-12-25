<script setup lang="ts">
const props = defineProps<{
    story: any
}>()

const timer = ref('00:00')
const timerInterval = ref<any>(null)

function startTimer(startTime: string) {
    stopTimer()
    // Only run on client side
    if (import.meta.client) {
        timerInterval.value = setInterval(() => {
            const start = new Date(startTime).getTime()
            const now = new Date().getTime()
            const diff = Math.floor((now - start) / 1000)

            const minutes = Math.floor(diff / 60).toString().padStart(2, '0')
            const seconds = (diff % 60).toString().padStart(2, '0')
            timer.value = `${minutes}:${seconds}`
        }, 1000)
    }
}

function stopTimer() {
    if (timerInterval.value) {
        clearInterval(timerInterval.value)
        timerInterval.value = null
    }
}

// Watch active story status to control timer
watch(() => props.story, (newStory) => {
    if (newStory?.status === 'voting') {
        startTimer(newStory.updated_at)
    } else {
        stopTimer()
        if (newStory?.status === 'active') timer.value = '00:00'
    }
}, { immediate: true, deep: true })

onUnmounted(() => {
    stopTimer()
})
</script>

<template>
    <div class="flex items-center gap-1.5 text-primary-500 font-mono text-sm">
        <UIcon name="i-lucide-clock" class="w-4 h-4" />
        <span>{{ timer }}</span>
    </div>
</template>
