# Field notes: the Applying Gravity music video (2026-10-12)

From the `applying-gravity` Claude session (Remotion + three.js, code-rendered 3D). Nothing
private. These are real requests a creator made in plain words, and the camera term each one
maps to. Use them as [F] examples in the module (what people say vs. what to say), not as
sourced facts about film craft.

## What the user said -> the term
| Plain words | Term |
|---|---|
| "zoom shot to the spinning globe, then zoom back out" | push-in / dolly-in to an insert, then pull-out |
| "cut away to the far view way too soon, stay on the blackboard for the whole phrase" | hold the shot; cut on the phrase, not mid-phrase |
| "big camera cuts on each word, 3/4 angle closer view" | cut on the beat; three-quarter angle; medium close-up; shot-per-word montage |
| "close and then quick zoom out" | crash zoom / fast pull-out; reveal |
| "camera angle from the floor looking up" | worm's-eye / low-angle shot |
| "quick pan to rosie/ada" | whip pan |
| "slow motion and more zoomed in so it is more dramatic" | slow motion (time remap) + tighter shot size (CU/ECU) |
| "sweeping around it, zooming in and out" | orbit / arc shot, with push-in and pull-out |
| "feels static", "boring camera wise" | locked-off wide held too long; needs coverage and motivated moves |
| "hold the last scene for a couple more seconds" | hold on the final frame (tail) |
| "jittery/bouncy" | un-eased motion; ease-in / ease-out |

Not camera terms, but users describe them as camera problems: "flashy artifacting" (z-fighting,
a render bug), "characters slide around" (foot sliding).

## Misunderstandings and the fix
- "Zoom" is ambiguous: a lens/FOV change, or the camera moving closer. The user usually means
  "get closer". Push-in (dolly) and zoom look different: a dolly changes the parallax; a zoom
  only magnifies (a crop). Correction from brief D1: a zoom does not itself "flatten"; it looks
  flatter than a push-in to the same framing only because the camera stayed farther away.
- "Cut to X" vs. "move to X": ask "hard cut or camera move?"
- Shot timing in a music video ties to lyric phrases, words and beats.
- "Slow motion" in a sync-bound video: the action must still land on its beat, so the time
  comes from elsewhere: a speed ramp.

## What different pipelines can make
- Code-rendered 3D (three.js in Remotion): any virtual camera (position, target, FOV keyframes,
  cuts, eased moves, orbits, whip pans, shake, speed ramps). No real optics: depth of field and
  rack focus need a post effect.
- Stills (AI images) in Manim: Ken Burns pans and zooms on a still.
- AI video generation: one continuous shot per generation; cuts happen in the edit.

## AI video prompts vs. real cameras (the session's experience; check against sources)
- "Zoom" in a prompt usually gives a push-in; on a real camera it is a focal-length change.
- "Slow motion" in a prompt is a style word; in production it is frame rate or time remap.
- "Cut" inside one prompt rarely works.
- Dolly zoom, orbit, crane: reliable in 3D code; generators approximate them loosely.
- Shot-size words (close-up, wide) work in both.
