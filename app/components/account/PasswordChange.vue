<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { passwordSchema } from '~/utils/schemas'

const supabase = useSupabaseClient()
const toast = useToast()

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: passwordSchema,
})

type PasswordSchema = z.output<typeof changePasswordSchema>

const passwordState = reactive<PasswordSchema>({
    currentPassword: '',
    password: '',
})

const { passwordStrength, strengthScore, strengthColor } = usePasswordStrength(toRef(passwordState, 'password'))

const user = useSupabaseUser()

async function onPasswordSubmit(payload: FormSubmitEvent<PasswordSchema>) {
    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.value!.email!,
            password: payload.data.currentPassword,
        })

        if (signInError) {
            toast.add({ title: 'Error', description: 'Current password is incorrect', color: 'error' })
            return
        }

        const { error } = await supabase.auth.updateUser({
            password: payload.data.password
        })

        if (error) throw error

        toast.add({ title: 'Success', description: 'Password updated!', color: 'success' })
        passwordState.currentPassword = ''
        passwordState.password = ''
    } catch (error: any) {
        toast.add({ title: 'Error', description: error.message, color: 'error' })
    }
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="text-xl font-semibold">Security</h2>
            <p class="text-sm text-neutral-500">Update your password</p>
        </template>

        <UForm :schema="changePasswordSchema" :state="passwordState" class="space-y-4" @submit="onPasswordSubmit">
            <UFormField label="Current Password" name="currentPassword">
                <UInput v-model="passwordState.currentPassword" type="password" icon="i-lucide-lock" />
            </UFormField>

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

            <div class="flex justify-end">
                <UButton type="submit" label="Update Password" color="neutral" variant="soft" />
            </div>
        </UForm>
    </UCard>
</template>
