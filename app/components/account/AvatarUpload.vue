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
const user = useSupabaseUser()
const isAnonymousUser = useIsAnonymousUser(user)
const toast = useToast()

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const MAX_AVATAR_BYTES = 1024 * 1024
const allowedMimeTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
])

function getAvatarPath(userId: string, mimeType: string) {
    const extensionByMimeType: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/gif': 'gif',
        'image/webp': 'webp',
    }

    return `${userId}/avatar.${extensionByMimeType[mimeType]}`
}

function getLegacyAvatarPaths(userId: string, currentPath: string) {
    return [
        `${userId}/avatar.png`,
        `${userId}/avatar.jpg`,
        `${userId}/avatar.gif`,
        `${userId}/avatar.webp`,
    ].filter(path => path !== currentPath)
}

function openFileInput() {
    fileInput.value?.click()
}

async function uploadAvatar(event: Event) {
    const input = event.target as HTMLInputElement
    if (!input.files || input.files.length === 0) return

    try {
        if (!user.value?.sub || isAnonymousUser.value) {
            toast.add({
                title: 'Sign up required',
                description: 'Guest accounts cannot upload avatars.',
                color: 'warning',
            })
            return
        }

        uploading.value = true
        const file = input.files[0]
        if (!file) return
        if (!allowedMimeTypes.has(file.type)) {
            toast.add({
                title: 'Unsupported image type',
                description: 'Please upload a PNG, JPEG, GIF, or WebP image.',
                color: 'error',
            })
            return
        }

        if (file.size > MAX_AVATAR_BYTES) {
            toast.add({
                title: 'Image too large',
                description: 'Avatar images must be 1MB or smaller.',
                color: 'error',
            })
            return
        }

        const filePath = getAvatarPath(user.value.sub, file.type)

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            })

        if (uploadError) throw uploadError

        const legacyPaths = getLegacyAvatarPaths(user.value.sub, filePath)
        if (legacyPaths.length > 0) {
            await supabase.storage.from('avatars').remove(legacyPaths)
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        emit('update:modelValue', `${publicUrl}?t=${Date.now()}`)
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
