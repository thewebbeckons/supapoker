<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
    layout: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const fields: AuthFormField[] = [{
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
    size: 'lg'
}, {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
    size: 'lg'
}]

const schema = z.object({
    email: z.string({ message: 'Please provide your email' }).email('Invalid email'),
    password: passwordSchema
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    const { error } = await supabase.auth.signInWithPassword({
        email: payload.data.email,
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
            description: 'You have been logged in!',
            color: 'success'
        })
        await navigateTo('/')
    }
}

watchEffect(() => {
    if (user.value) {
        navigateTo('/')
    }
})
</script>

<template>
    <div class="flex flex-col gap-4">
        <UAuthForm title="Login" description="Enter your credentials to access your account." icon="i-lucide-user"
            :fields="fields" :schema="schema" @submit="onSubmit" />
        <div class="text-center text-sm text-neutral-400">
            Don't have an account? <NuxtLink to="/signup" class="text-white hover:underline">Sign up</NuxtLink>
        </div>
    </div>
</template>
