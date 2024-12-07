<script lang="ts" setup>
const items = [{
  label: 'Active Story',
  icon: 'i-heroicons-at-symbol',
  content: 'PD-4503'
}, {
  label: 'Upcoming Stories',
  icon: 'i-heroicons-bell-alert',
  content: 'And, this is the content for Tab2'
}, {
  label: 'Completed Stories',
  icon: 'i-heroicons-check-circle',
  content: 'Finally, this is the content for Tab3'
}]
</script>
<template>
  <UTabs :items="items" />
</template>
