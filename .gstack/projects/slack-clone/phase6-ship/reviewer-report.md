# Reviewer Report — Phase 6 Ship

Date: 2026-04-17
Agent: Reviewer

---

## Summary

All Phase 5 issues have been resolved. The final production build passes without TypeScript or bundler errors.

---

## Fixes Applied

### [Critical] Build Verification
- Build confirmed clean: `npm run build` → `✓ built in 1.14s`
- No TypeScript errors, no missing types.

---

### [High] Security: CSP & HSTS Headers — `netlify.toml`

**File**: `/Applications/MAMP/htdocs/Slack/netlify.toml`

Added to the `[[headers]] for = "/*"` section:
- `Content-Security-Policy` — restricts sources for scripts, styles, fonts, images, and WebSocket connections to trusted Firebase/Google domains only.
- `Strict-Transport-Security` — `max-age=31536000; includeSubDomains` to enforce HTTPS.

---

### [High] Security: Firestore Rules — Privilege Escalation Prevention

**File**: `/Applications/MAMP/htdocs/Slack/firestore.rules`

Updated the channel `allow update` rule to restrict writable fields:

```
allow update: if isChannelMember(channelId)
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'description', 'members']);
```

This prevents any member from overwriting `createdBy` or `createdAt` fields on a channel document.

---

### [Medium] BUG-02: Reaction Persistence — `MessageItem.tsx`

**File**: `/Applications/MAMP/htdocs/Slack/src/components/message/MessageItem.tsx`

- Imported `addReaction` from `../../services`.
- Updated `handleReaction` to be `async` and call `addReaction(activeChannelId, message.id, emoji, user.uid)` after updating local state.
- Errors are caught and logged without breaking UI state.

**File**: `/Applications/MAMP/htdocs/Slack/src/services/index.ts`

- Added `addReaction` export function using `arrayUnion` to idempotently append a UID to the emoji reaction array in Firestore.
- Added `arrayUnion` to the Firestore imports.

---

### [Medium] BUG-06: Notification Type — `index.ts` `sendMessage`

**File**: `/Applications/MAMP/htdocs/Slack/src/services/index.ts`

- Stored `addDoc` return value as `msgRef` to capture the new document ID.
- Added `messageId: msgRef.id` and `fromDisplayName: user.displayName` to all notification writes inside `sendMessage`, making them consistent with the `Notification` type and the `mentionService.ts` implementation.

---

### [Medium] BUG-08: Japanese Mention Regex — `mentionService.ts`

**File**: `/Applications/MAMP/htdocs/Slack/src/services/mentionService.ts`

- Updated `parseMentions` regex from `/@\[.+?\]\((.+?)\)/g` to `/@\[([^\]]+)\]\(([^)]+)\)/g`.
  - Group 1 now explicitly captures `displayName` (no `]` allowed inside).
  - Group 2 now explicitly captures `uid` (no `)` allowed inside).
- Updated `match[1]` to `match[2]` so the extracted value is the `uid`, not the `displayName`.
- The `[^\]]+` character class correctly handles Japanese characters (and all Unicode) without needing special flags.

---

## Final Build Result

```
vite v5.4.21 building for production...
✓ 907 modules transformed.
dist/index.html                         0.77 kB │ gzip:   0.39 kB
dist/assets/index-Dpe9Bia4.css         17.66 kB │ gzip:   4.29 kB
dist/assets/vendor-BsrEXlAY.js         40.93 kB │ gzip:  12.32 kB
dist/assets/index-CDgWjXtI.js          44.63 kB │ gzip:  13.61 kB
dist/assets/react-vendor--ejHCorC.js  160.03 kB │ gzip:  52.25 kB
dist/assets/firebase-BB2itz4R.js      555.17 kB │ gzip: 130.80 kB
✓ built in 1.14s
```

Status: **PASS** — Ready for deployment.

---

## Open Note

The Firebase chunk (`firebase-BB2itz4R.js`) is 555 kB, triggering a Vite chunk-size warning. This is expected for Firebase SDK and does not affect functionality. It can be addressed post-launch with dynamic imports (`import()`) or `manualChunks` configuration if bundle size becomes a concern.
