const POKE_SOUND_COOKIE_KEY = 'poke-sound-enabled'
const POKE_SOUND_MAX_AGE = 60 * 60 * 24 * 365

export function usePokeSound() {
    const pokeSoundEnabled = useCookie<boolean>(POKE_SOUND_COOKIE_KEY, {
        default: () => false,
        maxAge: POKE_SOUND_MAX_AGE,
        sameSite: 'lax',
    })

    function setPokeSoundEnabled(enabled: boolean) {
        pokeSoundEnabled.value = enabled
    }

    function disablePokeSound() {
        setPokeSoundEnabled(false)
    }

    async function playPokeSound() {
        if (!import.meta.client) {
            return false
        }

        try {
            const audio = new Audio('/cawcaw.mp3')
            await audio.play()
            return true
        } catch (error) {
            console.warn('[Poke] Could not play sound:', error)
            return false
        }
    }

    async function playPokeSoundIfEnabled() {
        if (!pokeSoundEnabled.value) {
            return false
        }

        return playPokeSound()
    }

    async function requestPokeSoundAuthorization() {
        const played = await playPokeSound()
        setPokeSoundEnabled(played)
        return played
    }

    return {
        pokeSoundEnabled,
        setPokeSoundEnabled,
        disablePokeSound,
        playPokeSound,
        playPokeSoundIfEnabled,
        requestPokeSoundAuthorization,
    }
}
