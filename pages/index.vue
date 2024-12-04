<template>
  <UContainer v-if="user" class="min-h-full grid place-items-center">
    <UButton v-if="user" to="/rooms">Go to Rooms</UButton>
  </UContainer>
  <UContainer v-else>
    <h1>Hello, Supapoker!</h1>
  </UContainer>
</template>

<script lang="ts" setup>
const user = useSupabaseUser()
</script>