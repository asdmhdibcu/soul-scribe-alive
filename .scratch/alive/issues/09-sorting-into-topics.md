# 09: Sorting moments into topics

**What to build:** After each capture, the AI files the moment into topics (worry, project, person, idea, hope), matching existing topics when it is the same situation, and tags it work or life. Every topic carries a verbatim quote; quotes not found word-for-word in the moment are dropped. Topics go quiet after 14 days without a mention. Runs in the background and never blocks capture.

**Blocked by:** 04, 08

**Status:** done

- [ ] Two moments about the same situation in different words produce one topic with mention count 2
- [ ] Every stored quote appears verbatim in its source moment
- [ ] Each moment is tagged work or life
- [ ] A topic unmentioned for 14 days shows as quiet
- [ ] No health or medical inference is stored
- [ ] No due date, completed flag, priority or checkbox exists on topics
