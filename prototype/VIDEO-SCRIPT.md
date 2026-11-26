# 60-second screencast — click path

The brief: **max 1 minute**, the running application. Without the video the high-fidelity mark is lost (−35).

## Before recording

1. `cd prototype`, `npm run dev`, open http://localhost:5173 in Chrome or Edge.
2. Press **F12 → device toolbar (Ctrl+Shift+M) → 390 × 844** so it looks like a phone. Close the DevTools panel itself if your recorder captures the whole window, or record only the page area.
3. Log in as Director (1234) → Settings → Demo data → **Reset demo data** (fresh data, and the light switch counter starts again). You are back on the login screen.
4. Recorder: Bandicam or Xbox Game Bar (**Win + Alt + R** starts/stops). Practise the path once; total ≈ 55 s.

## Path

| Time | Do | Say / caption (optional) |
|---|---|---|
| 0–6 s | Director → type **1234** → home | "Director logs in with a PIN." |
| 6–14 s | Point at House 2's **red "Too hot"** reading; tap **Turn on** on House 2 → "Switching…" → **Lights ON** | "Live temperature and humidity per house; alert outside the range. Lights switched remotely, with confirmation." (FR-07, FR-08) |
| 14–22 s | **Log death** → **Save** → **Save** again → amber **Possible duplicate — not counted twice** | "A death logged twice is flagged, not double counted." (FR-01) |
| 22–34 s | Back → **Slaughter** → **Start tonight's session** → count **1100** → **Record count** → big **Pay the crew** figure; New count **1080**, note "recount" → **Save correction** → history shows both | "Head count gives the crew's pay at once; a recount is a correction with a note." (FR-04, NFR-04) |
| 34–46 s | **Bazaar weights cross-check →** → agent **2376** → Save → **PENDING** (Record sale disabled) → representative **2376** → Save → **MATCH** → **Record sale** | "No sale from one unconfirmed figure; only a match records it." (FR-05) |
| 46–53 s | Back, Back → **Batch profit** → tap **House 2** tile | "Profit per batch, each house on its own schedule." (FR-03) |
| 53–60 s | Back → **Log out** → Worker 1 → **1111** → home (no money, two actions) | "Workers see no costs or profit." (NFR-03) |

If there is time to spare, swap the profit step for **Expense entry → Fill the form by voice → tap "Kecha veterinarga 150 ming, dori uchun"** (FR-06).

## After recording

- Check it is ≤ 60 s. Upload (YouTube unlisted / Google Drive "anyone with the link") and put the link in the vault's STATUS.md and in the report.
- The light switch: each page load, the **4th** command returns "Not confirmed" on purpose (FR-08 edge case). Reset or reload before recording so the first toggles confirm.
