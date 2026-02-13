# Phase 07: Security Polish - Research

**Researched:** 2026-02-14
**Domain:** Email verification, password recovery, and account deletion in Supabase Auth for Electron apps
**Confidence:** HIGH

## Summary

Phase 7 builds production-ready security features on top of the existing Supabase authentication implemented in Phases 4-6. Supabase Auth provides built-in email verification, password reset, and account deletion capabilities that require minimal custom code. The primary work involves configuring email templates, handling deep link redirects in Electron, implementing user-friendly UI flows, and ensuring GDPR-compliant data deletion.

**Key architectural insight:** Supabase handles the heavy lifting (token generation, email delivery, expiry management). The implementation focuses on three areas: (1) Email template configuration and production SMTP setup, (2) Electron deep link handling for email confirmation/reset links, (3) UI flows with proper loading states and error handling.

**Critical decisions from prior phases:**
- Email/password auth already implemented (Phase 4)
- OAuth flows already handle deep links via `lumenai://` protocol (Phase 5)
- Profile system with avatar storage already exists (Phase 6)
- Supabase onAuthStateChange deadlock bug already documented and avoided

**Primary recommendation:** Use Supabase's built-in email verification and password reset flows with custom email templates. Leverage existing deep link infrastructure from Phase 5. Implement account deletion via admin API with cascade deletion of Storage objects. Configure production SMTP before launch (default Supabase email service has 2 emails/hour limit).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.95.3+ (existing) | Email verification, password reset, user deletion | Official Supabase SDK, handles OTP generation, token validation, email triggers |
| Supabase Auth Email Templates | Built-in | Customizable email content | Go template syntax, supports HTML, includes built-in templates for confirmation/recovery |
| Custom SMTP provider | Any (SendGrid, AWS SES, Mailgun, Resend) | Production email delivery | Required for production — default Supabase SMTP limited to 2 emails/hour |
| Electron deep links | Built-in (existing) | Handle email link redirects | Already implemented for OAuth in Phase 5 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Supabase Admin API | Built-in | Delete user accounts | Requires service_role key, must run on server or main process |
| Zustand auth store | Existing | Track email verification state | Already implemented in Phase 4 |
| React error boundaries | Built-in | Graceful error handling | Catch async errors in verification flows |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase email verification | Custom OTP system | **Never do this** — Supabase handles expiry, rate limiting, secure token generation; custom systems are security minefields |
| Supabase password reset | Manual token generation + email | Custom solutions lack timing attack protection, token reuse detection, secure storage |
| Admin API for deletion | Client-side RLS deletion | Client can't delete auth.users records; requires server-side admin privileges |
| Production SMTP | Default Supabase email | Default service has 2 emails/hour limit and may not deliver to non-team emails in production |

**Installation:**
No new dependencies required — all capabilities exist in current stack.

**Production SMTP setup (required before launch):**
```bash
# Configure via Supabase Dashboard:
# Authentication → Settings → SMTP Settings
# Provider examples: SendGrid, AWS SES, Mailgun, Resend
# Estimated cost: $0-25/month for typical usage
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── stores/
│   └── authStore.ts           # Existing — add email verification state tracking
├── components/
│   └── auth/
│       ├── VerifyEmailPrompt.tsx  # NEW: Show after signup, prompt to check email
│       ├── ResetPasswordModal.tsx # NEW: Request password reset email
│       └── SetNewPasswordModal.tsx # NEW: Set password after reset link click
├── pages/
│   ├── auth/
│   │   ├── confirm-email.tsx      # NEW: Handle email confirmation deep links
│   │   └── reset-password.tsx     # NEW: Handle password reset deep links
│   └── settings/
│       └── AccountSettings.tsx    # NEW: Account deletion UI (danger zone)

electron/
├── main.js                    # Existing — already handles deep links for OAuth
└── secureStore.js             # Existing — used for storing session tokens
```

### Pattern 1: Email Verification After Signup

**What:** Supabase automatically sends confirmation email when user signs up. User must click link before they can sign in.

**When to use:** All email/password signups (OAuth doesn't require email verification since provider already verified).

**Configuration:**
```typescript
// Supabase Dashboard: Authentication → Email Provider
// ✓ Confirm email (enabled by default)
// Email OTP Expiration: 3600 seconds (1 hour default, configurable)
// Secure Email Change Enabled: true (recommended)
```

**Flow:**
1. User submits signup form → `supabase.auth.signUp({ email, password })`
2. Supabase sends confirmation email with link: `lumenai://auth/confirm?token_hash=...&type=email`
3. Electron deep link handler catches URL, routes to confirmation page
4. Frontend calls `supabase.auth.verifyOtp({ token_hash, type: 'email' })`
5. Session created, user redirected to app

**Example (Frontend — extend existing authStore):**
```typescript
// frontend/src/stores/authStore.ts
// Source: Supabase Password-based Auth Docs + existing auth patterns

signUp: async (email: string, password: string) => {
  set({ isLoading: true, error: null });

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.electron
          ? 'lumenai://auth/confirm'  // Electron deep link
          : `${window.location.origin}/auth/confirm`, // Web fallback
      }
    });

    if (error) throw error;

    // Show "Check your email" message
    set({
      isLoading: false,
      pendingVerification: email, // Track which email needs verification
    });

    return { success: true };
  } catch (err) {
    const translated = translateAuthError(err);
    set({ error: translated, isLoading: false });
    return { error: translated };
  }
},

verifyEmail: async (tokenHash: string) => {
  set({ isLoading: true, error: null });

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    });

    if (error) throw error;

    // Session now active, onAuthStateChange will fire
    set({ isLoading: false, pendingVerification: null });
    return { success: true };
  } catch (err) {
    const translated = translateAuthError(err);
    set({ error: translated, isLoading: false });
    return { error: translated };
  }
}
```

**UI Component:**
```typescript
// frontend/src/components/auth/VerifyEmailPrompt.tsx
// Source: Email verification UX best practices + existing modal pattern

export function VerifyEmailPrompt({ email }: { email: string }) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    // Supabase automatically resends confirmation email
    await supabase.auth.resend({
      type: 'signup',
      email,
    });
    setResending(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-auto mt-32">
        <h2 className="text-xl font-semibold mb-4">Check your email</h2>
        <p className="text-gray-600 mb-4">
          We sent a confirmation link to <strong>{email}</strong>.
          Click the link to activate your account.
        </p>
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-blue-600 hover:underline"
        >
          {resending ? 'Sending...' : 'Resend confirmation email'}
        </button>
      </div>
    </div>
  );
}
```

**Deep Link Handler (Electron — extend existing OAuth handler):**
```javascript
// electron/main.js
// Source: Existing OAuth deep link handler + Supabase email verification

function handleDeepLink(url) {
  const urlObj = new URL(url);
  const path = urlObj.pathname; // e.g., '/auth/confirm' or '/auth/callback'

  if (path === '/auth/confirm') {
    // Email confirmation link
    const tokenHash = urlObj.searchParams.get('token_hash');
    const type = urlObj.searchParams.get('type'); // 'email' or 'recovery'
    mainWindow.webContents.send('auth-verify', { tokenHash, type });
  } else if (path === '/auth/callback') {
    // OAuth callback (existing)
    const code = urlObj.searchParams.get('code');
    mainWindow.webContents.send('oauth-callback', { code });
  }
}
```

### Pattern 2: Password Reset Flow

**What:** User requests password reset email, clicks link, sets new password.

**When to use:** User forgot password, cannot sign in.

**Flow:**
1. User clicks "Forgot password" → `supabase.auth.resetPasswordForEmail(email)`
2. Supabase sends reset email with link: `lumenai://auth/reset?token_hash=...&type=recovery`
3. Electron deep link handler routes to reset password page
4. User enters new password → `supabase.auth.updateUser({ password: newPassword })`
5. Session auto-created, user logged in

**Example (Frontend):**
```typescript
// frontend/src/stores/authStore.ts
// Source: Supabase Password Reset Docs

requestPasswordReset: async (email: string) => {
  set({ isLoading: true, error: null });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.electron
        ? 'lumenai://auth/reset'
        : `${window.location.origin}/auth/reset`,
    });

    if (error) throw error;

    set({ isLoading: false });
    return { success: true, message: 'Check your email for reset link' };
  } catch (err) {
    const translated = translateAuthError(err);
    set({ error: translated, isLoading: false });
    return { error: translated };
  }
},

resetPassword: async (newPassword: string) => {
  // IMPORTANT: This must be called AFTER user clicks reset link
  // (Supabase verifies token and creates session automatically)
  set({ isLoading: true, error: null });

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    set({ isLoading: false });
    return { success: true };
  } catch (err) {
    const translated = translateAuthError(err);
    set({ error: translated, isLoading: false });
    return { error: translated };
  }
}
```

**UI Component:**
```typescript
// frontend/src/components/auth/ResetPasswordModal.tsx
// Source: Password reset UX patterns + existing modal pattern

export function ResetPasswordModal() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { requestPasswordReset, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await requestPasswordReset(email);
    if (result.success) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <h3>Check your email</h3>
        <p>We sent a password reset link to {email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset your password</h2>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Sending...' : 'Send reset link'}
      </button>
    </form>
  );
}
```

**Set New Password Page:**
```typescript
// frontend/src/pages/auth/reset-password.tsx
// Loaded when user clicks reset link (deep link handler routes here)

export function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { resetPassword, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const result = await resetPassword(newPassword);
    if (result.success) {
      // User is now logged in, redirect to dashboard
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Set new password</h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="New password"
          minLength={6}
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          minLength={6}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
```

### Pattern 3: Account Deletion (GDPR Compliance)

**What:** User can permanently delete their account and all associated data (profile, avatar, auth record).

**When to use:** Settings page "Danger Zone" section.

**Requirements (GDPR Article 17):**
1. User can request deletion easily (no barriers)
2. Deletion happens "without undue delay" (1 month max)
3. All personal data removed (auth record, profile, avatar, any other user data)
4. Third-party data processors notified (Supabase Storage for avatars)
5. Deletion is documented

**Implementation approach:**
- Frontend: Confirmation dialog with password re-entry (prevent accidental deletion)
- Backend: Main process IPC handler (requires service_role key, never expose in renderer)
- Cascade deletion: Delete Storage objects first, then profile, then auth.users record

**Example (Electron Main Process):**
```javascript
// electron/main.js
// Source: Supabase Admin API deleteUser + GDPR best practices

const { createClient } = require('@supabase/supabase-js');

// CRITICAL: service_role key must NEVER be exposed to renderer process
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // From secure env var, NOT .env file
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  }
);

ipcMain.handle('delete-user-account', async (event, userId) => {
  try {
    // 1. Delete user's avatar from Storage (prevent orphaned files)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (profile?.avatar_url) {
      const avatarPath = profile.avatar_url.split('/').slice(-2).join('/');
      await supabaseAdmin.storage.from('avatars').remove([avatarPath]);
    }

    // 2. Delete profile record (cascade handled by RLS policies if configured)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // 3. Delete auth.users record (hard delete, not soft delete)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId, {
      shouldSoftDelete: false, // Permanent deletion
    });

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('Account deletion error:', err);
    return { success: false, error: err.message };
  }
});
```

**Frontend UI:**
```typescript
// frontend/src/pages/settings/AccountSettings.tsx
// Source: GDPR deletion UX patterns + danger zone patterns

export function AccountSettings() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { user, signOut } = useAuthStore();

  const handleDeleteAccount = async () => {
    if (!passwordConfirm) {
      alert('Please enter your password to confirm');
      return;
    }

    // Re-authenticate to confirm password
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: passwordConfirm,
    });

    if (authError) {
      alert('Incorrect password');
      return;
    }

    setDeleting(true);

    // Call Electron main process to delete (requires service_role key)
    const result = await window.electron.deleteUserAccount(user!.id);

    if (result.success) {
      // Sign out and redirect to welcome page
      await signOut();
      window.location.href = '/';
    } else {
      alert(`Deletion failed: ${result.error}`);
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Account Settings</h1>

      {/* ... other settings ... */}

      <div className="border-t border-red-200 pt-6 mt-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. All your data
          will be permanently removed from our servers.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete my account
          </button>
        ) : (
          <div className="border border-red-300 rounded p-4 bg-red-50">
            <p className="font-semibold mb-2">Are you absolutely sure?</p>
            <p className="text-sm mb-4">
              This will permanently delete your account, profile, and all
              associated data. This action cannot be undone.
            </p>
            <input
              type="password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="Enter your password to confirm"
              className="w-full mb-3 px-3 py-2 border rounded"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, delete my account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Electron Preload Bridge:**
```javascript
// electron/preload.js (add to existing API)

contextBridge.exposeInMainWorld('electron', {
  // ... existing methods ...
  deleteUserAccount: (userId) => ipcRenderer.invoke('delete-user-account', userId),
});
```

### Pattern 4: Production Email Template Customization

**What:** Customize Supabase's default email templates with branding, clear CTAs, and user-friendly language.

**When to use:** Before production launch (improves deliverability and user trust).

**Configuration (Supabase Dashboard):**
```
Authentication → Email Templates

Available templates:
1. Confirm Signup — sent after user signs up
2. Magic Link — passwordless login (not used in this project)
3. Change Email Address — sent when user updates email
4. Reset Password — sent for password recovery
```

**Example (Confirmation Email):**
```html
<!-- Source: Supabase Email Templates + email verification best practices -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Confirm your email</title>
</head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="padding: 40px 20px;">
    <img src="https://your-domain.com/lumen-logo.png" alt="Lumen AI" width="120" />
    <h1 style="color: #333; margin-top: 30px;">Confirm your email address</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.5;">
      Thanks for signing up for Lumen AI! Click the button below to verify
      your email address and start reading papers with AI.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display: inline-block; margin: 20px 0; padding: 12px 24px;
              background: #3b82f6; color: white; text-decoration: none;
              border-radius: 6px; font-weight: 600;">
      Confirm Email Address
    </a>
    <p style="color: #999; font-size: 14px;">
      If you didn't create an account, you can safely ignore this email.
    </p>
    <p style="color: #999; font-size: 14px;">
      This link expires in 1 hour.
    </p>
  </div>
</body>
</html>
```

**Available template variables (Go template syntax):**
- `{{ .Email }}` — User's email address
- `{{ .Token }}` — OTP code (if using OTP instead of magic link)
- `{{ .TokenHash }}` — Token hash for URL construction
- `{{ .ConfirmationURL }}` — Full confirmation link (includes token)
- `{{ .SiteURL }}` — Your app's base URL
- `{{ .RedirectTo }}` — Custom redirect URL (if specified)

**Production SMTP providers (required):**
| Provider | Cost | Pros | Cons |
|----------|------|------|------|
| SendGrid | Free (100 emails/day) → $20/mo | Easy setup, good deliverability | Free tier limited |
| AWS SES | $0.10/1000 emails | Cheapest, scales well | Requires AWS account, more complex setup |
| Mailgun | Free (5K emails/mo) → $35/mo | Developer-friendly API | Higher cost for scale |
| Resend | Free (3K emails/mo) → $20/mo | Modern, simple API, good DX | Newer service |

**Configuration steps:**
1. Create account with SMTP provider
2. Verify domain (add DNS records for SPF/DKIM)
3. Get SMTP credentials (host, port, username, password)
4. Add to Supabase Dashboard: Authentication → Settings → SMTP Settings
5. Test with signup flow

### Anti-Patterns to Avoid

- **Never expose service_role key in renderer process** — Required for admin operations, must stay in main process
- **Never skip password confirmation on account deletion** — GDPR requires "clear affirmative action," not accidental clicks
- **Never call Supabase APIs inside onAuthStateChange callback** — Known deadlock bug (already documented in Phase 4)
- **Never silently fail email verification** — Show clear error messages, allow resending confirmation email
- **Never use default Supabase SMTP in production** — Limited to 2 emails/hour, may not deliver to non-team emails
- **Never forget to delete Storage objects before user** — Orphaned files cause deletion failures
- **Never assume email delivery is instant** — Show "Check your email" UI, don't auto-advance

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email verification tokens | Custom JWT or random strings | Supabase `signUp()` auto-sends | Supabase handles expiry (1 hour default), rate limiting (1 email/60s), secure token generation |
| Password reset tokens | Custom token storage + email | Supabase `resetPasswordForEmail()` | Handles timing attack resistance, single-use tokens, secure token hashing |
| OTP generation | `Math.random()` or `crypto.randomBytes()` | Supabase OTP system | Supabase uses cryptographically secure random, tracks attempts, enforces rate limits |
| Account deletion cascade | Manual SQL DELETE queries | Admin API + Storage API | Prevents orphaned data, handles foreign key constraints, respects RLS policies |
| Email delivery | Nodemailer + Gmail SMTP | Production SMTP provider | Gmail blocks automated emails, lacks deliverability monitoring, no dedicated IPs |
| Email rate limiting | Custom throttling logic | Supabase built-in limits | Default 1 email/60s per endpoint, configurable, prevents abuse |

**Key insight:** Email-based auth is deceptively complex. Supabase Auth handles token lifecycle, expiry, rate limiting, replay attack prevention, and timing attack resistance. Custom implementations take months to secure properly and still miss edge cases.

## Common Pitfalls

### Pitfall 1: Email Verification Blocks Login (Unexpected UX)

**What goes wrong:** User signs up, tries to log in immediately, gets "Email not confirmed" error. Confused users think signup failed.

**Why it happens:** Supabase enables "Confirm Email" by default. `signInWithPassword()` rejects unverified emails.

**How to avoid:**
- Show "Check your email to activate your account" message immediately after signup
- Translate "Email not confirmed" error to friendly message: "Please verify your email before signing in"
- Add "Resend verification email" button on login error
- Consider disabling email confirmation in dev/staging (NOT production)

**Warning signs:**
- Support tickets: "I signed up but can't log in"
- Users creating multiple accounts thinking first attempt failed
- High signup-to-activation drop-off rate

**Sources:**
- [Supabase General Configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Password-based Auth](https://supabase.com/docs/guides/auth/passwords)

### Pitfall 2: Deep Links Don't Open App (Protocol Not Registered)

**What goes wrong:** User clicks email verification/reset link in browser, but Electron app doesn't open. Link shows "No application found" error.

**Why it happens:**
1. Protocol handler not registered (`app.setAsDefaultProtocolClient()` missing)
2. macOS/Linux: App must be packaged (protocols don't work in dev mode)
3. Windows: Another app already registered the protocol
4. electron-builder `protocols` field missing from config

**How to avoid:**
- Ensure `app.setAsDefaultProtocolClient('lumenai')` called before `app.whenReady()`
- Add `protocols` field to `electron-builder.json`
- Test email flows in packaged builds, not dev mode (macOS/Linux requirement)
- On Windows dev, manually register protocol: `cmd /c start lumenai://test`
- Implement web fallback URL for users without app installed

**Warning signs:**
- Email links open browser but don't launch app
- macOS shows "Application not found" dialog
- Windows opens wrong application

**Sources:**
- [Electron Deep Links Tutorial](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- Phase 5 OAuth research (deep link patterns already documented)

### Pitfall 3: Password Reset Fails Silently (Missing Session)

**What goes wrong:** User clicks reset link, enters new password, but `updateUser({ password })` fails with "Not authenticated" error.

**Why it happens:** Supabase's `resetPasswordForEmail()` flow requires the reset link to create a session first. If session creation fails (expired link, already used), `updateUser()` has no context.

**How to avoid:**
- After deep link redirect, verify session exists before showing reset form
- Call `supabase.auth.getSession()` and check for `session.user`
- If no session, show "Link expired or already used" error with "Request new link" button
- Token expiry: Default 1 hour, configurable via Dashboard

**Warning signs:**
- Users report "password reset didn't work"
- Console errors: "JWTExpired" or "Invalid refresh token"
- Reset form appears but submission fails

**Sources:**
- [Supabase Password Reset Docs](https://supabase.com/docs/guides/auth/auth-password-reset)
- [Supabase JavaScript API: updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser)

### Pitfall 4: Account Deletion Fails Due to Storage Ownership

**What goes wrong:** `deleteUser()` throws error: "Cannot delete user who owns Storage objects."

**Why it happens:** Supabase Storage prevents deleting users with uploaded files to avoid orphaned objects.

**How to avoid:**
- Always delete Storage objects BEFORE deleting user
- Query user's avatar_url from profiles table
- Call `supabase.storage.from('avatars').remove([path])`
- Then call `supabase.auth.admin.deleteUser()`
- Consider cascade deletion via database triggers (advanced)

**Warning signs:**
- Deletion fails with Storage-related error
- Users report "account deletion doesn't work"
- Admin logs show orphaned files after deletion attempts

**Sources:**
- [Supabase Discussion: Cannot delete user with Storage objects](https://github.com/orgs/supabase/discussions/1066)
- [Supabase Delete User API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser)

### Pitfall 5: Production SMTP Not Configured (Emails Never Arrive)

**What goes wrong:** Signup/reset emails work in dev but stop working in production. Users report never receiving emails.

**Why it happens:** Default Supabase SMTP has strict limits: 2 emails/hour, may not deliver to non-team emails in production.

**How to avoid:**
- Configure custom SMTP BEFORE production launch
- Test email delivery to non-team email addresses
- Monitor SMTP provider dashboard for bounces/blocks
- Add email verification to pre-launch checklist
- Consider email delivery monitoring (e.g., SendGrid Event Webhook)

**Warning signs:**
- Users report emails not arriving (check spam first)
- Supabase dashboard shows "SMTP rate limit exceeded"
- Email delivery works in staging but not production

**Sources:**
- [Supabase Custom SMTP Docs](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)

### Pitfall 6: OTP Expiry Too Short (User Friction)

**What goes wrong:** User receives email, gets distracted, clicks link 10 minutes later — "Token expired" error.

**Why it happens:** Default OTP expiry is 1 hour, but some users take longer to check email.

**How to avoid:**
- Keep default 1 hour expiry (balance security and UX)
- For reset links, consider extending to 24 hours (less sensitive than signup)
- Always provide "Resend link" button on expiry error
- Show expiry time in email: "This link expires in 1 hour"
- Rate limit resends (1 per 60 seconds default) to prevent abuse

**Warning signs:**
- High expiry error rate (check Supabase auth logs)
- Users requesting support: "link doesn't work"
- Multiple resend requests from same user

**Sources:**
- [Supabase OTP Verification Failures](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0)
- [Supabase JavaScript API: resend](https://supabase.com/docs/reference/javascript/auth-resend)

### Pitfall 7: GDPR Deletion Incomplete (Orphaned Data)

**What goes wrong:** User deletes account, but profile data or avatar remains in database/storage. GDPR violation.

**Why it happens:** Incomplete cascade deletion — forgot to delete related tables, Storage objects, or cached data.

**How to avoid:**
- Checklist for deletion:
  - [ ] Delete from `profiles` table
  - [ ] Delete avatar from Storage `avatars` bucket
  - [ ] Delete from any other user-owned tables (notes, highlights, settings)
  - [ ] Delete auth.users record (last)
- Implement database triggers for automatic cascade (advanced)
- Test deletion flow end-to-end, verify data removed
- Log deletion events for GDPR compliance documentation

**Warning signs:**
- Database shows profiles with no matching auth.users record
- Storage shows avatars with no matching user
- GDPR audit finds orphaned personal data

**Sources:**
- [GDPR Article 17: Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Supabase GDPR Compliance Guide](https://bootstrapped.app/guide/how-to-handle-gdpr-compliance-with-supabase)

## Code Examples

Verified patterns from official sources:

### Resend Verification Email
```typescript
// Source: Supabase JavaScript API Reference

const { error } = await supabase.auth.resend({
  type: 'signup', // or 'email_change'
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'lumenai://auth/confirm',
  }
});

if (error) {
  console.error('Resend failed:', error.message);
}
```

### Check if Email Verified
```typescript
// Source: Supabase User Metadata

const { data: { user } } = await supabase.auth.getUser();

if (user && user.email_confirmed_at) {
  console.log('Email verified at:', user.email_confirmed_at);
} else {
  console.log('Email not verified');
}
```

### Handle Deep Link Verification (Electron)
```typescript
// frontend/src/pages/auth/confirm-email.tsx
// Source: Supabase verifyOtp + Electron deep link pattern

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

export function ConfirmEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { verifyEmail } = useAuthStore();

  useEffect(() => {
    // Parse token_hash from URL (passed via deep link handler)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenHash = urlParams.get('token_hash');
    const type = urlParams.get('type');

    if (!tokenHash || type !== 'email') {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    // Verify with Supabase
    verifyEmail(tokenHash)
      .then(result => {
        if (result.success) {
          setStatus('success');
          setMessage('Email verified! Redirecting...');
          setTimeout(() => window.location.href = '/', 2000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Verification failed');
        }
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {status === 'loading' && <p>Verifying your email...</p>}
      {status === 'success' && <p className="text-green-600">{message}</p>}
      {status === 'error' && (
        <div>
          <p className="text-red-600">{message}</p>
          <button onClick={() => window.location.href = '/signup'}>
            Back to signup
          </button>
        </div>
      )}
    </div>
  );
}
```

### Error Translation for Email Flows
```typescript
// Source: Supabase Auth Error Codes + existing translateAuthError pattern

function translateAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const authError = error as { code: string; message: string };
    switch (authError.code) {
      case 'email_not_confirmed':
        return 'Please verify your email before signing in. Check your inbox for the confirmation link.';
      case 'otp_expired':
        return 'This link has expired. Please request a new verification email.';
      case 'otp_disabled':
        return 'Email verification is not enabled for this account.';
      case 'over_email_send_rate_limit':
        return 'Too many emails sent. Please wait a few minutes before trying again.';
      case 'email_exists':
        return 'An account with this email already exists. Try logging in instead.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  return 'Network error. Please check your connection.';
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom OTP generation | Supabase built-in OTP | Always available | Supabase handles secure random, expiry, rate limiting |
| Manual email sending (Nodemailer) | Auth provider email system | 2020+ (Supabase/Auth0/etc) | Integrated with auth flow, better deliverability, template management |
| Soft delete (mark deleted flag) | Hard delete with cascade | GDPR enforcement (2018) | GDPR requires permanent deletion, not just hiding data |
| Email links to web URLs | Deep links to app | RFC 8252 (2017) | Better UX for native apps, maintains session context |
| Magic links (passwordless) | Email + password with verification | User preference | Both valid; email+password more familiar to non-technical users |

**Deprecated/outdated:**
- **Storing OTPs in localStorage**: Security risk — use Supabase session management instead
- **Unencrypted password reset tokens**: Modern systems use signed JWTs with short expiry
- **Manual SMTP without SPF/DKIM**: Email deliverability requires domain verification
- **Account deletion without cascade**: GDPR requires complete data removal

## Open Questions

1. **Should we implement "email change" flow (update email address)?**
   - What we know: Supabase has `updateUser({ email })` with built-in verification
   - What's unclear: Is email change a Phase 7 requirement or deferred to later?
   - Recommendation: Defer to Phase 8 or later (not in core security requirements SEC-01/02/03)

2. **How should we handle users who never verify email but continue using local features?**
   - What we know: Auth is optional, local Ollama works without login
   - What's unclear: Should unverified accounts be auto-deleted after 30 days?
   - Recommendation: Send reminder emails (7, 14, 30 days), then soft-delete unverified accounts after 60 days to reduce spam signups

3. **Should account deletion be instant or delayed (grace period)?**
   - What we know: GDPR requires deletion "without undue delay" (1 month max)
   - What's unclear: Should we offer 7-day grace period to prevent accidental deletion?
   - Recommendation: Instant deletion (matches user expectation of "delete now"), but show strong confirmation dialog with password re-entry

4. **How should we test email flows without hitting rate limits?**
   - What we know: Default Supabase SMTP has 2 emails/hour limit
   - What's unclear: Best dev workflow for testing signup/reset repeatedly
   - Recommendation: Use Supabase local dev with Inbucket (email testing tool), or create 5-10 test accounts and rotate through them

## Sources

### Primary (HIGH confidence)
- [Supabase Password-based Auth Docs](https://supabase.com/docs/guides/auth/passwords) — Email verification configuration, signup flow
- [Supabase Password Reset Docs](https://supabase.com/docs/guides/auth/auth-password-reset) — resetPasswordForEmail, updateUser flow
- [Supabase JavaScript API: verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp) — Email verification method signature
- [Supabase JavaScript API: resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) — Password reset method
- [Supabase JavaScript API: deleteUser](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser) — Admin API for account deletion
- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates) — Template customization, Go syntax
- [Supabase Custom SMTP Docs](https://supabase.com/docs/guides/auth/auth-smtp) — Production email configuration
- [Electron Deep Links Tutorial](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app) — Protocol handler setup
- [GDPR Article 17: Right to Erasure](https://gdpr-info.eu/art-17-gdpr/) — Legal requirements for account deletion
- [GDPR Right to be Forgotten Guide](https://gdpr.eu/right-to-be-forgotten/) — Implementation checklist

### Secondary (MEDIUM confidence)
- [Supabase OTP Verification Failures](https://supabase.com/docs/guides/troubleshooting/otp-verification-failures-token-has-expired-or-otp_expired-errors-5ee4d0) — Troubleshooting expiry errors
- [Supabase Discussion: Account deletion with Storage](https://github.com/orgs/supabase/discussions/1066) — Cascade deletion patterns
- [Email Verification UX Best Practices](https://aryaniyaps.medium.com/better-email-verification-workflows-13500ce042c7) — User experience patterns
- [Verification Email Design Examples](https://reallygoodemails.com/categories/verification) — Email template inspiration
- [GDPR Compliance Guide for Supabase](https://bootstrapped.app/guide/how-to-handle-gdpr-compliance-with-supabase) — Third-party compliance guide
- [Email Verification Best Practices 2026](https://verified.email/blog/email-verification/email-verification-best-practices) — Industry standards

### Tertiary (LOW confidence — needs validation)
- [Supabase SMTP Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) — Default limits (not clearly documented)
- Community discussions on deep link handling (various GitHub issues)

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All features built into Supabase Auth, no external dependencies
- Architecture patterns: **HIGH** — Deep link handling already implemented in Phase 5, account deletion follows standard admin API pattern
- Pitfalls: **HIGH** — Email verification blocking, deep link registration, GDPR cascade deletion all documented in official sources
- Email template customization: **MEDIUM** — Go template syntax documented, but limited examples for Electron deep links
- Production SMTP setup: **HIGH** — Required for production, well-documented by Supabase and SMTP providers

**Research date:** 2026-02-14
**Valid until:** ~60 days (April 2026) — Supabase Auth is stable, but security best practices evolve regularly

**Key unknowns requiring validation during implementation:**
- Exact deep link URL format for email templates (test with actual Supabase email delivery)
- Service role key management in packaged Electron app (environment variable vs. secure config file)
- Email delivery success rate with free-tier SMTP providers (may need paid plan for production)
- Grace period for unverified accounts (product decision, not technical constraint)
