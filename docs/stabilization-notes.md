# Stabilization Notes — 2025-05-30

## What was broken

The Law Detail page's "Structured Rule" section was invisible when `structuredText` was empty or null. This happened for LawSource records that were promoted before the `buildLawSourceFromCandidate` helper was added, or for seed records that never had structured data.

The section used a conditional render (`{structuredObj && ...}`) which silently hid the entire block when there was no data, giving the impression that the page was broken or missing content.

## What was investigated

- `refresh-from-candidate` endpoint: confirmed it only updates `summary` and `structuredText`. It does NOT overwrite `sourceUrl`, `jurisdictionId`, `lawCategoryId`, or `verificationStatus`. No bug here.
- `sourceUrl` on promoted records: confirmed all Seattle LawSource records retain their correct specific URLs (`/laborstandards/ordinances/minimum-wage`). No bug here.
- Multiple Seattle LawSource records exist (one from seed, one from early promotion, one from later promotion). This is expected — no data was deleted or merged.

## What was changed

**`client/src/pages/LawDetailPage.tsx`**
- The "Structured Rule" section now always renders.
- If `structuredText` is present and parseable, it displays as formatted JSON.
- If `structuredText` is empty/null, it shows: *"No structured rule recorded."*

## Files changed

- `client/src/pages/LawDetailPage.tsx` — 2-line conditional render fix
- `docs/stabilization-notes.md` — this file

## What was intentionally NOT changed

- Crawler logic (refiner, content-assessor, url-checker)
- Candidate promotion logic
- Refresh-from-candidate logic
- Database schema
- Seed data
- Matrix behavior
- Backend endpoints
- No data was repaired, deleted, or merged
