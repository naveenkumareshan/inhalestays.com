

## Email OTP Login for Students

### What We'll Build
Add a "Login with Email OTP" option on the Student Login page. The student enters their email, receives a 6-digit OTP code via email, enters it, and gets logged in — no password needed.

### How It Works
Supabase Auth has built-in support for email OTP via `signInWithOtp()`. When called, it sends a magic link AND a 6-digit OTP code to the user's email. We'll use the OTP code approach for a smoother in-app experience.

### Flow
```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Enter Email     │ ──► │  OTP sent to     │ ──► │  Enter 6-digit  │
│  Click "Send OTP"│     │  user's inbox    │     │  OTP code       │
└─────────────────┘     └──────────────────┘     │  Click "Verify" │
                                                  └───────┬─────────┘
                                                          │
                                                  ┌───────▼─────────┐
                                                  │  Logged in!     │
                                                  │  → Dashboard    │
                                                  └─────────────────┘
```

### Changes

**1. Update Student Login page (`src/pages/StudentLogin.tsx`)**
- Add a tab/toggle to switch between "Password Login" and "OTP Login"
- OTP tab shows: email input → "Send OTP" button → OTP input (6 digits) → "Verify" button
- Uses `supabase.auth.signInWithOtp({ email })` to send OTP
- Uses `supabase.auth.verifyOtp({ email, token, type: 'email' })` to verify
- On success, AuthContext picks up the session automatically

**2. No database changes needed**
- Supabase Auth handles OTP generation, email delivery, and verification natively
- The existing `handle_new_user` trigger will create profiles for first-time OTP users automatically

**3. No edge functions needed**
- OTP emails are sent by the built-in auth system

### UI Design
The login card will have two modes toggled by a link/button:
- **Password mode** (current default) — email + password fields
- **OTP mode** — email field → Send OTP → 6-digit input field with auto-focus

Both modes keep the existing Google/Apple social login buttons below.

### Files Modified
- `src/pages/StudentLogin.tsx` — Add OTP login flow with tab switching

