<script lang="ts" setup>

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const avatarUrl = ref('')
const displayName = ref('Jesse')
const email = ref('')
const newPassword = ref('')

onMounted(async () => {
  if (user.value) {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, display_name')
      .eq('id', user.value.id)
      .single()

    if (data) {
      avatarUrl.value = data.avatar_url
      displayName.value = data.display_name
    }

    email.value = user.value.email || ''
  }
})

async function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random()}.${fileExt}`
  const filePath = `avatars/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file)

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    return
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
  avatarUrl.value = data.publicUrl

  const { error: updateError } = await supabase
    .from('profiles')
    //@ts-ignore
    .update({ avatar_url: avatarUrl.value })
    //@ts-ignore
    .eq('id', user.value?.id)

  if (updateError) {
    console.error('Error updating profile:', updateError)
  }
}

async function updateProfile() {

}
</script>
<template>
  <UContainer class="space-y-8">
    <UCard :ui="{ body: { padding: 'p-0 sm:p-0' } }">
      <template #header>
        <div class="flex flex-row gap-1 items-center">
          <UIcon name="i-heroicons-user" class="w-8 h-8" />
          <h1 class="font-bold text-xl">Account</h1>
        </div>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-2 divide-x divide-gray-200">
        <div class="p-4 flex flex-col justify-center items-center w-full h-full gap-2">
          <UAvatar :src="avatarUrl" :alt="displayName" class="w-32 h-32" />
          <UButton label="Upload Avatar" @click="uploadAvatar" />
        </div>
        <div>
          <ul class="divide-y divide-gray-200">
            <li class="grid grid-cols-2 justify-between align-center px-4 py-5 sm:p-6">
              <div class="font-semibold">Display Name</div>
              <div class="justify-self-end">{{ displayName }}</div>
            </li>
            <li class="grid grid-cols-2 justify-between align-center px-4 py-5 sm:p-6">
              <div class="font-semibold">Email</div>
              <div class="justify-self-end">{{ email }}</div>
            </li>
          </ul>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton color="primary">Update Profile</UButton>
        </div>
      </template>
    </UCard>
  </UContainer>
</template>
