# Aura Chat — React Native Chat App

A real-time mobile chat application built with Expo, Firebase, and Zustand.

## Features

- **Authentication** — Email/password sign-in and registration via Firebase Auth; session persists across app restarts in production builds
- **Unique usernames** — Claimed atomically at sign-up via Firestore transaction; permanent and immutable after creation
- **Real-time messaging** — Text, image, video, and audio messages powered by Firestore
- **Group chats** — Create groups from the People tab, sender names shown per bubble, leave group with automatic admin transfer
- **Read receipts** — Sent / Delivered / Read status per message
- **Typing indicators** — Live typing state broadcast to conversation participants
- **Emoji reactions** — Full emoji keyboard with per-message reaction counts and overflow expansion
- **Message actions** — Long-press to edit, delete, copy, or react
- **Media upload** — Images and videos via Cloudinary; audio recording via `expo-av`
- **Search** — In-conversation message search with highlighted matches; people search by name, `@username`, or email
- **Offline support** — Queued actions sync when connectivity is restored
- **Presence** — Online / last-seen status with green dot on avatars
- **Custom splash screen** — Animated logo on launch, shown only after signing in

## Tech Stack

| Layer | Library |
| --- | --- |
| Framework | Expo SDK 55 / Expo Router |
| Language | TypeScript |
| Backend | Firebase (Auth, Firestore) |
| Media storage | Cloudinary |
| State | Zustand |
| UI | React Native core + `expo-image`, `@expo/vector-icons` |
| Emoji picker | `rn-emoji-keyboard` |
| Toasts | `sonner-native` |
| Audio | `expo-av` |
| Builds | EAS (Expo Application Services) |

## Project Structure

```text
src/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # Conversations list
│   │   ├── people.tsx       # People directory + group creation
│   │   ├── settings.tsx     # Profile + sign out
│   │   └── _layout.tsx      # Tab navigator
│   ├── chats/
│   │   ├── [id].tsx         # Chat room (1:1 and group)
│   │   └── new.tsx          # New conversation modal
│   ├── index.tsx            # Root redirect (auth gate)
│   ├── login.tsx            # Sign in / sign up
│   ├── splash.tsx           # Animated splash route
│   └── _layout.tsx          # Root layout + auth listener
├── components/
│   ├── chat/
│   │   ├── MessageBubble.tsx    # Message rendering + reactions + sender name
│   │   ├── MessageActions.tsx   # Long-press action sheet
│   │   ├── EmojiPicker.tsx      # Full emoji keyboard modal
│   │   ├── AudioPlayer.tsx      # Voice message playback
│   │   ├── AudioRecorder.tsx    # Voice message recording
│   │   ├── ReadReceipt.tsx      # Tick indicators
│   │   └── TypingIndicator.tsx  # Animated dots
│   ├── Avatar.tsx           # Initials avatar with online dot
│   ├── SplashScreen.tsx     # Animated splash screen component
│   ├── EmptyState.tsx
│   ├── ErrorState.tsx
│   ├── LoadingState.tsx
│   └── OfflineBanner.tsx
├── hooks/
│   ├── useOfflineQueue.ts   # Queue writes when offline
│   └── usePresence.ts       # Online / last-seen heartbeat
├── stores/
│   ├── authStore.ts          # Current user state
│   ├── chatStore.ts          # Messages for active conversation
│   └── conversationsStore.ts # Conversations list
├── lib/                     # Shared utilities (compression, storage)
├── theme/                   # Colors, fonts, spacing tokens
└── types/                   # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- A Firebase project with Firestore and Authentication enabled
- A Cloudinary account
- An Expo account (free) for EAS builds

### Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/codabytez/hng-mobile-stage-5.git
   cd hng-mobile-stage-5
   pnpm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in the values:

   | Variable | Where to find it |
   | --- | --- |
   | `EXPO_PUBLIC_FIREBASE_*` | Firebase Console → Project Settings → Your apps |
   | `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary Dashboard → Account details |
   | `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary → Settings → Upload presets |

3. **Firebase setup**

   1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
   2. Enable **Email/Password** in Authentication → Sign-in method
   3. Create a **Firestore Database** and paste `firestore.rules` into the Rules tab
   4. Create a **Storage bucket** (default settings)
   5. Add a Web app in Project settings and copy the config keys into `.env`

4. **Deploy Firestore rules**

   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Start the dev server**

   ```bash
   pnpm start        # Expo Go / web
   pnpm ios          # iOS simulator
   pnpm android      # Android emulator
   ```

### Expo Go caveat (SDK 55)

The Expo Go versions on the App Store and Google Play may lag behind SDK 55 releases.

- **Android** — run `pnpm start` then choose "Open on Android" from the dev menu to get the latest build directly
- **iOS** — use the Expo Go TestFlight build (SDK 55 compatible) instead of the App Store version
- **Recommended** — use a development build to avoid Expo Go version constraints entirely

> **Note:** Auth session persistence requires a production build. In Expo Go, the JS bundle reloads on every refresh which clears in-memory auth state — this is a dev environment limitation, not a bug.

## Building with EAS

### First-time setup

```bash
npm install -g eas-cli
eas login
eas init
```

### Push environment variables to EAS

```bash
eas env:push --scope project --env-file .env
```

Run this once (or whenever your `.env` values change). EAS injects them automatically into every cloud build.

### Build commands

| Target | Command |
| --- | --- |
| Android APK (Appetize / sideload) | `eas build --platform android --profile preview` |
| iOS simulator build | `eas build --platform ios --profile simulator` |
| iOS device build (requires paid Apple Developer account) | `eas build --platform ios --profile preview` |
| Production Android AAB | `eas build --platform android --profile production` |

## Available Scripts

| Script | Description |
| --- | --- |
| `pnpm start` | Start the Expo dev server |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android` | Run on Android emulator |
| `pnpm typecheck` | Run TypeScript compiler check |
| `pnpm lint` | Lint with ESLint (zero warnings) |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format with Prettier |

## Firestore Data Model

### Collections

| Collection | Purpose |
| --- | --- |
| `users/{uid}` | User profile — `displayName`, `username`, `email`, `isOnline`, `lastSeen` |
| `usernames/{username}` | Username uniqueness index — maps username → `uid` |
| `conversations/{id}` | Conversation metadata — participants, typing state, last message |
| `conversations/{id}/messages/{id}` | Individual messages with reactions, read receipts, delivery state |

### Conversation fields

| Field | Type | Notes |
| --- | --- | --- |
| `type` | `'direct' \| 'group'` | Defaults to `'direct'` for older documents |
| `groupName` | `string` | Group chats only |
| `groupAdminUid` | `string` | Transfers automatically when admin leaves |
| `participants` | `string[]` | UIDs of all members |
| `participantNames` | `Record<uid, name>` | Display names at time of conversation creation |

## Firestore Security Rules

- **`usernames`** — readable by any authenticated user; create-only (no updates or deletes); `uid` field must match the caller
- **`users`** — readable by any authenticated user; `username` field is immutable after document creation
- **`conversations`** — participants-only read/write; leaving a group removes yourself from `participants`
- **`messages`** — participants can read and create; only the sender can edit or delete their own messages; any participant can update delivery/read receipt fields

## Environment Variables

All variables are prefixed with `EXPO_PUBLIC_` so they are inlined at build time by Expo. Never commit your `.env` file — it is already in `.gitignore`. Use `eas env:push` to securely upload them for cloud builds.
