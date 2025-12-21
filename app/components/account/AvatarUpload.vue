<script setup lang="ts">
import type { Database } from '~/types/database.types'

const props = defineProps<{
    modelValue: string | null
    name: string
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string | null]
}>()

const supabase = useSupabaseClient<Database>()
const toast = useToast()

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function openFileInput() {
    fileInput.value?.click()
}

async function uploadAvatar(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return

    try {
        uploading.value = true
        const file = input.files[0]
        if (!file) return
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        emit('update:modelValue', publicUrl)
        toast.add({ title: 'Success', description: 'Avatar uploaded!', color: 'success' })

    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
    } finally {
        uploading.value = false
        if (fileInput.value) fileInput.value.value = ''
    }
}
</script>

<template>
    <div class="relative group cursor-pointer" @click="openFileInput">
        <UAvatar :src="modelValue || undefined" :alt="name" size="3xl"
            class="group-hover:opacity-75 transition-opacity" />

        <div
            class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <UIcon name="i-lucide-upload" class="w-6 h-6 text-white" />
        </div>

        <div v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 text-white animate-spin" />
        </div>

        <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="uploadAvatar" />
    </div>
</template>
