<script setup lang="ts">
import type { Database } from '~/types/database.types'

const props = defineProps<{
    modelValue: string | null | undefined
    name: string
}>()

const emit = defineEmits(['update:modelValue'])

const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()

const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const onFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return

    const file = input.files[0]
    if (!file) return
    uploadAvatar(file)
}

const uploadAvatar = async (file: File) => {
    try {
        uploading.value = true

        if (!user.value) throw new Error('User not found')

        const fileExt = file.name.split('.').pop()
        const fileName = `${user.value.sub}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        const newAvatarUrl = publicUrlData.publicUrl

        // Update profile with new avatar URL immediately
        // Check if profile exists
        const { data: existingProfile } = await supabase
            .from('profile')
            .select('id')
            .eq('user_id', user.value.sub)
            .maybeSingle()

        if (existingProfile) {
            const { error: updateError } = await supabase
                .from('profile')
                .update({
                    avatar: newAvatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.value.sub)

            if (updateError) throw updateError
        } else {
            const { error: insertError } = await supabase
                .from('profile')
                .insert({
                    user_id: user.value.sub,
                    avatar: newAvatarUrl,
                    updated_at: new Date().toISOString(),
                })

            if (insertError) throw insertError
        }

        emit('update:modelValue', newAvatarUrl)
        toast.add({ title: 'Success', description: 'Avatar updated!', color: 'success' })
    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
    } finally {
        uploading.value = false
    }
}
</script>

<template>
    <div class="flex flex-wrap items-center gap-3">
        <UAvatar :src="modelValue || undefined" :alt="name" size="lg" />
        <UButton label="Choose" color="neutral" variant="soft" :loading="uploading" @click="fileInput?.click()" />
        <input ref="fileInput" type="file" class="hidden" accept="image/*" @change="onFileChange" />
    </div>
</template>
