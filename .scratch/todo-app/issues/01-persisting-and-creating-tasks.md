# 01: Persisting and creating tasks

**What to build:** A user can add a task from a minimal, responsive Korean-language screen and see it in the list. Tasks persist in the configured libSQL database.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The database connection is read from local runtime configuration; no credentials are committed.
- [ ] A task can be added with Enter or the add button, and remains available after reloading the app.
- [ ] Leading and trailing whitespace is removed; blank or whitespace-only titles are not created.
- [ ] Duplicate titles are allowed as separate tasks, and the newest task appears first.
- [ ] The initial list has no sample tasks and shows a useful empty state.
- [ ] The screen is usable on mobile and desktop.
