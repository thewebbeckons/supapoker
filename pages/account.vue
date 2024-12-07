<script setup>

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const loading = ref(false)
const avatar_path = ref('')

const { data: profile } = await useAsyncData('profile', async () => {
  const { data, error } = await supabase.from('profiles').select('display_name, avatar_url, email').eq('user_id', user.value.id).single()

  if (data) {
    avatar_path.value = data.avatar_url
  }
  return data
})



</script>
<template>
  <UContainer class="space-y-8 max-w-2xl">
    <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
      <template #header>
        <div class="flex flex-row gap-1 items-center">
          <UIcon name="i-heroicons-user" class="w-8 h-8" />
          <h1 class="font-bold text-xl">Account</h1>
        </div>
      </template>
      <div class="grid grid-cols-1 divide-y divide-gray-200">
        <div class="p-4 flex flex-col justify-center items-center w-full h-full gap-2">
          <AccountUploadAvatar v-model:path="avatar_path" @upload="updateProfile" />
        </div>
        <ul class="divide-y divide-gray-200">
          <li class="grid grid-cols-2 justify-between align-center px-4 py-5 sm:p-6">
            <div class="font-semibold">Display Name</div>
            <div class="justify-self-end">{{ profile.display_name }}</div>
          </li>
          <li class="grid grid-cols-2 justify-between align-center px-4 py-5 sm:p-6">
            <div class="font-semibold">Email</div>
            <div class="justify-self-end">{{ profile.email }}</div>
          </li>
        </ul>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton color="primary">Update Profile</UButton>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
