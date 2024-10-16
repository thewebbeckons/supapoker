<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useUser } from '#imports'

const supabase = useSupabaseClient()
const user = useUser()

const avatarUrl = ref('')
const displayName = ref('')
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
    .update({ avatar_url: avatarUrl.value })
    .eq('id', user.value?.id)

  if (updateError) {
    console.error('Error updating profile:', updateError)
  }
}

async function updateProfile() {
  if (!user.value) return

  const updates = {
    id: user.value.id,
    display_name: displayName.value,
    updated_at: new Date(),
  }

  const { error: profileError } = await supabase.from('profiles').upsert(updates)

  if (profileError) {
    console.error('Error updating profile:', profileError)
  }

  if (email.value !== user.value.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email: email.value })
    if (emailError) {
      console.error('Error updating email:', emailError)
    }
  }

  if (newPassword.value) {
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword.value })
    if (passwordError) {
      console.error('Error updating password:', passwordError)
    }
  }

  // Reset password field after update
  newPassword.value = ''
}
</script>
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-6">Account Profile</h1>

    <div class="mb-6">
      <UAvatar :src="avatarUrl" />
      <UButton @click="$refs.avatarInput.click()" color="primary">Change Avatar</UButton>
      <input type="file" @change="uploadAvatar" accept="image/*" hidden="true">
    </div>

    <form @submit.prevent="updateProfile" class="space-y-4">
      <UFormGroup label="Display Name">
        <UInput v-model="displayName" />
      </UFormGroup>

      <UFormGroup label="Email">
        <UInput v-model="email" type="email" />
      </UFormGroup>

      <UFormGroup label="New Password">
        <UInput v-model="newPassword" type="password" />
      </UFormGroup>
      <UButton type="submit" color="primary">Update Profile</UButton>
    </form>
  </div>
</template>
