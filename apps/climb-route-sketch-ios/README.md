# Climb Route Sketch — iOS (Expo)

Expo (managed) React Native + TypeScript port of the
[`climb-route-sketch`](../climb-route-sketch) web app, targeting the Apple App
Store. Same idea: photograph a climbing wall, tap a hold to pick the route's
color, and get a clean abstract sketch — flat silhouettes of just that route's
holds plus muted lines tracing the wall structure. All image processing is
on-device (no server, no API keys).

## What's shared with the web app

`src/lib/extract.ts` (HSV color match → connected components → Moore-neighbor
contour tracing → RDP simplification) and `src/lib/wallLines.ts` (coarse
region-boundary pass + fine Hough pass) are direct ports with identical
algorithms. The platform differences are isolated:

- `src/lib/raster.ts` replaces canvas `ImageData`: images are downscaled and
  re-encoded with `expo-image-manipulator` (which also normalizes HEIC camera
  shots), then decoded to an RGBA buffer with pure-JS `jpeg-js`.
- `src/lib/svgPaths.ts` replaces canvas path drawing: the same
  midpoint-quadratic smoothing emitted as SVG `d` strings, rendered with
  `react-native-svg`.
- Save/share uses `react-native-view-shot` to rasterize the sketch, then
  `expo-media-library` (save to Photos) or `expo-sharing` (share sheet).

## Run locally

Bun is used for dependency management (`bunfig.toml` enforces
`minimumReleaseAge = 259200`; some Expo-pinned patch versions are relaxed to
`~x.y.0` for that reason):

```sh
bun install
bun run start      # npx expo start — press i for iOS simulator, w for web
```

- **iOS device**: install [Expo Go](https://expo.dev/go) and scan the QR code.
- **Web** (for quick validation): `bun run web`.
- **Typecheck**: `bun run typecheck`.

## App Store / TestFlight path (EAS)

The app is configured for store submission — `app.json` sets the display name
"Climb Route Sketch", `ios.bundleIdentifier` `com.newlegna.climbroutesketch`,
version/build number, icon + splash placeholders (swap `assets/icon.png` and
`assets/splash-icon.png` for final art), and the three iOS privacy strings
(camera, photo library read, photo library add). `eas.json` defines
`development` (simulator), `preview` (internal distribution), and `production`
profiles.

> **Angel supplies all Apple credentials.** Nothing secret is (or should be)
> committed to this repo — no Apple Team ID, API keys, provisioning profiles,
> or `.env` files. EAS stores credentials on Expo's servers after you log in.

One-time setup:

1. Create an [Expo account](https://expo.dev) and an
   [Apple Developer Program](https://developer.apple.com/programs/) membership.
2. `npm i -g eas-cli && eas login`
3. `eas init` — links this directory to an EAS project (writes
   `extra.eas.projectId` into `app.json`; commit that change).

Builds:

```sh
eas build --profile preview --platform ios      # internal/ad-hoc build
eas build --profile production --platform ios   # App Store build
```

On the first iOS build, EAS CLI prompts for the Apple ID / Team ID and can
generate and manage the distribution certificate and provisioning profile
automatically.

Submission to TestFlight / App Store Connect:

```sh
eas submit --platform ios --latest
```

Then in [App Store Connect](https://appstoreconnect.apple.com): create the app
record (matching bundle ID), fill in the privacy questionnaire (no data
collected — all processing is on-device), add screenshots, and promote the
TestFlight build to review.

## Use

1. **Photo** — take a photo (Camera), choose one (Library), or load the
   bundled sample wall.
2. **Pick the route color** — tap any hold of the route in the photo; a 5×5
   patch around the tap is averaged.
3. **Tune** — hue tolerance, shade tolerance (chalk/shadows), minimum hold
   size; toggle wall lines and their detail level.
4. **Save PNG / Share** — writes the sketch to Photos or opens the share
   sheet.
