<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
    layout: 'auth'
})

const supabase = useSupabaseClient()
const toast = useToast()
const appOrigin = useRequestURL().origin
const authForm = useTemplateRef('authForm')

const fields: AuthFormField[] = [{
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
    size: 'lg'
}]

const schema = z.object({
    email: z.email('Invalid email')
})

type Schema = z.output<typeof schema>

const loading = ref(false)

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    loading.value = true
    const confirmUrl = new URL('/confirm', appOrigin)
    confirmUrl.searchParams.set('redirectTo', '/reset-password')
    const { error } = await supabase.auth.resetPasswordForEmail(payload.data.email, {
        redirectTo: confirmUrl.toString()
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
        // Reset the form
        if (authForm.value) {
            authForm.value.state.email = ''
        }
        setTimeout(() => {
            navigateTo('/login')
        }, 3000)
    }
}
</script>

<template>
    <div class="flex flex-col gap-4">
        <UAuthForm title="Forgot Password" description="Enter your email to receive password reset instructions."
            icon="i-lucide-lock" :fields="fields" :schema="schema" :loading="loading"
            @submit="onSubmit" ref="authForm" />
        <div class="text-center text-sm text-neutral-400">
            Remember your password? <NuxtLink to="/login" class="text-primary hover:underline">Log in</NuxtLink>
        </div>
    </div>
</template>
