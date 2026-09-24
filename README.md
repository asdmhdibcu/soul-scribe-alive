# Alive: Your Digital Legacy

Create a full stack app called ALIVE 

using React, Supabase, and Tailwind.

First create all Supabase tables:

users:

- id, name, email, avatar_url

- timezone, reminder_time

- streak, longest_streak

- total_sessions, time_credits

- level, coins, plan

- created_at

diary_entries:

- id, user_id, date, title, content

- mood_color, mood_x, mood_y

- energy_level, life_area

- ai_tone, session_intent

- cards_swiped (jsonb)

- photos (jsonb array of urls)

- voice_transcript

- one_answer

- ai_insight, ai_pattern

- tomorrow_plan (jsonb)

- focus_word, one_thing

- coins_earned

- is_private, price

- created_at

photos:

- id, entry_id, user_id

- url, ai_description

- people_detected, location_context

- emotion_context, created_at

family_members:

- id, parent_id, child_id

- role, voice_style, warmth_level

- topics (jsonb), availability

- created_at

child_profiles:

- id, parent_id, name, age

- avatar, age_group

- mood_sharing_enabled

- private_mode

- created_at

child_entries:

- id, child_id, date, title

- content, mood_stars

- mood_emoji, cards_swiped (jsonb)

- photos (jsonb), voice_transcript

- mission, coins_earned

- created_at

legacy_letters:

- id, author_id, child_id

- title, content, open_at_age

- open_at_date, is_opened

- created_at

family_capsules:

- id, family_id, year

- entries (jsonb), created_at

marketplace:

- id, entry_id, seller_id

- price, is_available

- sales_count, created_at

transactions:

- id, buyer_id, seller_id

- entry_id, amount

- platform_fee, created_at

coins_history:

- id, user_id, amount

- reason, created_at

achievements:

- id, user_id, badge_name

- badge_icon, earned_at

Enable Supabase storage bucket 

called "alive-media" for photos 

and voice recordings.

Enable Row Level Security on all tables.

Users can only access their own data.

Global design system:

- Background: #0A0A0F

- Card: #16161F  

- Border: rgba(201,168,76,0.15)

- Gold: #C9A84C

- Gold Light: #F0C96A

- Font Display: Playfair Display

- Font Body: Georgia, serif

- Border radius: 14px

- Dark premium feel throughout

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://soul-scribe-alive.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e0d16f57-ccea-403c-a921-9edea1db57b7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
