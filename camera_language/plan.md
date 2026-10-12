# Say the shot: camera language for directing AI-made video

Status: approved by the user on 2026-10-12 (with a taste section added; answers below).

## Purpose
- Kind: practical (a skill with no code to read; pictures and clips carry the teaching). Some
  short code snippets (three.js camera values) appear as examples, typed into the prose, not
  `kit.py excerpt` (there is no source repo).
- Reader: a creator who makes videos with an AI assistant (Claude writing code-rendered 3D, or
  an AI video generator), with no film-school background. They know what they like when they
  see it, but say "make it more dramatic" or "zoom to the globe".
- Main expression: code-rendered 3D (a virtual camera in three.js / Remotion, Blender, Unreal).
  Second: AI video generators. Live filming counts where the technique carries over (shot
  sizes, angles, composition, continuity, cutting).
- After the module the reader can:
  1. name a shot by size, angle and move ("medium close-up, low angle, slow push-in");
  2. tell apart the pairs people mix up: zoom vs push-in, pan vs truck, tilt vs Dutch, orbit vs
     pan, OTS vs POV, hard cut vs camera move;
  3. say what each move does to a 3D camera (position, target, field of view) and spot the
     `lookAt` truck trap;
  4. ask for timing: hold, ease in/out, cut on the beat or the phrase, speed ramp under sync;
  5. write a shot list or a review note that an AI (or a crew) can act on without guessing,
     and fit it to the pipeline (code 3D, AI generator, live).

## Sources
- Research brief `research/brief.md` (40 sources [S#], accessed 2026-10-12; D1-D11).
  Research depth per the new skill rule: stable film grammar is model knowledge [M]; tool and
  API facts, disputed points and music-video practice are fetched and cited.
- Field notes `research/field_notes.md` [F]: real plain-word requests from a music-video
  project and the term each one maps to. Used as "what you said / what to say" examples.
- `META.source`: "Film terms: common practice. Tools: three.js, Remotion, Blender, Unreal docs;
  Veo, Runway, Kling, Luma, MiniMax prompting guides; accessed October 2026." A "Sources" list
  at the end links the fetched sources.

## The running example: a tiny 3D stage
Every picture and clip is drawn by one small 3D renderer in `module.js` (a pinhole camera:
position, target, FOV, roll; projects a few primitives into SVG). So the clips *are*
code-rendered 3D, with the same parameters the module teaches. Clips show two panes side by
side: a **top-down map** (camera icon, its view cone, the target) and the **camera view**.
- The set: a singer (low-poly mannequin: sphere head with a face mark, thick-line limbs, so it
  reads from any angle), a mic stand, a globe on a stand, three posts at different depths (to
  make parallax visible), a floor grid.
- Colours: kit rules. In clips, identity hues blue (camera), orange (singer), aqua (props); yellow
  only for "look here now". In pictures: ink/paper/muted, no yellow or blue.

## Outline (about 50 min, 8 sections; META says 75 min after the 1.5x padding rule)

| # | Section | Key idea | Rich elements | Checks (kind) |
|---|---------|----------|---------------|---------------|
| - | Intro: "make it look cool" | An AI cannot read your mind; it reads words. A shot = size + angle + move (+ timing). Real requests from the Applying Gravity punch list [F]. | pic `brief` (vague note vs. shot note) | - |
| 1 | Size and angle | Where the frame cuts the body: extreme wide/establishing .. ECU; cowboy (D2); insert vs. cutaway; two-shot, single. Camera height against the eyes: eye level, high, low, top-down, worm's-eye; Dutch = roll, not tilt (D5); OTS vs POV. Low = power is a convention (D10). [M][S11][S25][S32] | pic `shot_sizes` (Ada at 7 sizes, from the 3D stage); pic `angles` (5 views) | match plain words -> size (match); "floor looking up" (choice) [F]; OTS or POV (choice) |
| 2 | Moves 1: turn the camera or move it | Pan/tilt/roll rotate in place: no parallax. Truck/pedestal/push-in move the camera. Term -> position/target/FOV table [D]. The `lookAt` truck trap. [S1][S2][S27][S28] | clip `moves` (~40 s: pan, truck, orbit, crane; map + view); table | pan vs truck (choice); `lookAt` trap (choice); match move -> what changes (match) |
| 3 | Moves 2: zoom is not a push-in | Zoom = FOV only (a crop). Push-in moves the camera. Dolly zoom; crash zoom; whip pan. Ask "zoom or push in?" (D4). [S1][S11][S22][S23][S33][F] | clip `push_vs_zoom` (~35 s) | which one (choice); dolly zoom (choice) |
| 4 | Lens, focus and depth | Focal length <-> FOV; three.js `fov` is vertical; compression comes from distance (D1); DOF, f-stop, rack focus (post effect in three.js); 16:9 -> 9:16 trap. [S1][S3][S20-S22][S37][S38] | pic `compression`; pic `aspect` | background big (choice); which three.js value (choice) |
| 5 | Composition and continuity | Thirds, headroom, lead room; 180- and 30-degree rules (guidelines); coverage (V strategy); "hard cut or camera move?" [M][S29][S30][S39][F] | pic `line_180`; pic `thirds` | which camera breaks the line (choice); order a coverage plan (order) |
| 6 | Time: holds, easing, slow motion | Hold and tail; linear vs ease vs spring; every value from the frame (Remotion); slow motion under sync = slow scene time, song stays real time (speed ramp); live: play the track faster on set. Shutter 180 / motion blur. [S4][S5][S8][S9][S10][S31][S35] | clip `easing` (~20 s) | slow-mo in a lip-synced 3D video (choice); "jittery" note (choice) [F]; Remotion flicker (choice) |
| 7 | Taste: how long a shot lasts, and what looks good | Measured: Hollywood average shot length fell from about 10 s (1930s-40s) to under 4 s after 2000; shorter shots carry more motion [T1]. Close-ups can be cut shorter than wide shots: the eye needs time for detail [T2][T3]. A studied pop video: shots of about 2 s [T3]. Music video: hold in verses, cut faster into the chorus, not every beat [S34]. Murch: a cut serves emotion first, then story, then rhythm [T5]. YouTube: the first 30 s and the dips [T6]. Craft habits marked as taste [M]: vary size and motion, contrast long/short, give the eye one place to land, one idea per shot, move with a reason, hold on the peak. Starting-point shot lengths per style (table; sourced numbers tagged, the rest marked [M]). | clip `rhythm` (~35 s: one chorus cut three ways: every beat, too slow, phrase-led with varied sizes; timeline + thumbnails); shot-length table | which edit fits the chorus (choice); close-up vs wide hold (choice); match style -> starting shot length (match) |
| 8 | Writing the brief | Shot card: size, angle, move, subject, duration, how it starts and ends (cut / move / hold), why. Per pipeline: code 3D; AI generators (plain words, one move per shot, positive phrasing, short clips, start simple; vendor syntax; Sora removed 2026-09-24); live. Review notes that work: "what you said -> what to say" [F]. [S11-S19][F] | diagram `pipelines`; pic `shot_card`; [F] table | best prompt (choice); rewrite a vague note (choice); match pipeline -> can / cannot (match) |
| - | Review quiz | | | 8 items + score summary; glossary list; Sources |

### Clips (all mini-3D, map + view panes; every frame a pure function of t)
| Clip | Scenes | Teaches |
|---|---|---|
| `moves` ~40 s | pan (posts keep their order), truck (near posts slide past far ones), orbit (camera circles, target fixed), crane (rise, target fixed so it tilts) | rotate vs move; parallax |
| `push_vs_zoom` ~35 s | push-in (camera moves; background shifts), zoom (cone narrows; a crop), dolly zoom (singer size held, background grows) | the most common mix-up [F] |
| `easing` ~20 s | three push-ins run together: linear, ease-in-out, spring; a speed-over-time trace for each | "jittery" vs smooth; ask for easing |
| `rhythm` ~35 s | one chorus on a timeline (beat ticks, lyric phrases): cut on every beat ✗ (tiring), held too long ✗ (static), phrase-led with varied sizes ✓; then a slow-motion shot whose speed ramp lands the next cut on its beat | cut timing; taste; speed ramp under sync |

## Review quiz (8 items)
1. Background big and close behind the singer: camera far back + narrow FOV (choice) [S20][S22]
2. Code moves `camera.position.x` and calls `lookAt(singer)`: truck plus pan (choice) [S2][D]
3. Match plain-word notes [F] to terms: "floor looking up" / "quick pan to" / "sweeping around
   it" / "stay on it for the whole phrase" (match)
4. Best AI-generator prompt (choice) [S13][S15][S16]
5. Dolly zoom: what moves, what changes (choice) [S33]
6. Two-person scene, second camera crosses the line: what the viewer sees (choice) [S30]
7. Order a shot card's fields as a director writes them (order) [M]; or a 16:9 -> 9:16 `fov`
   question (choice) [S1], whichever reads better when built
8. Slow motion in a lip-synced 3D video (choice) [S5][D]

## Accuracy
- Model knowledge [M] covers stable film grammar only. Everything about tools, APIs, vendors
  and disputed points cites [S#] from the brief. [D] maths (FOV table, dolly zoom) is shown as
  maths, not as a quote.
- Disagreements shown as "sources differ" boxes or one-line notes: D1 compression (follow ASC),
  D2 cowboy shot, D3 dolly/track/truck (module: push in/pull out, truck, tracking), D4 zoom,
  D11 cutting to the beat (low-authority sources, said in the text).
- Vendor facts are labelled with the vendor ("Veo's guide says..."). Sora: past advice only;
  removed 2026-09-24 [S14]. No promise that any generator obeys a term.
- Advice with no fetched source is marked as advice, not fact: "motivate every move", handles,
  "protect a 9:16 centre". Kept out: Shorts safe-area numbers, "clean audio matters more",
  "low angle always means power", "cut on every beat".
- Field-notes correction: a zoom does not "flatten" by itself (D1); the module says why.

## Taste sources (fetched 2026-10-12, added after the brief)
- T1 Cutting, DeLong, Brunick et al., "Quicker, faster, darker: Changes in Hollywood film over
  75 years", i-Perception 2011, https://pmc.ncbi.nlm.nih.gov/articles/PMC3485803/ (high: peer
  reviewed). ASL about 10 s in the 1930s-40s, below 4 s after 2000; 160 films; recent films:
  shorter shots have more motion (r = -.46); moving-camera share fell 16% (1959) -> 6% (1999).
- T2 "Home Movies" (1944), Ver Halen, https://lantern.mediahist.org/catalog/homemovies194411verh_0067
  (old practitioner guide): "Closeups can be cut to shorter lengths than long shots"; the eye
  needs time for the detail in long shots.
- T3 Perez Rufi & Rodriguez Lopez, Doxa Comunicacion 25 (2017), analysis of one pop music video
  (https://doaj.org/article/81ae4b0f49464cc59acb7565f5d65055): typical shot about 2 s; closer
  framings, shorter shots. One video: illustrative only.
- T5 StudioBinder, "Walter Murch's Rule of Six", https://www.studiobinder.com/blog/walter-murch-rule-of-six/
  (industry education, summarising Murch, In the Blink of an Eye): emotion, story, rhythm, eye
  trace, 2D plane, 3D space, in order; emotion "over 50%".
- T6 YouTube Help, "Measure key moments for audience retention",
  https://support.google.com/youtube/answer/9314415 (official): intro = share still watching
  after 30 s; dips = leaving or skipping; move compelling content earlier.
- Not used (unverified): exact Murch percentages beyond "over 50%"; Bordwell's decade ASLs from a
  student page; any "ideal YouTube shot length" number.

## Decisions at approval (2026-10-12)
1. Cast: the Applying Gravity cast and set (Ada in green, Rosie in pink, toy capsule style;
   chalkboard, chalk globe, pumpkin, stage). Drawn by the module's own SVG 3D renderer; no files
   copied from that project. The project may be named.
2. Public module (tracked, may be published later on request).
3. 8 sections, 4 clips: fine. Added: the taste section (7). Sizes and angles merged into one
   section to stay at 8.
4. The user approved building while away; stop before delivery for the human clip review.

## As built (2026-10-12)
- 8 numbered sections plus intro and review; 30 checks (24 choice, 5 match, 1 order); 8 pictures;
  1 diagram (`pipelines`, 4 flows); about 390 KB.
- The set is the Applying Gravity classroom, not the singer/mic/posts stage in the outline:
  Ada, Rosie (with pumpkin), chalkboard ("g = 9.8 m/s²" and a chalk drop), globe, pendulum,
  bench and stool. The bench (near) and board (far) carry the parallax.
- Clips: `moves` 51 s (pan, truck, lookAt trap, orbit, crane), `push_vs_zoom` 46 s (push-in,
  zoom, side by side, dolly zoom), `easing` 25 s (linear, ease in-out, spring, with a plot),
  `rhythm` 53.5 s (every beat, one hold, phrase-led, then a x1 / x0.25 / x1 speed ramp).
  Longer than the outline's ~2 min total (about 3 min); each scene has its own caption.
- Review quiz as built: plain-word notes -> terms, tilt vs Dutch, parallax (pick all), default
  fov, positive prompt wording, 180-degree shutter, hard cut vs move, Murch's first rule.
  Several outline items moved into the section checks instead.
- `pic shot_card` was folded into the shot-list table in section 8.
- `kit.py check`: no warnings, light and dark (`--reveal --theme dark`). Clips: waiting for
  the human review.
