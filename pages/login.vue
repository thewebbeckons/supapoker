<script lang="ts" setup>
const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const toast = useToast()

const handleLogin = async () => {
  try {
    loading.value = true

    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: 'http://localhost:3000/confirm'
      }
    })
    if (error) throw error
    toast.add({
      id: 'magic-link',
      color: 'primary',
      title: 'Whoa... Magic!',
      description: 'Check your email for our magic link!',
      icon: 'i-heroicons-rocket-launch-24',
      timeout: 2000,
    })

  } catch (error: any) {
    console.error('Login error:', error)
    // Handle login error (e.g., show error message to user)
    toast.add({
      id: 'login-error',
      color: 'red',
      title: 'Heads up!',
      description: error.message || error.description || 'Whoopsie...',
      icon: 'i-heroicons-exclamation-circle-24',
      timeout: 2000,
    })
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <div class="flex items-center justify-center py-12">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-2xl font-bold">Welcome Back!</h1>
        <p>Let's get magical!</p>
      </template>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormGroup label="Email">
          <UInput v-model="email" type="email" placeholder="Enter your email" required />
        </UFormGroup>
        <UButton type="submit" color="blue" block :loading="loading">Login</UButton>
      </form>
    </UCard>
  </div>
</template>
