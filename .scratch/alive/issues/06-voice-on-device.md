# 06: Voice capture transcribed on the device

**What to build:** Tap to start, tap to stop voice recording with no time limit, a timer and a waveform. The audio is transcribed on the device (in-browser Whisper, CPU fallback on iPhone), language auto-detected. The moment saves immediately; the encrypted transcript is added when ready. If transcription fails, the audio is kept. All browser SpeechRecognition code is removed, including from the session screens.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] A 3-minute recording with the phone untouched on a table produces a transcript on iPhone Safari
- [ ] No onPointerDown/onPointerUp or cancel-on-leave recording
- [ ] Audio is never deleted because transcription failed
- [ ] No reference to SpeechRecognition or webkitSpeechRecognition remains
- [ ] Audio never leaves the device unencrypted
