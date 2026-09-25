# 07: Offline capture

**What to build:** Captures made while offline are queued in IndexedDB and uploaded when the connection returns, with a small "saved locally, syncing" indicator.

**Blocked by:** 04

**Status:** done

- [ ] Capturing in airplane mode succeeds and shows the syncing indicator
- [ ] On reconnect the queued moments upload and the indicator clears
- [ ] Nothing is lost if the app is closed while offline
