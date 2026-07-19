<template>
  <div class="concept-actions">
    <div class="action-row">
      <UButton
        to="/signup"
        size="xl"
        color="primary"
        trailing-icon="i-lucide-arrow-right"
        class="concept-primary-button"
      >
        Start planning free
      </UButton>
      <UButton
        to="/login"
        size="xl"
        color="neutral"
        variant="ghost"
        icon="i-lucide-log-in"
        class="concept-secondary-button"
      >
        Log in
      </UButton>
    </div>

    <p class="concept-note">
      <UIcon name="i-lucide-circle-check" />
      Free to start · no credit card
    </p>
  </div>
</template>

<style scoped>
.concept-actions {
  display: grid;
  justify-items: center;
  margin-top: clamp(1.75rem, 4vh, 2.5rem);
}

.action-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.concept-primary-button {
  border: 1px solid #60a5fa;
  border-radius: 0;
  box-shadow: 0 0 28px rgba(37, 99, 235, 0.18);
}

.concept-secondary-button {
  color: #a1a1aa;
  border-radius: 0;
}

.concept-note {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 1.15rem;
  color: #62626c;
  font-size: 0.67rem;
  letter-spacing: 0.04em;
}

@media (max-width: 540px) {
  .action-row {
    width: min(100%, 20rem);
    flex-direction: column;
  }

  .action-row :deep(a) { width: 100%; }
}
</style>
