<template>
  <UContainer class="py-6">
    <div class="p-4 border-2 rounded-full border-slate-700 shadow-[7px_7px_0_0_rgba(0,0,0,0.8)]">
      <div v-if="user" class="flex flex-row justify-between">
        <h1 class="font-bold text-2xl">SupaPoker</h1>
        <div class="flex flex-row gap-4 justify-end items-center">
          <UButton variant="ghost" color="gray" to="/rooms">
            Rooms
          </UButton>
          <UButton variant="ghost" color="gray" to="/account">
            Account
          </UButton>
          <UButton color="red" variant="outline" label="Logout" :ui="{ rounded: 'rounded-full' }" class="ring-2"
            @click="logout" />
        </div>
      </div>
      <div v-else class="flex flex-row justify-between">
        <NuxtLink to="/">
          <h1 class="font-bold text-2xl">SupaPoker</h1>
          <UButton v-if="$route.path != '/login'" :ui="{ rounded: 'rounded-full' }" label="Login" to="/login" />
        </NuxtLink>
      </div>
    </div>
  </UContainer>
</template>

<script lang="ts" setup>
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const logout = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) console.log(error)
}
</script>

<style></style>