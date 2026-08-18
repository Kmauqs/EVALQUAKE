# EVALQUAKE

Bilingual (Spanish/English), offline-first building damage assessment for Android, iOS, and web. The implementation follows `ARCHITECTURE.md` and uses the supplied `icon_960.png` as its app icon, favicon, splash image, and visual-system source.

## Included in this MVP

- One Expo Router + TypeScript application for Android, iOS, and responsive web.
- A resumable 17-section rapid/detailed assessment based on the architecture's 2B/ATC-20 model.
- Device-local drafts and an outbox: SQLite on Android/iOS and browser persistence on web.
- GPS, camera/gallery images, on-device image compression, sketch, and signature capture.
- Immediate local bilingual report generation using one shared HTML renderer.
- Immutable submission semantics and provisional UUIDs while offline.
- Coordinator dashboard with filters, classification summaries, map, detail, raw JSON, and CSV/JSON exports.
- Firebase Auth/Firestore/Storage adapters, emulator configuration, security rules, indexes, and Cloud Functions.
- Atomic official numbering and canonical PDF generation when a submitted assessment reaches Firebase.

The app starts in demo mode when Firebase variables are absent. Demo records are intentionally fictional.

## Run locally

Requirements: Node.js 22+, npm, and the Expo Go app or a configured Android/iOS simulator.

```bash
npm install
npm start
```

Then press:

- `a` for Android
- `i` for iOS (macOS/Xcode required)
- `w` for web

Direct commands:

```bash
npm run android
npm run ios
npm run web
```

Use the `EN` / `ES` control in the header to switch languages. The selection is persisted on the device.

## Firebase emulators

No Firebase credentials are committed. Copy `.env.example` to `.env.local`, use values from a non-production Firebase project, and keep:

```dotenv
EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true
```

Install the Firebase CLI, replace the placeholder project in `.firebaserc`, and run:

```bash
npm --prefix functions install
npm --prefix functions run build
npx firebase emulators:start
```

The configured local ports are:

- Emulator UI: `4000`
- Hosting: `5000`
- Functions: `5001`
- Firestore: `8080`
- Auth: `9099`
- Storage: `9199`

Android emulators automatically connect through `10.0.2.2`; iOS and web use `127.0.0.1`.

## Firebase users and claims

Users can create their own email/password account from the sign-in screen. New accounts stay **pending** until an administrator assigns `role` and `jurisdictionIds`. Custom claims are written only by Cloud Functions (`setUserRole`, `setUserDisabled`) or the trusted script:

```bash
node scripts/set-user-role.mjs user@domain.com evaluator jurisdiction-demo
```

Claims shape:

```json
{
  "role": "evaluator",
  "jurisdictionIds": ["jurisdiction-demo"]
}
```

Supported roles are `evaluator`, `coordinator`, and `admin`. The admin module lists Firestore `users/{uid}` profiles and can approve, change role/jurisdiction, or disable accounts. Firestore rules scope evaluation reads/writes to the user's jurisdictions. Once an evaluation changes from `draft` to `submitted`, client updates and deletes are denied. Corrections must be appended to `evaluations/{id}/auditLog`.

When Firebase is configured, the app displays sign-in/sign-up and only exposes the evaluator, coordinator, or admin routes allowed by those claims. After approval, the user should tap **Check access** or sign in again to refresh the token. New local evaluations are stamped with the authenticated Firebase UID; demo identity is used only when Firebase is not configured.

## Offline and synchronization model

The Expo-managed Firebase JavaScript SDK does not provide native Firestore disk persistence on React Native. For that reason, mobile uses SQLite as the durable source of truth and an explicit outbox; Firebase is the eventual remote replica. Web uses browser persistence plus the same repository contract.

The synchronization cycle runs at app startup and every 30 seconds:

1. Save every edit locally.
2. Queue the evaluation ID in the outbox.
3. When connected and Firebase is configured, compress/upload pending photos.
4. Write the evaluation to Firestore.
5. Remove the outbox item only after the remote write succeeds.

## Reports

`src/report/renderReportHtml.ts` renders all 17 sections in either language.

- Android/iOS: `expo-print` creates a PDF without network access.
- Web: jsPDF renders the shared HTML into a downloadable/openable PDF in the browser.
- Firebase: `finalizeEvaluation` assigns a collision-free jurisdiction counter, renders the same HTML with Puppeteer, and stores the canonical PDF in Cloud Storage.

The offline report shows the UUID and “official number pending.” The canonical server report includes the official number.

## Verification

```bash
npm run typecheck
npm test
npm run lint
npm run export:web
npm --prefix functions run build
```

Before production deployment, supply real Firebase app files/environment values, provision Auth users and custom claims, deploy rules/indexes/functions, configure monitoring alerts, and create signed EAS Android/iOS builds. Never commit `.env`, service-account files, signing keys, or platform credentials.
