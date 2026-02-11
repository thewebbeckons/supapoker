<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

definePageMeta({
    layout: 'auth'
})

const supabase = useSupabaseClient<Database>()
const toast = useToast()
const appOrigin = useRequestURL().origin

const schema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Invalid email'),
    password: passwordSchema
})

type Schema = z.output<typeof schema>

const state = reactive<Schema>({
    name: '',
    email: '',
    password: ''
})

const { passwordStrength, strengthScore, strengthColor } = usePasswordStrength(toRef(state, 'password'))

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    const { data, error } = await supabase.auth.signUp({
        email: payload.data.email,
        password: payload.data.password,
        options: {
            emailRedirectTo: `${appOrigin}/confirm`,
            data: {
                name: payload.data.name
            }
        }
    })

    if (error) {
        toast.add({
            title: 'Error',
            description: error.message,
            color: 'error'
        })
        return
    }

    if (data.user) {
        await supabase.from('profile').upsert({
            user_id: data.user.id,
            name: payload.data.name
        }, {
            onConflict: 'user_id'
        })
    }


    toast.add({
        title: 'Success',
        description: 'Account created! Please check your email to confirm your account.',
        color: 'success',
        duration: 2000
    })

    setTimeout(() => {
        navigateTo('/login')
    }, 2000)
}

onUnmounted(() => {
    state.name = ''
    state.email = ''
    state.password = ''
})
</script>

<template>
    <div class="flex flex-col gap-4 w-full">
        <div class="flex flex-col gap-2 mb-4 text-center">
            <h1 class="text-2xl font-bold">Sign Up</h1>
            <p class="text-neutral-400">Create a new account to get started.</p>
        </div>

        <UForm :schema="schema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
            <UFormField label="Name" name="name" required>
                <UInput v-model="state.name" size="lg" placeholder="Enter your name" icon="i-lucide-user"
                    class="w-full" />
            </UFormField>

            <UFormField label="Email" name="email" required>
                <UInput v-model="state.email" size="lg" type="email" placeholder="Enter your email" icon="i-lucide-mail"
                    class="w-full" />
            </UFormField>

            <UFormField label="Password" name="password" required>
                <UInput v-model="state.password" size="lg" type="password" placeholder="Enter your password"
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

            <UButton type="submit" block label="Sign Up" color="primary" />
        </UForm>

        <div class="text-center text-sm text-neutral-400">
            Already have an account? <NuxtLink to="/login" class="text-primary hover:underline">Login</NuxtLink>
        </div>
    </div>
</template>
