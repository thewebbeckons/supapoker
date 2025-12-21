<script lang="ts" setup>
import { useTimeAgo } from '@vueuse/core'

const props = defineProps<{
    time: string | Date | number
}>()

const timeAgo = useTimeAgo(props.time)
</script>

<template>
    <ClientOnly>
        <span>{{ timeAgo }}</span>
    </ClientOnly>
</template>
