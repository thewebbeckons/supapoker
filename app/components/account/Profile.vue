<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { user } = useCurrentUser();
const toast = useToast();
const isMounted = ref(false);

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email(),
  avatar: z.any().optional(),
});

type ProfileSchema = z.output<typeof profileSchema>;

const profileState = reactive<ProfileSchema>({
  name: "",
  email: "",
});
const avatarUrl = ref<string | null>(null);

const { data: profile, refresh } = useAsyncData("profile", async () => {
  if (!user.value) return null;
  return $fetch<{
    name: string;
    email: string;
    avatar: string | null;
    avatarPath: string | null;
  }>("/api/profile");
}, {
  watch: [user],
  default: () => null,
});

watch(profile, (newProfile) => {
  if (newProfile) {
    profileState.name = newProfile.name;
    profileState.email = newProfile.email;
    avatarUrl.value = newProfile.avatar;
  }
}, { immediate: true });

function syncEmailFromUser() {
  profileState.email = user.value?.email || "";
}

watch(user, () => {
  if (!isMounted.value) return;
  syncEmailFromUser();
});

onMounted(() => {
  isMounted.value = true;
  syncEmailFromUser();
});

async function onProfileSubmit(payload: FormSubmitEvent<ProfileSchema>) {
  try {
    if (!user.value) return;

    await $fetch("/api/profile", {
      method: "PATCH",
      body: {
        name: payload.data.name,
      },
    });

    await refresh();
    toast.add({ title: "Success", description: "Profile updated!", color: "success" });
  } catch (error: any) {
    toast.add({ title: "Error", description: error?.data?.message ?? error.message, color: "error" });
  }
}

async function onAvatarUpdate(url: string | null) {
  avatarUrl.value = url;
  await refresh();
}
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="text-xl font-semibold">Profile</h2>
      <p class="text-sm text-neutral-500">Update your personal information</p>
    </template>

    <UForm :schema="profileSchema" :state="profileState" @submit="onProfileSubmit" class="text-sm space-y-4">
      <UFormField name="name" label="Name" description="What you want others to call you." required class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="profileState.name" autocomplete="off" trailing-icon="i-lucide-user" />
      </UFormField>
      <USeparator />
      <UFormField name="email" label="Email" description="Your email address." class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="profileState.email" variant="subtle" autocomplete="off" trailing-icon="i-lucide-at-sign" disabled />
      </UFormField>
      <USeparator />
      <UFormField name="avatar" label="Avatar" description="JPG, GIF, WebP, or PNG. 1MB Max." class="flex max-sm:flex-col justify-between sm:items-center gap-4">
        <AccountAvatarUpload :model-value="avatarUrl" @update:model-value="onAvatarUpdate" :name="profileState.name" />
      </UFormField>
      <div class="flex justify-end pt-4">
        <UButton type="submit" label="Save changes" color="neutral" variant="solid" />
      </div>
    </UForm>
  </UCard>
</template>
