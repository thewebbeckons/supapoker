<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'



const supabase = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()

// --- Profile Section ---
const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email(),
    avatar: z.any().optional() // File handling is manual usually, but kept for structure
})

type ProfileSchema = z.output<typeof profileSchema>

const profileState = reactive<ProfileSchema>({
    name: '',
    email: user.value?.email || '',
})
const avatarUrl = ref<string | null>(null)

const { data: profile } = useAsyncData('profile', async () => {
    if (!user.value) return
    const { data } = await supabase
        .from('profile')
        .select('name, avatar')
        .eq('user_id', user.value.sub)
        .single()
    return data
})

watch(profile, (newProfile) => {
    if (newProfile) {
        if (newProfile.name) profileState.name = newProfile.name
        if (newProfile.avatar) avatarUrl.value = newProfile.avatar
    }
}, { immediate: true })


async function onProfileSubmit(payload: FormSubmitEvent<ProfileSchema>) {
    try {
        if (!user.value) return

        const updates = {
            name: payload.data.name,
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

// --- Password Section ---
import { passwordSchema } from '~/utils/schemas'

const changePasswordSchema = z.object({
    password: passwordSchema,
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

type PasswordSchema = z.output<typeof changePasswordSchema>

const passwordState = reactive<PasswordSchema>({
    password: '',
    confirmPassword: ''
})

const { passwordStrength, strengthScore, strengthColor } = usePasswordStrength(toRef(passwordState, 'password'))

async function onPasswordSubmit(payload: FormSubmitEvent<PasswordSchema>) {
    try {
        const { error } = await supabase.auth.updateUser({
            password: payload.data.password
        })

        if (error) throw error

        toast.add({ title: 'Success', description: 'Password updated!', color: 'success' })
        passwordState.password = ''
        passwordState.confirmPassword = ''
    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
    }
}
</script>

<template>
    <div class="max-w-2xl mx-auto py-10 space-y-8">
        <div class="flex items-center gap-4">
            <h1 class="text-3xl font-bold">Account Settings</h1>
        </div>

        <!-- Profile Section -->
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
                    <AccountAvatarUpload v-model="avatarUrl" :name="profileState.name" />
                </UFormField>
                <div class="flex justify-end pt-4">
                    <UButton type="submit" label="Save changes" color="neutral" variant="solid" />
                </div>
            </UForm>
        </UCard>



        <!-- Appearance Section -->
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
                <!-- Using UColorModeSelect as requested -->
                <UColorModeSelect class="w-48" />
            </div>
        </UCard>

        <!-- Password Section -->
        <UCard>
            <template #header>
                <h2 class="text-xl font-semibold">Security</h2>
                <p class="text-sm text-neutral-500">Update your password</p>
            </template>

            <UForm :schema="changePasswordSchema" :state="passwordState" class="space-y-4" @submit="onPasswordSubmit">
                <UFormField label="New Password" name="password">
                    <UInput v-model="passwordState.password" type="password" icon="i-lucide-lock" />

                    <div v-if="passwordState.password"
                        class="mt-4 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 space-y-3">
                        <p class="text-sm font-medium text-neutral-900 dark:text-white">Password Strength</p>
                        <UProgress :model-value="strengthScore" :max="5" :color="strengthColor" size="xs" />
                        <div class="grid grid-cols-2 gap-1 text-xs">
                            <div v-for="(req, index) in passwordStrength" :key="index" class="flex items-center gap-1"
                                :class="req.met ? 'text-green-500' : 'text-neutral-500'">
                                <UIcon :name="req.met ? 'i-lucide-check' : 'i-lucide-circle'" class="w-3 h-3" />
                                <span>{{ req.label }}</span>
                            </div>
                        </div>
                    </div>
                </UFormField>

                <UFormField label="Confirm Password" name="confirmPassword">
                    <UInput v-model="passwordState.confirmPassword" type="password" icon="i-lucide-lock" />
                </UFormField>

                <div class="flex justify-end">
                    <UButton type="submit" label="Update Password" color="neutral" variant="soft" />
                </div>
            </UForm>
        </UCard>
    </div>
</template>
