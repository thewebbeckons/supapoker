<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()
const isMounted = ref(false)

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email(),
    avatar: z.any().optional() // File handling is manual usually, but kept for structure
})

type ProfileSchema = z.output<typeof profileSchema>

const profileState = reactive<ProfileSchema>({
    name: '',
    email: '',
})
const avatarUrl = ref<string | null>(null)

const profileAsyncDataKey = computed(() => {
    return user.value?.sub ? `profile:${user.value.sub}` : 'profile:anonymous'
})

const { data: profile } = useAsyncData(profileAsyncDataKey, async () => {
    if (!user.value) return null
    const { data } = await supabase
        .from('profile')
        .select('name, avatar')
        .eq('user_id', user.value.sub)
        .single()
    return data
}, {
    watch: [user],
    default: () => null,
})

watch(profile, (newProfile) => {
    if (newProfile) {
        if (newProfile.name) profileState.name = newProfile.name
        if (newProfile.avatar) avatarUrl.value = newProfile.avatar
    }
}, { immediate: true })

function syncEmailFromUser() {
    profileState.email = user.value?.email || ''
}

watch(user, () => {
    if (!isMounted.value) return
    syncEmailFromUser()
})

onMounted(() => {
    isMounted.value = true
    syncEmailFromUser()
})


async function onProfileSubmit(payload: FormSubmitEvent<ProfileSchema>) {
    try {
        if (!user.value) return

        const updates = {
            name: payload.data.name,
            avatar: avatarUrl.value,
            updated_at: new Date().toISOString(),
        }

        // Check if profile exists
        const { data: existingProfile } = await supabase
            .from('profile')
            .select('id')
            .eq('user_id', user.value.sub)
            .maybeSingle()

        if (existingProfile) {
            const { error } = await supabase
                .from('profile')
                .update(updates)
                .eq('user_id', user.value.sub)

            if (error) throw error
        } else {
            const { error } = await supabase
                .from('profile')
                .insert(updates)

            if (error) throw error
        }

        toast.add({ title: 'Success', description: 'Profile updated!', color: 'success' })

    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
    }
}


async function onAvatarUpdate(url: string | null) {
    avatarUrl.value = url

    if (!user.value || !url) return

    try {
        const { error } = await supabase
            .from('profile')
            .update({
                avatar: url,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.value.sub)

        if (error) throw error
    } catch (error: any) {
        toast.add({ title: 'Error saving avatar', description: error.message, color: 'error' })
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="text-xl font-semibold">Profile</h2>
            <p class="text-sm text-neutral-500">Update your personal information</p>
        </template>

        <UForm :schema="profileSchema" :state="profileState" @submit="onProfileSubmit" class="text-sm space-y-4">
            <!-- Name Row -->
            <UFormField name="name" label="Name" description="What you want others to call you." required
                class="flex max-sm:flex-col justify-between items-start gap-4">
                <UInput v-model="profileState.name" autocomplete="off" trailing-icon="i-lucide-user" />
            </UFormField>
            <USeparator />
            <UFormField name="email" label="Email" description="Your email address."
                class="flex max-sm:flex-col justify-between items-start gap-4">
                <UInput v-model="profileState.email" variant="subtle" autocomplete="off"
                    trailing-icon="i-lucide-at-sign" disabled />
            </UFormField>
            <USeparator />
            <!-- Avatar Row -->
            <UFormField name="avatar" label="Avatar" description="JPG, GIF or PNG. 1MB Max." required
                class="flex max-sm:flex-col justify-between sm:items-center gap-4">
                <AccountAvatarUpload :model-value="avatarUrl" @update:model-value="onAvatarUpdate"
                    :name="profileState.name" />
            </UFormField>
            <div class="flex justify-end pt-4">
                <UButton type="submit" label="Save changes" color="neutral" variant="solid" />
            </div>
        </UForm>
    </UCard>
</template>
