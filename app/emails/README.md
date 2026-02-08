# Supabase Dashboard Email Templates

Copy/paste each HTML file into the matching Supabase template:

- Confirm sign up -> `confirm-signup.html`
- Invite user -> `invite-user.html`
- Magic link -> `magic-link.html`
- Change email address -> `change-email-address.html`
- Reset password -> `reset-password.html`
- Reauthentication -> `reauthentication.html`

Suggested subjects:

- Confirm sign up: `Confirm your SupaPoker account`
- Invite user: `You're invited to SupaPoker`
- Magic link: `Your SupaPoker magic link`
- Change email address: `Confirm your new SupaPoker email`
- Reset password: `Reset your SupaPoker password`
- Reauthentication: `Confirm your identity on SupaPoker`

Template variables used (Supabase):

- `{{ .ConfirmationURL }}`
- `{{ .Email }}`
- `{{ .NewEmail }}`
- `{{ .Token }}`
