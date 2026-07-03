# Per-Subject AI Roadmaps + Calendar Integration — Progress

## What was asked
- Link AI roadmap to Calendar; give roadmaps a start date and end date.
- Dashboard: short description + expandable box with full detail.
- Clicking a Calendar day should open Dashboard showing that day's plan.
- Show roadmaps for ALL subjects, not just one.
- Allow adding topics under a subject (e.g. exam topics) and generate a roadmap scoped to just those topics.
- Calendar day view: brief "what to study today" hint, not full detail.

## What's done

1. **Data model** (`src/services/geminiService.ts`, `src/services/firestoreService.ts`)
   - Roadmap now carries `subjectId`, `subjectName`, `topicTags`, `startDate`, `endDate`.
   - Fixed a bug where generated sessions always saved `subjectId: ''`.
   - Added `getLatestRoadmapsBySubject()` — one latest roadmap per subject instead of one global roadmap.

2. **Context layer** (`src/context/StudyDataContext.tsx`)
   - Added `roadmapsBySubjectId` (map) and `legacyRoadmaps` (old-format docs) alongside the existing singular `roadmap`.
   - `deleteSubject` now only removes that subject's own roadmap, not all roadmaps.

3. **Roadmap generator** (`src/pages/RoadmapGenerator.tsx`)
   - Generates one roadmap per subject (fan-out) instead of one merged roadmap.
   - Added a Start Date field next to Exam Date.
   - Added optional per-subject "focus topics" tag input to scope a roadmap to specific topics.

4. **Dashboard** (`src/pages/Dashboard.tsx`)
   - Right column now shows one card per subject: short description + collapsible "Show full plan" detail.
   - Reads `?subjectId=` and `?date=` from the URL to auto-expand/highlight a subject and show a "Focus for [date]" callout.

5. **Calendar** (`src/pages/StudyCalendar.tsx`)
   - Each day cell shows a brief study hint on hover (tooltip).
   - Selected day panel has a "View in Dashboard" button linking to `/dashboard?subjectId=...&date=...`.

## Verified so far
- `npx tsc --noEmit` — clean.
- `npm run build` — clean production build.

## Not done yet
- **Live browser verification** — this app has no local Firebase emulator, so testing the actual click-through flow would sign in/create data against the real production Firebase project. Paused here pending your call on how to verify (existing test account / throwaway account / skip).
