<script setup lang="ts">
const toast = useToast()
const { pokeSoundEnabled, disablePokeSound, requestPokeSoundAuthorization } = usePokeSound()
const testingPokeSound = ref(false)

async function onTogglePokeSound(enabled: boolean) {
    if (!enabled) {
        disablePokeSound()
        toast.add({
            title: 'Poke sounds muted',
            description: 'Poke sound alerts are turned off.',
            color: 'neutral'
        })
        return
    }

    testingPokeSound.value = true
    const authorized = await requestPokeSoundAuthorization()
    testingPokeSound.value = false

    toast.add({
        title: authorized ? 'Poke sounds enabled' : 'Sound blocked by browser',
        description: authorized
            ? 'You will hear the bird poke sound in rooms.'
            : 'Your browser did not allow audio yet. Allow sound for this tab/site and try again.',
        color: authorized ? 'success' : 'warning'
    })
}

async function onTestPokeSound() {
    testingPokeSound.value = true

    const played = await requestPokeSoundAuthorization()

    testingPokeSound.value = false

    if (played) {
        toast.add({
            title: 'Sound test successful',
            description: 'Bird sound is working for poke notifications.',
            color: 'success'
        })
        return
    }

    toast.add({
        title: 'Sound test failed',
        description: 'Audio is blocked by your browser. Interact with the page and try again.',
        color: 'warning'
    })
}
</script>

<template>
    <UCard>
        <template #header>
            <h2 class="text-xl font-semibold">Poke Sounds</h2>
            <p class="text-sm text-neutral-500">Control the bird sound played when someone pokes you in a room.</p>
        </template>

        <div class="space-y-4">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="font-medium text-neutral-900 dark:text-white">Sound notifications</p>
                    <p class="text-sm text-neutral-500">Enable or mute poke sounds for this browser.</p>
                    <p class="text-sm text-neutral-500">Enabling plays a quick sound to authorize audio for this tab.</p>
                </div>
                <USwitch
                    :model-value="Boolean(pokeSoundEnabled)"
                    :disabled="testingPokeSound"
                    @update:model-value="onTogglePokeSound"
                />
            </div>

            <UButton
                label="Test poke sound"
                icon="i-lucide-volume-2"
                color="neutral"
                variant="soft"
                :loading="testingPokeSound"
                @click="onTestPokeSound"
            />
        </div>
    </UCard>
</template>
