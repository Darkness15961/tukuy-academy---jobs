# Plantillas Auth (Supabase) — Tukuy Academy

Estas plantillas **no se aplican solas** desde el repo.
Debes copiarlas en:

**Dashboard → Authentication → Emails → Templates**

Logo: `https://tukuyacademy.edu.pe/img/iconoTukuyAcademy.png`

| En Supabase | Subject (archivo) | Body (archivo) |
|-------------|-------------------|----------------|
| Confirm sign up | `confirm-signup.subject.txt` | `confirm-signup.html` |
| Invite user | `invite.subject.txt` | `invite.html` |
| Magic link | `magic-link.subject.txt` | `magic-link.html` |
| Change email address | `change-email.subject.txt` | `change-email.html` |
| Reset password | `reset-password.subject.txt` | `reset-password.html` |
| Reauthentication | `reauthentication.subject.txt` | `reauthentication.html` |

No borres variables como `{{ .ConfirmationURL }}` o `{{ .Token }}`.
