<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
    layout: 'auth'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const toast = useToast()
const loading = ref(false)
const appOrigin = useRequestURL().origin
const authForm = useTemplateRef<{ state: { password?: string } }>('authForm')
const redirectInfo = useSupabaseCookieRedirect()
const hasRedirected = ref(false)

const fields: AuthFormField[] = [{
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true,
    size: 'lg'
}, {
    name: 'password',
    label: 'Password (optional)',
    type: 'password',
    placeholder: 'Enter your password',
    size: 'lg'
}]

const isPasswordSignIn = computed(() => Boolean(authForm.value?.state.password?.length))

const submit = computed(() => ({
    label: isPasswordSignIn.value ? 'Sign In' : 'Send Magic Link'
}))

const schema = z.object({
    email: z.string({ message: 'Please provide your email' }).email('Invalid email'),
    password: z.string().optional()
})

type Schema = z.output<typeof schema>

function getQueryRedirectPath(): string | null {
    const redirectTo = route.query.redirectTo
    if (typeof redirectTo !== 'string' || !redirectTo.startsWith('/')) {
        return null
    }

    if (redirectTo === '/login' || redirectTo === '/confirm') {
        return null
    }

    return redirectTo
}

function getPostAuthPath(): string {
    const queryPath = getQueryRedirectPath()
    if (queryPath) return queryPath

    const cookiePath = redirectInfo.pluck()
    if (
        typeof cookiePath === 'string' &&
        cookiePath.startsWith('/') &&
        cookiePath !== '/login' &&
        cookiePath !== '/confirm'
    ) {
        return cookiePath
    }

    return '/rooms'
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    loading.value = true
    const password = payload.data.password ?? ''
    const hasPassword = password.length > 0
    const queryRedirectPath = getQueryRedirectPath()

    try {
        const confirmUrl = new URL('/confirm', appOrigin)
        if (queryRedirectPath) {
            confirmUrl.searchParams.set('redirectTo', queryRedirectPath)
        }

        const { error } = hasPassword
            ? await supabase.auth.signInWithPassword({
                email: payload.data.email,
                password
            })
            : await supabase.auth.signInWithOtp({
                email: payload.data.email,
                options: {
                    emailRedirectTo: confirmUrl.toString(),
                    shouldCreateUser: false
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

        if (hasPassword) {
            return
        }

        toast.add({
            title: 'Magic link sent',
            description: 'Check your email for the sign-in link.',
            color: 'success'
        })
    } catch (error) {
        toast.add({
            title: 'Error',
            description: error instanceof Error ? error.message : 'Something went wrong',
            color: 'error'
        })
    } finally {
        loading.value = false
    }
}

watch(user, async () => {
    if (user.value && !hasRedirected.value) {
        hasRedirected.value = true
        await navigateTo(getPostAuthPath())
    }
}, { immediate: true })
</script>

<template>
    <div class="flex flex-col gap-4">
        <UAuthForm
            ref="authForm"
            title="Login"
            description="Enter your email for a magic link, or add your password to sign in directly."
            icon="i-lucide-user"
            :fields="fields"
            :schema="schema"
            :submit="submit"
            :loading="loading"
            @submit="onSubmit"
        >
            <template #password-hint>
                <ULink to="/forgot-password" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
            </template>
        </UAuthForm>
        <div class="text-center text-sm text-neutral-400">
            Don't have an account? <NuxtLink to="/signup" class="text-primary hover:underline">Sign up</NuxtLink>
        </div>
    </div>
</template>
