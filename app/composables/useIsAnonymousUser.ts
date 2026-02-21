import type { Ref } from 'vue'

interface AnonymousAwareUser {
    is_anonymous?: boolean | null
    app_metadata?: {
        provider?: string | null
    } | null
}

export function useIsAnonymousUser(user: Ref<AnonymousAwareUser | null | undefined>) {
    return computed(() => {
        if (!user.value) return false

        if (user.value.is_anonymous === true) return true
        return user.value.app_metadata?.provider === 'anonymous'
    })
}
