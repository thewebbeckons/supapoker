<script lang="ts" setup>
const router = useRouter()
const email = ref('')
const password = ref('')

const handleLogin = async () => {
  try {
    // Implement your login logic here
    // For example, using Supabase:
    // const { error } = await supabase.auth.signIn({ email: email.value, password: password.value })
    // if (error) throw error

    // If login is successful, redirect to /rooms
    router.push('/rooms')
  } catch (error) {
    console.error('Login error:', error)
    // Handle login error (e.g., show error message to user)
  }
}
</script>
<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-2xl font-bold text-center">Login</h1>
      </template>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <UFormGroup label="Email">
          <UInput v-model="email" type="email" placeholder="Enter your email" required />
        </UFormGroup>
        <UFormGroup label="Password">
          <UInput v-model="password" type="password" placeholder="Enter your password" required />
        </UFormGroup>
        <UButton type="submit" color="primary" block>Login</UButton>
      </form>
    </UCard>
  </div>
</template>
