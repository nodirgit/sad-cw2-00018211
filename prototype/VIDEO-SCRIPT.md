# 60-second screencast on a phone — set-up and click path

The brief: **max 1 minute** of the running application. Without the video the high-fidelity mark is lost (−35).
The app is built phone-first, so it is recorded on a real phone.

## 1. Start the app on the laptop

1. PowerShell: `cd D:\SAD_CW2\prototype` → `npm run dev`.
2. Read the **Network:** lines it prints. Several may show (VPN, virtual adapters); use the one that starts with **`192.168.`** — the home Wi-Fi — e.g. `http://192.168.1.19:5173`. The `Local:` one only works on the laptop.
3. If Windows Firewall asks about Node.js, allow it on **private** networks only.

## 2. Open it on the phone

1. The phone must be on the **same Wi-Fi** as the laptop.
2. Open the Network URL in Chrome (Android) or Safari (iPhone).
3. Optional, looks cleaner: browser menu → **Add to Home screen**, then open it from the home screen icon (full screen, no address bar).
4. **Voice does not work on the phone** (the browser blocks the microphone on plain `http`), so the path below does not use it.

## 3. Before each take

1. Log in with **1234** → **Profile** (bottom bar) → **Demo data** → **Reset demo data**. You are back on the login screen with fresh data, and the light switch counter starts again (every 4th light command fails on purpose to show FR-08's "Not confirmed").
2. Start the screen recorder:
   - Android: pull down quick settings → **Screen record** (no audio needed).
   - iPhone: Control Centre → **Screen Recording** (add it in Settings → Control Centre if missing).
3. Practise the path once before the real take.

## 4. Path (≤ 55 s)

Measured at a steady pace on a 390 × 844 screen: **about 39 s**; with the phone keyboard opening and closing, expect 50–55 s. Do not rush the two moments that matter: the duplicate warning and MATCH.

| Time | Do | What it shows |
|---|---|---|
| 0–4 s | Type **1234** | PIN login, the PIN alone says who you are (NFR-03) |
| 4–10 s | Point at House 2's red **Too hot**; tap **Turn on** on House 2 → "Switching…" → **Lights ON** | Live climate with an alert outside the house's range (FR-07); remote light with confirmation (FR-08) |
| 10–16 s | On House 1 tap **+ Death** → **Save** → **Save** again → amber **Possible duplicate — not counted twice** | A death reported twice is not double counted (FR-01) |
| 16–29 s | **Slaughter** (bottom bar) → **Start tonight's session** → count **1100** → **Record count** → **Pay the crew** figure; New count **1080**, why **recount** → **Save correction** | Head count gives the crew's pay at once; a recount is a correction with a note, history kept (FR-04, NFR-04) |
| 29–43 s | **Bazaar weights cross-check →** → agent **2376** → **Save** → **PENDING** (Record sale disabled) → representative **2376** → **Save** → **MATCH** → **Record sale** | No sale from one unconfirmed figure; only a match records it (FR-05) |
| 43–55 s | **Profile** → **Log out** → type **1111** → Worker's Main | A worker sees no money: only Main and Profile in the bottom bar, two actions (NFR-03) |

Batch profit, expenses, partners and settings are **not** in the video; they are in the report's screenshots.

## 5. After recording

1. Trim to **≤ 60 s** (Android: Photos/Gallery → Edit → Trim; iPhone: Photos → Edit → drag the ends).
2. Name the file `SAD_CW2_00018211_video.mp4` and copy it to `D:\SAD_CW2\submission\materials\` (the folder is not in git; videos never go into git).
3. It is uploaded with the other materials to Google Drive ("anyone with the link can view"); the link goes into the report.
