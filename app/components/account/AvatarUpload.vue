<script setup lang="ts">
const { modelValue, name } = defineProps<{
  modelValue: string | null;
  name: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const toast = useToast();
const busy = ref(false);
const previewUrl = ref<string | null>(null);
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const displayedAvatar = computed(() => previewUrl.value || modelValue);

function openFileInput() {
  if (busy.value) return;
  fileInput.value?.click();
}

function clearPreview() {
  if (!previewUrl.value) return;
  URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
}

function errorDescription(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { data?: { message?: unknown }; message?: unknown };
    if (typeof candidate.data?.message === "string") return candidate.data.message;
    if (typeof candidate.message === "string") return candidate.message;
  }

  return "Unable to upload avatar.";
}

onBeforeUnmount(clearPreview);

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  try {
    busy.value = true;
    const file = input.files[0];
    if (!file) return;
    if (!allowedMimeTypes.has(file.type)) {
      toast.add({
        title: "Unsupported image type",
        description: "Please upload a PNG, JPEG, GIF, or WebP image.",
        color: "error",
      });
      return;
    }

    if (file.size > MAX_AVATAR_SOURCE_BYTES) {
      toast.add({
        title: "Image too large",
        description: "Avatar source images must be 10MB or smaller.",
        color: "error",
      });
      return;
    }

    const avatar = await processAvatarImage(file);
    clearPreview();
    previewUrl.value = URL.createObjectURL(avatar);

    const formData = new FormData();
    formData.append("avatar", avatar, "avatar.webp");
    const result = await $fetch<{ avatar: string }>("/api/profile/avatar", {
      method: "POST",
      body: formData,
    });

    emit("update:modelValue", result.avatar);
    clearPreview();
    toast.add({ title: "Success", description: "Avatar uploaded!", color: "success" });
  } catch (error: unknown) {
    clearPreview();
    toast.add({ title: "Error", description: errorDescription(error), color: "error" });
  } finally {
    busy.value = false;
    if (fileInput.value) fileInput.value.value = "";
  }
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative group block rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="busy ? 'cursor-wait' : 'cursor-pointer'"
      :aria-label="busy ? 'Processing avatar' : 'Upload avatar'"
      :aria-busy="busy"
      :disabled="busy"
      @click="openFileInput"
    >
      <UAvatar :src="displayedAvatar || undefined" :alt="name" size="3xl" class="group-hover:opacity-75 transition-opacity" />

      <div v-if="!busy" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <UIcon name="i-lucide-upload" class="w-6 h-6 text-white" />
      </div>

      <div v-if="busy" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
        <UIcon name="i-lucide-loader-2" class="w-6 h-6 text-white animate-spin" />
      </div>
    </button>

    <input ref="fileInput" type="file" class="hidden" accept="image/png,image/jpeg,image/gif,image/webp" :disabled="busy" @change="uploadAvatar" />
  </div>
</template>
