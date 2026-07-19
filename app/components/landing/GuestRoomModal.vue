<script setup lang="ts">
import type { Room } from "~/types/room";

const open = defineModel<boolean>({ default: false });
const { user, guestRoomId, refresh } = useCurrentUser();
const config = useRuntimeConfig();
const toast = useToast();
const step = ref<1 | 2>(1);
const name = ref("");
const description = ref("");
const displayName = ref("");
const turnstileToken = ref("");
const isCreating = ref(false);
const turnstileFailed = ref(false);
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");

const isReturningGuest = computed(() => Boolean(user.value?.isAnonymous && guestRoomId.value));
const authRedirect = computed(() => guestRoomId.value ? `/rooms/${guestRoomId.value}` : "/");
const loginLink = computed(() => ({ path: "/login", query: { redirectTo: authRedirect.value } }));
const signupLink = computed(() => ({ path: "/signup", query: { redirectTo: authRedirect.value } }));
const canContinue = computed(() => name.value.trim().length > 0);
const canCreate = computed(() => {
  if (isCreating.value || displayName.value.trim().length < 2) return false;
  return Boolean(user.value && !user.value.isAnonymous) || Boolean(turnstileToken.value);
});

watch(open, (value) => {
  if (!value) return;
  step.value = 1;
  displayName.value = user.value?.isAnonymous && user.value.name !== "Guest"
    ? user.value.name
    : "";
  turnstileToken.value = "";
  turnstileFailed.value = false;
});

async function createRoom() {
  if (!canCreate.value) return;
  isCreating.value = true;

  try {
    if (!user.value) {
      const result = await authClient.signIn.anonymous();
      if (result.error) throw new Error(result.error.message || "Unable to start a guest session.");
      await refresh();
    }

    const room = await $fetch<Room>("/api/rooms", {
      method: "POST",
      body: {
        name: name.value,
        description: description.value || null,
        displayName: displayName.value,
        turnstileToken: turnstileToken.value,
      },
    });
    await refresh();
    open.value = false;
    await navigateTo(`/rooms/${room.id}`);
  } catch (error: any) {
    turnstile.value?.reset();
    const roomId = error?.data?.data?.roomId ?? error?.data?.roomId;
    if (roomId) {
      await refresh();
      return;
    }
    toast.add({
      title: "Unable to create room",
      description: error?.data?.message ?? error?.message ?? "Please try again.",
      color: "error",
    });
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!isCreating"
    :title="isReturningGuest ? 'Your first room is ready' : step === 1 ? 'Name your first room' : 'How should teammates know you?'"
    :description="isReturningGuest ? 'Guests can own one active room. Create an account to unlock more rooms and a permanent profile.' : step === 1 ? 'Start planning now. You can create an account whenever you are ready.' : 'This name appears to everyone in the room.'"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div v-if="isReturningGuest" class="space-y-5">
        <div class="rounded-lg border border-primary-500/20 bg-primary-500/5 p-4 text-sm text-neutral-300">
          Your guest room stays available in this browser. Upgrade now to create more rooms and keep your profile across devices.
        </div>
        <div class="grid gap-2 sm:grid-cols-2">
          <UButton :to="signupLink" label="Create account" color="primary" block />
          <UButton :to="loginLink" label="Log in" color="neutral" variant="outline" block />
        </div>
        <UButton
          :to="`/rooms/${guestRoomId}`"
          label="Open existing room"
          icon="i-lucide-arrow-right"
          color="neutral"
          variant="ghost"
          block
        />
      </div>

      <form v-else-if="step === 1" class="space-y-5" @submit.prevent="step = 2">
        <UFormField label="Room name" required>
          <UInput v-model="name" autofocus maxlength="120" placeholder="Sprint planning" class="w-full" />
        </UFormField>
        <UFormField label="Description" hint="Optional">
          <UTextarea v-model="description" maxlength="500" placeholder="What are you estimating?" class="w-full" />
        </UFormField>
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-neutral-500">
            Prefer an account?
            <NuxtLink :to="loginLink" class="text-neutral-300 hover:text-white">Log in</NuxtLink>
            or
            <NuxtLink :to="signupLink" class="text-neutral-300 hover:text-white">sign up</NuxtLink>
          </p>
          <UButton type="submit" label="Continue" trailing-icon="i-lucide-arrow-right" :disabled="!canContinue" />
        </div>
      </form>

      <form v-else class="space-y-5" @submit.prevent="createRoom">
        <UFormField label="Display name" required>
          <UInput v-model="displayName" maxlength="80" placeholder="Your name" icon="i-lucide-user" class="w-full" />
        </UFormField>
        <ClientOnly>
          <TurnstileWidget
            v-if="config.public.turnstileSiteKey"
            ref="turnstile"
            v-model="turnstileToken"
            :site-key="config.public.turnstileSiteKey"
            @error="turnstileFailed = true"
          />
          <p v-else class="text-sm text-warning-400">Guest room creation is not configured yet.</p>
        </ClientOnly>
        <p v-if="turnstileFailed" class="text-xs text-error-400">The security check could not load. Please try again.</p>
        <div class="flex items-center justify-between gap-3">
          <UButton label="Back" color="neutral" variant="ghost" :disabled="isCreating" @click="step = 1" />
          <UButton type="submit" label="Create room" :loading="isCreating" :disabled="!canCreate" />
        </div>
        <p class="text-center text-xs text-neutral-500">
          Want a permanent profile?
          <NuxtLink :to="loginLink" class="text-neutral-300 hover:text-white">Log in</NuxtLink>
          or
          <NuxtLink :to="signupLink" class="text-neutral-300 hover:text-white">sign up</NuxtLink>
        </p>
      </form>
    </template>
  </UModal>
</template>
