<!-- shipyard:survey -->
# Tide Log

A small web app for logging surf sessions with the tide and swell at the time.

## Who it is for
Surfers who want to see which conditions suit their home break.

## Repository
https://github.com/hunter/tide-log

## Tech stack
- TypeScript
- React with Vite
- IndexedDB through idb-keyval

## Commands
- Install: `npm install`
- Run: `npm run dev`
- Test: `npm test`
- Build: `npm run build`

## Features
- [x] Log a session: date, spot, board and a rating out of five
- [x] Session list: newest first, filtered by spot
- [ ] Tide lookup: fills in the tide height from a free tide API
- [ ] Charts: rating against swell size

## Data model
- Session: id, date, spot, board, rating, notes
- Spot: id, name, latitude, longitude

## Conventions
- Components live in src/components, one per file
- Tests sit next to the file they test, as name.test.ts

## Known issues
- Ratings reset on reload: the rating is saved before the session is, so a reload loses it
- The spot filter ignores spots with capital letters

## Next steps
- [ ] Fix the rating being lost on reload
- [ ] Add the tide lookup behind a feature flag
