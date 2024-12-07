<script setup>
const user = useSupabaseUser()
const supabase = useSupabaseClient()
const loading = ref(false)
const roomName = ref('')

const emit = defineEmits(['close'])

async function createRoom() {
  loading.value = true
  try {
    const { data, error } = await supabase.from('rooms').insert({
      admin_id: user.value?.id,
      name: roomName.value,
    }).select()
    if (error) throw error
    console.log(data)
  } catch (error) {
    alert(error.message || error.description)
  } finally {
    loading.value = false
    emit('close')
  }
}
</script>
<template>
  <div class="p-6 space-y-4">
    <h1 class="text-xl font-semibold">Create Room</h1>
    <UInput placeholder="Room Name" v-model="roomName" />
    <div class="flex flex-row gap-2 pt-3 justify-end">
      <UButton label="Cancel" color="gray" :ui="{ rounded: 'rounded-full' }" @click="$emit('close')" />
      <UButton label="Create" color="primary" :ui="{ rounded: 'rounded-full' }" :loading="loading"
        @click="createRoom" />
    </div>
  </div>
</template>