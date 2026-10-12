# Research brief: camera language for directing AI-made video

Date: 2026-10-12. Scope (per the user's last change): AI video prompting guides, virtual cameras
in code-rendered 3D, disputed points, music-video practice, sourced best practices. Stable film
vocabulary (shot sizes, angles, basic moves, composition, lighting, editing) is written by the
main session from model knowledge and marked [M]. Where this brief already had a fetched source
for such a term, it is listed in S40 (no extra fetches were made for them).

Tags: [S#] = fetched source. [M] = model knowledge, not checked here. [D] = derived by me from
the cited docs (maths or API semantics); check before stating as a quote.
Companion file: `research/field_notes.md` (real user requests, [F]). Do not edit it from here.

## 1. Sources

All accessed 2026-10-12.

| # | Title | URL | Authority |
|---|---|---|---|
| S1 | three.js `PerspectiveCamera.js` (doc comments + code), `dev` @ 2a8cd87 | https://github.com/mrdoob/three.js/blob/dev/src/cameras/PerspectiveCamera.js | official (source) |
| S2 | three.js `Object3D.lookAt`, `BokehPass.js` doc comments, `dev` @ 2a8cd87 | https://github.com/mrdoob/three.js/blob/dev/examples/jsm/postprocessing/BokehPass.js | official (source) |
| S3 | Blender 5.2 Manual: Cameras | https://docs.blender.org/manual/en/latest/render/cameras.html | official |
| S4 | Blender Manual: F-Curve properties (Active Keyframe, interpolation, easing) | https://docs.blender.org/manual/en/latest/editors/graph_editor/fcurves/properties.html | official |
| S5 | Blender Manual: Frame Range / Time Stretching; Cycles Motion Blur | https://docs.blender.org/manual/en/latest/render/output/properties/frame_range.html ; .../render/cycles/render_settings/motion_blur.html | official |
| S6 | Unreal Engine 5.8: Cinematic Cameras (Cine Camera Actor) | https://dev.epicgames.com/documentation/en-us/unreal-engine/cinematic-cameras-in-unreal-engine | official |
| S7 | Unreal Engine 5.8: Camera Shakes | https://dev.epicgames.com/documentation/en-us/unreal-engine/camera-shakes-in-unreal-engine | official |
| S8 | Remotion docs: The fundamentals; Sequence; Flickering | https://www.remotion.dev/docs/the-fundamentals ; /docs/sequence ; /docs/flickering | official |
| S9 | Remotion docs: interpolate(); Easing; spring() | https://www.remotion.dev/docs/interpolate ; /docs/easing ; /docs/spring | official |
| S10 | Remotion docs: @remotion/three; CameraMotionBlur; noise2D | https://www.remotion.dev/docs/three ; /docs/motion-blur/camera-motion-blur ; /docs/noise/noise-2d | official |
| S11 | Google Cloud: Video generation prompt guide (Veo) | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/video-gen-prompt-guide | vendor |
| S12 | Google AI for Developers: Generate videos with Veo 3.1 (prompt guide section) | https://ai.google.dev/gemini-api/docs/veo | vendor |
| S13 | OpenAI Cookbook: Sora 2 Prompting Guide ("Updated - March 2026", marked archived) | https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide | vendor (archived) |
| S14 | OpenAI API: Deprecations (2026-03-24 entry: Sora 2 + Videos API) | https://developers.openai.com/api/docs/deprecations | vendor |
| S15 | Runway Academy: Prompting Guide (Gen-4.5) | https://academy.runwayml.com/prompt-guide | vendor |
| S16 | Kling AI: Camera Control guide (2026-08-13) | https://kling.ai/blog/kling-ai-camera-control-video-guide | vendor |
| S17 | Kling AI: Prompt Guide (2026-08-07) | https://kling.ai/blog/kling-ai-prompt-guide | vendor |
| S18 | Luma: Dream Machine API, Video Generation | https://docs.lumalabs.ai/docs/video-generation | vendor |
| S19 | MiniMax API: Create Text-to-Video Generation Task (Hailuo) | https://platform.minimax.io/docs/api-reference/video-generation-t2v | vendor |
| S20 | J. Holben, "Understanding Lens Distortion", ASC (2024-09-20) | https://theasc.com/article/understanding-lens-distortion/ | high |
| S21 | V. Renée, "The Lens Compression Myth", No Film School (2018-05-27) | https://nofilmschool.com/2018/05/lens-compression-myth-whats-really-happening-your-images-when-you-switch-focal-length | industry education |
| S22 | Wikipedia: Perspective distortion | https://en.wikipedia.org/wiki/Perspective_distortion | secondary |
| S23 | Wikipedia: Zooming (filmmaking) | https://en.wikipedia.org/wiki/Zooming_(filmmaking) | secondary |
| S24 | Wikipedia: Cowboy shot | https://en.wikipedia.org/wiki/Cowboy_shot | secondary |
| S25 | StudioBinder: Guide to Camera Shots (2026) | https://www.studiobinder.com/blog/types-of-camera-shots-sizes-in-film/ | industry education |
| S26 | Wikipedia: Shot (filmmaking) | https://en.wikipedia.org/wiki/Shot_(filmmaking) | secondary |
| S27 | Wikipedia: Tracking shot | https://en.wikipedia.org/wiki/Tracking_shot | secondary |
| S28 | StudioBinder: Types of Camera Movements | https://www.studiobinder.com/blog/different-types-of-camera-movements-in-film/ | industry education |
| S29 | Wikipedia: 30-degree rule | https://en.wikipedia.org/wiki/30-degree_rule | secondary |
| S30 | Wikipedia: 180-degree rule | https://en.wikipedia.org/wiki/180-degree_rule | secondary |
| S31 | Wikipedia: Rotary disc shutter (shutter angle) | https://en.wikipedia.org/wiki/Rotary_disc_shutter | secondary |
| S32 | Wikipedia: Tilt (camera); Dutch angle | https://en.wikipedia.org/wiki/Tilt_(camera) ; https://en.wikipedia.org/wiki/Dutch_angle | secondary |
| S33 | Wikipedia: Dolly zoom | https://en.wikipedia.org/wiki/Dolly_zoom | secondary |
| S34 | Pixo Team, "How to Shoot a Music Video: The DIY Playbook" (2026-09-11) | https://pixo.video/blog/how-to-shoot-a-music-video | vendor blog, low |
| S35 | DV Info Net forum, "JVC HD100 - Slow motion / Music video" (2007) | https://dvinfo.net/forum/archive/index.php/t-102723.html | practitioner forum, low |
| S36 | J. Boone, "How to Perfectly Time Your Music in Premiere Pro", PremiumBeat (2016) | https://www.premiumbeat.com/blog/how-to-time-music-in-premiere-pro/ | industry education (vendor) |
| S37 | YouTube Help: Video resolution & aspect ratios | https://support.google.com/youtube/answer/6375112 | official |
| S38 | YouTube Help: Understand three-minute YouTube Shorts; Enhance your Shorts (iOS) | https://support.google.com/youtube/answer/15424877 ; https://support.google.com/youtube/answer/16215842 | official |
| S39 | StudioBinder: A Beginner's Guide to Film Coverage | https://www.studiobinder.com/blog/film-coverage/ | industry education (sells shot-list software) |
| S40 | Fetched before the scope change, for stable terms (Wikipedia unless noted): Rule of thirds; Headroom (photographic framing); Lead room; Point-of-view shot; Over the shoulder shot; Shot reverse shot; Two shot; Split edit; Jump cut; Match cut; Cutting on action; Insert (filmmaking); Cutaway (filmmaking); B-roll; Cross-cutting; Montage (filmmaking); Three-point lighting; Low-key lighting; Golden hour (photography); Depth of field; Music video; StudioBinder camera angles and film lighting pages | en.wikipedia.org/wiki/<title> ; studiobinder.com/blog/types-of-camera-shot-angles-in-film/ ; studiobinder.com/blog/film-lighting-techniques/ | secondary / industry education |

Could not fetch (403): Runway Help "Gen-4 Video Prompting Guide" and "Camera Terms, Prompts, &
Examples"; OpenAI Help "What to know about the Sora discontinuation". Do not cite their contents.

## 2. AI video generators: camera terms in official guides

Status note. OpenAI removed Sora 2 and the Videos API on 2026-09-24 [S14]. The Sora 2 guide is
marked archived [S13]. Use S13 only as "advice OpenAI gave"; do not present Sora as a current tool.

What the guides agree on:
- Name the shot plainly: shot size + angle + move. Sora: weak cue "cinematic look"; strong cue
  "wide shot, low angle" [S13]. Kling: "Make the camera cool" is "too unclear" [S16].
- One camera move per shot. Sora: "Each shot should have one clear camera move and one clear
  subject action" [S13]. Kling: "one main move per shot is usually better" [S16].
- Start simple, then add one element at a time [S15]. If a shot keeps failing, "freeze the
  camera, simplify the action" [S13]. "Movement is often the hardest part to get right" [S13].
- Say what you want, not what you do not want. Runway: "Describe what you want to see rather
  than what you don't want" [S15]. Veo: avoid "no" or "don't"; list unwanted items instead [S11].
- Shorter clips follow instructions more reliably [S13]. Results vary run to run; test
  variations [S16].

Per vendor (vendor-specific; flag as such in the module):
- Veo (Google) [S11][S12]. Prompt elements: subject, action, style, then optional camera
  positioning and motion, composition, focus and lens effects, ambiance [S12]. Camera terms in
  the guides: eye-level, low-angle, high-angle, bird's-eye/top-down, worm's-eye, Dutch/canted;
  static, pan, tilt, dolly (toward/away), truck (sideways), pedestal (up/down, level), zoom
  ("lens focal length changes; the camera itself does not move"), crane, aerial/drone, handheld,
  whip pan, arc; shot sizes ECU to wide/establishing, OTS, POV [S11]. Lens/focus: wide-angle,
  telephoto, shallow/deep focus, soft focus, macro, lens flare, rack focus, fisheye, dolly zoom
  ("Vertigo effect") [S11][S12]. Unreliable: "Some advanced camera angles are not officially
  supported"; same for "advanced camera lenses" [S11]. Veo 3.1 makes audio; quote dialogue and
  describe sounds [S12].
- Runway (Gen-4.5) [S15]. Text-to-video pattern: "[Camera] shot of [subject] [action] in
  [environment]". Image-to-video pattern: "The camera [motion] as the subject [action]". For
  image-to-video, describe motion, not what is already in the image. For a still shot it suggests
  "The locked-off camera remains perfectly still" and warns this "may not result in a perfectly
  still shot" because video models are built to make motion. Against unwanted cuts: try a longer
  duration, then "Continuous, seamless shot".
- Kling [S16][S17]. Recommended words: "Push in", "Pull back", "Pan left/right", "Tilt up/down",
  "Track forward", "Orbit slowly", "Static camera" [S16]. Patterns: "Camera slowly pushes in on
  [subject] to emphasize [detail]"; "Start with [close/wide view], then [move] to reveal [final
  view]"; numbered shot list with one camera action per shot [S16]. Warnings: complex moves cut
  consistency; a tilt with no vertical structure "may feel unnecessary or unstable"; panning
  against fast opposite subject motion "can create motion confusion"; contradictory cues
  ("Static camera with fast push-in and orbit") [S16]. Composition words "centered", "rule of
  thirds", "off center" are accepted framing direction [S17].
- Luma (Dream Machine API) [S18]. "Camera is controlled by language". An API endpoint returns the
  supported camera-motion strings (example: "camera orbit left"); "syntactically similar phrases
  also work, though there can be mismatches sometimes". The list itself was not in the page.
- MiniMax Hailuo (2.3, 02, T2V-01-Director) [S19]. 15 bracket commands: [Truck left/right],
  [Pan left/right], [Push in], [Pull out], [Pedestal up/down], [Tilt up/down], [Zoom in/out],
  [Shake], [Tracking shot], [Static shot]. Combine in one bracket (max 3 recommended), sequence by
  writing them in order. The doc's own example writes "[Push out]" (see D9).
- Sora 2 (archived) [S13]: lens cues such as "Anamorphic 2.0x lens, shallow DOF"; change one
  thing per retry, e.g. "same shot, switch to 85 mm".

## 3. Virtual cameras in code-rendered 3D

Core facts from the docs:
- three.js `PerspectiveCamera(fov=50, aspect=1, near=0.1, far=2000)`. `fov` is "The vertical
  field of view, from bottom to top of view, in degrees" [S1].
- `filmGauge` = "Film size used for the larger axis. Default is 35 (millimeters)" [S1].
  `setFocalLength(mm)` sets fov from focal length and film gauge, "so that the focal length can
  be specified for a 35mm (full frame) camera" [S1]. Formula in the code:
  `fov = 2 * atan(filmHeight / (2 * focalLength))`, with filmHeight = 35 / aspect in landscape
  and 35 in portrait [S1].
- `zoom` (default 1) scales the effective FOV: `getEffectiveFOV()` = 2 atan(tan(fov/2) / zoom)
  [S1]. Camera position does not change, so it is an optical zoom, not a dolly.
- `focus` (default 10) is "Object distance used for stereoscopy and depth-of-field effects"; it
  does not change the projection [S1]. DOF in three.js is a post effect: `BokehPass` with
  `focus`, `aperture`, `maxblur` [S2]. `Object3D.lookAt` "Rotates the object to face a point in
  world space" [S2].
- Blender: "Focal Length controls the amount of zoom"; set in mm or as Field of View [S3].
  Sensor Fit Auto uses the larger output dimension; sensor size is "an alternative way to
  control the field of view" [S3]. DOF is a camera setting: Focus Object or Focus Distance, plus
  F-Stop ("Lower values give a strong depth of field effect") and blade count [S3]. The manual
  hints a dolly zoom: lower the focal length while the camera moves toward an object [S3].
  Lens shift is "equivalent to rendering an image with a larger FOV and cropping it off-center"
  [S3].
- Unreal Cine Camera Actor: sensor width/height (filmback), focal length, aperture (f-stop),
  manual focus distance in cm, tracking focus on an actor, and "Look at Tracking", which
  "overrides the camera's rotation" to aim at an actor [S6].

FOV and focal length [D], from the S1 formula (FOV = 2 atan(sensor / (2 f))):

| Focal length | Horizontal FOV, 36 mm wide sensor | three.js 16:9, vertical fov (gauge 35) |
|---|---|---|
| 24 mm | 73.7 deg | 44.6 deg |
| 35 mm | 54.4 deg | 31.4 deg |
| 50 mm | 39.6 deg | 22.3 deg |
| 85 mm | 23.9 deg | 13.2 deg |

- The three.js default `fov = 50` (vertical) at 16:9 equals about a 21 mm lens on gauge 35 [D].
- Trap [D]: three.js keeps the vertical FOV fixed. If you switch a 16:9 scene to 9:16 (Shorts)
  with the same `fov`, the horizontal view becomes much narrower. `setFocalLength` gives a
  different `fov` in portrait because the film gauge then applies to the vertical axis [S1].
- Trap [D]: "50 mm" means nothing without the sensor/gauge and which axis it covers. Blender
  Auto fit and three.js both put the gauge on the larger axis [S1][S3].

Camera terms as 3D parameters [D] (position = camera location; target = look-at point):

| Term | Position | Target / rotation | FOV |
|---|---|---|---|
| Pan | fixed | yaw about the vertical axis | fixed |
| Tilt | fixed | pitch up/down | fixed |
| Dutch angle (roll) | fixed | rotate about the view axis (change `up` / roll) [M] | fixed |
| Dolly / push in, pull out | moves along the view line | fixed | fixed |
| Truck | moves sideways | moves by the same offset | fixed |
| Pedestal | moves up/down | moves by the same offset | fixed |
| Crane / boom | rises or falls, often on an arc | often fixed (so it also tilts) | fixed |
| Arc / orbit | moves on a circle around target | fixed; re-aim each frame | fixed |
| Tracking / follow | follows the subject's path | follows the subject | fixed |
| Zoom | fixed | fixed | narrows/widens |
| Dolly zoom | toward/away | fixed | opposite way, subject size held |
| Rack focus | fixed | fixed | animate focus distance [S2][S3][S6] |
| Handheld / shake | small noise offsets | small noise rotations | maybe small FOV noise [S7] |
| Hard cut | switch to another camera, or jump position+target on one frame | | |

- Truck trap [D]: if code calls `lookAt(target)` every frame and moves only the position, a
  sideways move turns into a truck-plus-pan that keeps the subject centred. For a true truck,
  move the target by the same offset.
- Dolly zoom maths [D]: frame width at the subject = 2 d tan(fov/2). Keep it constant: as d
  halves, tan(fov/2) doubles [S33 for the effect].
- Zoom vs dolly in 3D: changing FOV at a fixed position changes only magnification; moving
  the camera changes parallax (near and far things shift by different amounts) [S22][S23].

Time, easing, shake, blur:
- Remotion: "A video is a function of images over time"; animations must run "purely off the
  value of useCurrentFrame()" because rendering uses several tabs that do not share state [S8].
  In @remotion/three, animation is "not inside a useFrame() hook" but driven by the frame [S10].
- Remotion `interpolate(frame, inputRange, outputRange, {easing, extrapolateLeft/Right})`;
  default extrapolation is `extend`, `clamp` holds the end value [S9]. `Easing.in/out/inOut`,
  `Easing.bezier` (CSS-style curves) [S9]. `spring()` goes 0 to 1 by default, "may overshoot",
  config mass 1, damping 10, stiffness 100 [S9]. `<Sequence from durationInFrames>` shifts the
  child's frame to 0 at `from`, so a sequence boundary works as a cut point [S8].
- Blender interpolation: Constant (stair step), Linear ("prevents abrupt changes in value but
  not in speed"), Bezier (default; smooth in value and speed); Ease In = "moving slowly at the
  beginning... speeding up towards the end"; Ease Out = the reverse; Back/Bounce/Elastic
  overshoot [S4].
- Shake: Unreal shake patterns Perlin noise (rumbles, explosions), sine wave (gentle, e.g. a
  boat), or a recorded sequence; they affect location, rotation and FOV [S7]. Remotion
  `noise2D(seed, x, y)` is deterministic, range -1..1, so shake can be a pure function of frame
  [S10].
- Slow motion in a render: you render time, you do not shoot it. Blender Time Stretching remaps
  animation length (Old/New) [S5]. In Remotion, map frame to scene time with `interpolate` and
  an easing curve; a speed ramp is a curved time map [D].
- Motion blur: Blender renders still frames by default; motion blur Shutter is in frames
  (1.0 = one frame) [S5]. Remotion `<CameraMotionBlur shutterAngle=180 samples=10>` blends
  sub-frames; "90 and 180 degrees are the most common values in the film industry" [S10].

## 4. Disagreements and traps (D#)

- D1 Compression. ASC: "It is not the focal length of the lens that causes the distance between
  foreground and background to be compressed, but rather the relative distance of the lens to
  the subject" [S20]. Same in [S21][S22]. Veo's guide still says telephoto "compresses distance"
  [S11]. Module: follow S20. Say "long lens from far away"; in 3D, move the camera back and narrow
  the FOV. Note: field_notes.md says "a zoom flattens"; per S22/S23 a zoom at a fixed position
  does not change perspective. Reword that line in the module.
- D2 Cowboy shot. StudioBinder: "from roughly mid-thighs up" [S25]. Wikipedia: medium-long
  ("knee") shot, also "American shot" / plan américain / 3/4 shot [S24][S26]. Sources differ;
  say "mid-thigh to knee, so a hip holster shows".
- D3 Dolly / track / truck. Wikipedia: tracking is the umbrella; dolly = toward/away; truck =
  sideways and "less common" [S27]. StudioBinder: truck is a lateral tracking shot; "dolly" is
  the equipment [S28]. Veo and MiniMax use truck = sideways, dolly/push = toward/away
  [S11][S19]. Kling uses "push in", "track forward" [S16]. Module: push in/pull out for
  toward/away, truck left/right for sideways, tracking for following a subject.
- D4 Zoom: a move or not? StudioBinder: "technically not a camera movement" [S28]. Veo lists
  it under motion but says the camera does not move [S11]. MiniMax has [Zoom in] next to
  [Push in] [S19]. Module: zoom = lens/FOV change; ask the user "zoom or push in?".
- D5 "Tilt" vs Dutch tilt. Tilt = pitch up/down; Dutch = roll about the lens axis [S32]. In
  prompts, "tilt" means up/down; for roll, say "Dutch angle" or "canted" [S11].
- D6 30-degree rule. A guideline: move at least 30 degrees between shots of one subject;
  sometimes "20 mm/30 degree rule"; Murch extends it to shot size [S29]. Jump cuts break it on
  purpose and are common in vlogs (S40, Jump cut). Module: guideline, not law.
- D7 180-degree rule is a guideline; research on it is limited; arc across the line or use a
  buffer shot to cross [S30].
- D8 180-degree shutter. "A 180° shutter angle is considered normal" [S31]. 180 deg = exposure
  of half a frame interval (1/48 s at 24 fps) [D from S31's formula]. Narrow angles look choppy
  (action/war) [S31]. Convention, not a rule.
- D9 MiniMax doc lists [Pull out] but its example writes "[Push out]" [S19]. Use [Pull out].
- D10 Low angle = power. Vendor and education sources state it [S11]; StudioBinder hedges
  ("there are always exceptions to the rule") (S40, angles). Teach as a convention.
- D11 Cutting to the beat. Pixo: cut faster into the chorus, but "the classic DIY over-edit is
  cutting every beat" [S34]. PremiumBeat only shows how to mark beats [S36]. Sources are thin
  and low; mark as practice, not rule.

## 5. Music-video practice (low-authority sources; say so)

- Coverage by full-song passes: "Full song wide, full song medium, full song close", so every
  line has three angles [S34]. Perform at full energy; half-energy lip sync is the common tell
  [S34]. Frame wider than needed: "you can punch in, never out" [S34].
- Structure: hold longer in verses, cut faster into the chorus, save the best angle for the last
  chorus [S34]. Mark beats with markers while the track plays (M key in Premiere) [S36].
- Slow motion under lip sync (live): play the track faster on set and slow the footage in post;
  e.g. 60p conformed to 24 = "250% speed increase for playback" [S35]. Pitfalls: singing at 2x
  is "very very difficult"; expressions change [S35].
- In code-rendered 3D [D]: the song stays on real time. Slow only the scene time; beat and
  phrase cuts stay locked to the audio timeline.
- Field notes [F] show the same need: "stay on the blackboard for the whole phrase" = cut on the
  phrase, not mid-phrase.

## 6. Best practices with a source

- Coverage: start with the widest shot, then move closer ("V" strategy); a master shot lets the
  editor cut between sizes [S39]. Plan a shot list first [S39] (vendor of shot-list software).
- 180-degree and 30-degree rules: see D6, D7 [S29][S30].
- Eyes about one third down from the top (S40, Headroom; Rule of thirds). Leave lead room in the
  direction the subject looks or moves (S40, Lead room).
- Shorts: square or vertical, up to 3 minutes (uploads from 2024-10-15) [S38]. The Shorts
  editor marks a "non-safe" area near the edges and where the like button may sit [S38].
  YouTube's computer player is 16:9; do not add your own black bars [S37].
- AI generators: see section 2, "What the guides agree on".
- Code-rendered: drive every camera value from the frame number [S8]; ease moves, because linear
  keys give abrupt speed changes [S4][S9]; 180-degree motion blur is the common default [S10].

## 7. Quiz (8 items)

Format: right answer, then wrong answers with why.
1. You want the background to look big and close behind the singer. Ask for?
   Right: camera far back + long lens / narrow FOV for the same framing; distance causes it
   [S20][S22]. Wrong: "zoom in from here" - same perspective, only a crop [S22][S23]. Wrong:
   "wide lens up close" - exaggerates depth instead [S22].
2. three.js code moves `camera.position.x` each frame and calls `lookAt(subject)`. Result?
   Right: truck plus pan; the subject stays centred [D][S2]. Wrong: a pure truck - the target
   must move too [D]. Wrong: a zoom - FOV did not change [S1].
3. Which three.js value is the vertical view angle in degrees?
   Right: `fov` [S1]. Wrong: `zoom` - a multiplier on fov; `filmGauge` - film size in mm;
   `focus` - only for DOF effects [S1].
4. Best prompt for an AI video generator?
   Right: "Medium close-up, low angle. The camera slowly pushes in." [S13][S16]. Wrong: "make
   it cinematic and cool" - too vague [S13][S16]. Wrong: "static camera with a fast push-in and
   orbit" - contradictory, several moves [S16]. Wrong: "no shake, don't cut" - negative
   phrasing [S15][S11].
5. Pan vs truck?
   Right: pan rotates in place; truck moves the camera sideways [S11][S27]. Wrong: "same move" -
   only the truck changes parallax [D][S22]. Wrong: "truck = toward the subject" - that is a
   push-in / dolly [S27].
6. Dolly zoom: what happens?
   Right: camera moves one way, FOV changes the other way; subject size holds, background
   grows or shrinks [S33]. Wrong: "both in the same direction" - that doubles the size change
   [D]. Wrong: "only FOV changes" - that is a zoom [S23].
7. A Remotion render flickers but the preview looks fine. Likely cause?
   Right: some animation is not driven by `useCurrentFrame()` (CSS animation, timers) [S8].
   Wrong: wrong fps - changes speed, not state [M]. Wrong: no motion blur - blur does not fix
   state errors [S10].
8. Slow motion of a dancer in a lip-synced 3D music video. What do you slow?
   Right: the scene time for that shot; the song runs at real time [D][S5]. Wrong: slow the
   whole timeline with the audio - sync breaks [D]. Wrong: lower the fps - choppy, not slow [M].

## 8. Glossary (~40)

[M] unless tagged.
- Extreme wide / establishing: subject small; shows the place. Wide (long): whole subject plus
  room. Full shot: head to toe [S25].
- Medium wide: knees up [S25]. Cowboy: mid-thigh to knee (D2). Medium: waist up. Medium
  close-up: chest up [S25].
- Close-up: face fills the frame. Extreme close-up: one detail, e.g. eyes [S25].
- Insert: closer view of something inside the master shot. Cutaway: view of something outside
  the main action, then back (S40).
- Two-shot: two people in frame. Single: one person (S40).
- OTS: past one person's shoulder to the other. POV: what the character sees (S40).
- Eye level / high / low angle: camera height against the subject's eyes.
- Bird's-eye (top-down): straight down. Worm's-eye: from the ground, straight up [S11].
- Dutch angle: horizon rolled about the lens axis [S32].
- Pan / tilt: rotate left-right / up-down in place [S32].
- Push in / pull out (dolly): camera moves toward / away [S27].
- Truck: camera moves sideways. Pedestal: camera moves straight up/down [S11][S27].
- Tracking shot: camera follows a moving subject [S27].
- Crane / boom: camera rises or falls on an arm. Arc / orbit: camera circles the subject [S28].
- Handheld: loose, shaky, documentary feel [S28]. Locked-off / static: no camera motion [S15].
- Zoom: change FOV / focal length; the camera stays [S11][S23]. Crash zoom: very fast zoom.
- Dolly zoom: move and zoom in opposite ways [S33]. Whip pan: very fast pan [S28].
- Rack focus: move focus from one subject to another during the shot [S11].
- Focal length / FOV: lens mm vs view angle; sensor size links them [S1][S3].
- Depth of field: near-to-far range that is sharp (S40). Bokeh: the look of the blur [S11].
- F-stop: aperture number; lower = shallower DOF [S3].
- Rule of thirds; headroom; lead room: see section 6 (S40).
- 180-degree rule: stay on one side of the line between subjects [S30]. 30-degree rule: change
  angle at least 30 degrees between cuts [S29].
- Coverage: all the shots a scene needs. Master shot: one take of the whole action [S39].
- B-roll: extra footage cut over the main track (S40).
- Jump cut: cut inside one shot, time jumps. Match cut: cut between shots with matched shape or
  action. J-cut / L-cut: sound starts before / continues after the picture cut (S40).
- Cut on action: cut during a movement to hide the cut (S40).
- Keyframe: a set value at a frame; the software fills in between.
- Easing: ease in = start slow, ease out = end slow [S4]. Spring: physics ease; may overshoot [S9].
- Time remap / speed ramp: change scene speed over time [S5][D].
- Shutter angle: share of each frame interval the shutter is open; 180 is normal [S31].
- Motion blur: smear along the motion [S5]. Shake: noise on camera position/rotation [S7].

## 9. Picture and clip ideas

Clip (motion is the point): pan vs truck side by side (same start frame; watch parallax);
push-in vs zoom side by side (background size and parallax); dolly zoom; orbit vs pan; tilt vs
Dutch roll; rack focus; whip pan as a transition; linear vs ease-in-out vs spring on the same
push-in; slow-motion time remap with the beat grid shown; cut on the beat vs cut on the phrase.

Still (a frame is enough): shot-size ladder on one figure; angle ladder (eye/high/low/top-down/
worm's-eye); OTS vs POV; rule-of-thirds and headroom overlay; lead room right vs wrong; 180-degree
line diagram (top view); same subject at 24/50/85 mm from the same spot (crop) vs the same
framing from different distances (compression); 16:9 vs 9:16 with the same `fov`; DOF at two
f-stops.

Commonly confused pairs: zoom vs push-in; pan vs truck; tilt vs Dutch; OTS vs POV; orbit vs pan;
insert vs cutaway; jump cut vs match cut; frame rate vs shutter angle.

## 10. Tempting claims with no source here (keep out, or mark [M] as opinion)

- "Clean audio matters more than image."
- "Leave 2-3 s handles before and after every action."
- "Motivate every camera move" (no fetched source states it as a rule).
- "Stabilise unless handheld is a choice"; "expose and focus for the face".
- "Shoot 16:9 and protect a 9:16 centre" (no official safe-area numbers found for Shorts).
- Exact Shorts safe-zone pixel margins.
- "Low angle always means power"; "high angle always means weakness" (conventions only).
- "Sora/Runway/Kling understand term X 100%" (all vendors say results vary).
- "Veo/Kling ignore Dutch angles" (only "not officially supported" for "advanced" angles [S11]).
- Specific Runway Gen-4 help-centre wording (could not fetch; 403).
- "Cut on every beat" as a music-video rule (S34 says the opposite).
- Unreal Camera Rig Rail / Crane actors and Blender camera markers: real features [M], not
  fetched; check docs before citing.
