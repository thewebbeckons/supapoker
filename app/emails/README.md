# SupaPoker Email Templates

Transactional emails are rendered with `nuxt-email-renderer` from Vue components in this directory.

- `ConfirmAccountEmail.vue` is used for Better Auth email verification.
- `ResetPasswordEmail.vue` is used for Better Auth password resets.
- `components/EmailLayout.vue` and `components/EmailText.vue` hold the shared email UI.

The application sends mail through `server/utils/auth.ts` and `server/utils/auth-email.ts`.
