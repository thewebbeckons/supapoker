<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
    layout: 'auth'
})

const supabase = useSupabaseClient()
const toast = useToast()

const schema = z.object({
    password: passwordSchema
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
    password: ''
})

const { passwordStrength, strengthScore, strengthColor } = usePasswordStrength(toRef(state, 'password'))

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    const { error } = await supabase.auth.updateUser({
        password: payload.data.password
    })

    if (error) {
        toast.add({
            title: 'Error',
            description: error.message,
            color: 'error'
        })
    } else {
        toast.add({
            title: 'Success',
            description: 'Your password has been updated.',
            color: 'success'
        })
        navigateTo('/rooms')
    }
}
</script>

<template>
    <div class="flex flex-col gap-4 w-full">
        <div class="flex flex-col gap-2 mb-4 text-center">
            <h1 class="text-2xl font-bold">Reset Password</h1>
            <p class="text-neutral-400">Enter your new password.</p>
        </div>

        <UForm :schema="schema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
            <UFormField label="New Password" name="password" required>
                <UInput v-model="state.password" size="lg" type="password" placeholder="Enter your new password"
                    icon="i-lucide-lock" class="w-full" />

                <div
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

            <UButton type="submit" block label="Update Password" color="primary" />
        </UForm>
    </div>
</template>
