<!-- shipyard:survey -->
# Shelfie

A Next.js app for a small book club: members log books, rate them and vote on the next pick.

## Who it is for
Members of one book club.

## Repository
https://github.com/example/shelfie

## Already in the folder
- CLAUDE.md
- .claude/settings.json

## Tech stack
- Next.js 15 (App Router)
- Prisma with SQLite
- NextAuth (GitHub)
- Vitest, Playwright

## Commands
- Install: `pnpm install`
- Run: `pnpm dev`
- Test: `pnpm test`
- Build: `pnpm build`

## Features
- [x] Log a book: members add a book they read
- [x] Ratings: 1 to 5 stars per member
- [ ] Vote on the next pick: the voting page exists, no results view yet

## Conventions
- Server actions live next to the page that uses them

## Known issues
- The rating stars do not work with the keyboard

## Next steps
- [ ] Show vote results after the deadline
