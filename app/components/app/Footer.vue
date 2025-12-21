<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <UFooter>
    <template #left>
      SupaPoker
    </template>
    <template #right>
      Copyright © {{ year }} SupaPoker
    </template>
  </UFooter>
</template>
