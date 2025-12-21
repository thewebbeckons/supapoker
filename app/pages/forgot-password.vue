<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
    layout: 'auth'
})

const supabase = useSupabaseClient()
const toast = useToast()

const fields: AuthFormField[] = [{
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
    size: 'lg'
}]

const schema = z.object({
    email: z.string({ message: 'Please provide your email' }).email('Invalid email')
})

type Schema = z.output<typeof schema>

const state = reactive<{ email: string | undefined }>({
    email: undefined
})


const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    loading.value = true
    const { error } = await supabase.auth.resetPasswordForEmail(payload.data.email, {
        redirectTo: window.location.origin + '/reset-password'
    })
    loading.value = false

    if (error) {
        toast.add({
            title: 'Error',
            description: error.message,
            color: 'error'
        })
    } else {
        toast.add({
            title: 'Success',
            description: 'Password reset instructions have been sent to your email.',
            color: 'success',
            duration: 3000
        })
        state.email = undefined
        setTimeout(() => {
            navigateTo('/login')
        }, 3000)
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <UAuthForm title="Forgot Password" description="Enter your email to receive password reset instructions."
            icon="i-lucide-lock" :fields="fields" :schema="schema" :state="state" :loading="loading"
            @submit="onSubmit" />
        <div class="text-center text-sm text-neutral-400">
            Remember your password? <NuxtLink to="/login" class="text-primary hover:underline">Log in</NuxtLink>
        </div>
    </div>
</template>
