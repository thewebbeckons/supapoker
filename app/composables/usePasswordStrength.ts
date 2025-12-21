export const usePasswordStrength = (password: Ref<string>) => {
    const passwordStrength = computed(() => {
        const pwd = password.value
        return [
            { label: 'Min. 8 chars', met: pwd.length >= 8 },
            { label: 'Uppercase', met: /[A-Z]/.test(pwd) },
            { label: 'Lowercase', met: /[a-z]/.test(pwd) },
            { label: 'Number', met: /[0-9]/.test(pwd) },
            { label: 'Special char', met: /[^A-Za-z0-9]/.test(pwd) }
        ]
    })

    const strengthScore = computed(() => {
        return passwordStrength.value.filter(req => req.met).length
    })

    const strengthColor = computed(() => {
        const score = strengthScore.value
        if (score <= 2) return 'error'
        if (score <= 4) return 'warning'
        return 'success'
    })

    return {
        passwordStrength,
        strengthScore,
        strengthColor
    }
}
