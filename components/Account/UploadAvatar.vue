<script setup>
const props = defineProps(['path'])
const { path } = toRefs(props)

const emit = defineEmits('update:path', 'upload')

const supabase = useSupabaseClient()

const uploading = ref(false)
const src = ref('')
const files = ref()
const fileRef = ref()

const downloadImage = async () => {
  try {
    const { data, error } = await supabase.storage.from('avatars').download(path.value)
    if (error) throw error
    src.value = URL.createObjectURL(data)
  } catch (error) {
    console.error('Error Downloading image: ', error.message)
  }
}

const uploadAvatar = async (evt) => {
  files.value = evt.target.files
  try {
    uploading.value = true

    if (!files.value || files.value.length === 0) {
      throw new Error('You must select an image to upload')
    }

    const file = files.value[0]
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

    if (uploadError) throw uploadError

    emit('update:path', filePath)
    emit('upload')
  } catch (error) {
    alert(error.message)
  } finally {
    uploading.value = false
  }
}

function onFileClick() {
  fileRef.value?.click()
}

downloadImage()

watch(path, () => {
  if (path.value) {
    downloadImage()
  }
})
</script>
<template>
  <UAvatar :src="avatarUrl" :alt="displayName" class="w-32 h-32" />
  <UButton color="primary" variant="soft" icon="i-heroicons-arrow-up-tray" label="Upload Image" @click="onFileClick"
    :loading="uploading" />
  <input ref="fileRef" type="file" class="hidden" capture="camera" accept="image/*" @change="uploadAvatar">
</template>
