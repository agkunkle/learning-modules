# Oreo vs. the toothbrush: brushing a hostile adult cat's teeth

Status: approved by the user on 2026-10-10 (section 6 option b). Built and checked on
2026-10-10; see "As built" at the end for where the module differs from this outline.

## Purpose
- Kind: concept (not about code: a practical skill, taught with pictures and clips)
- Reader: an adult cat owner with no veterinary background, whose **adult cat is hostile** to
  mouth handling. No "start when they are kittens" advice: every tip must work for an adult
  cat that already objects.
- After the module the reader can:
  1. explain why brushing matters, and what it cannot fix (tartar, tooth resorption);
  2. decide when to see a vet before any training (pain can look like "attitude");
  3. read the quiet stress signals and stop before the hiss and the swat;
  4. run a slow, food-paid training ladder over weeks, and step back after a bad day;
  5. brush with the sourced technique: back towards you, mouth closed, lip lifted, 45 degrees
     into the gumline, small circles, about 30 s per side;
  6. pick a Plan B when the brush never works, and say why "anaesthesia-free" cleaning is not one.

## Decisions so far (from the user)
- Tone: light and tongue-in-cheek. Jokes go in captions, picture text and framing; the
  instructions and safety facts stay accurate and plain.
- Pictures: our own inline SVG cartoons (kit `PICS`, added for this module). Page stays offline.
- Every cat is **Oreo**, a black-and-white tuxedo cat. Style reference: the `day1` picture.
  Drawing code: `oreo()` in `module/module.js` (pose dials: ears, lids, pupils, brows, tail,
  puff, look, mouth).
- A "video" of the brushing process: the main clip `brushing` (below), plus a shorter `ladder` clip.
- Kit colour rules apply to cartoons: no yellow (highlighter only), no blue objects (blue =
  pressable). Oreo's toothbrush is aqua. Red only with an icon and a word.

## Source
- No repo. Sources: veterinary and medical pages, tagged [S#] in `research/brief.md` (24 sources,
  accessed 2026-10-10). Main ones: iCatCare [S1, S2], Cornell [S3-S6], VCA [S7-S9], AVDC [S10],
  VOHC [S11-S13], WSAVA dental committee toolkit [S14], AAFP/ISFM 2022 handling guideline [S17].
- `META.source`: "International Cat Care, Cornell Feline Health Center, VCA, AVDC, VOHC, WSAVA,
  AAFP/ISFM 2022; accessed October 2026". A "Sources" list at the end of the page links them.

## Outline (about 40 min, 7 sections)

| # | Section | Key idea | Rich elements | Checks (kind) |
|---|---------|----------|---------------|---------------|
| - | Meet Oreo (intro) | The deal: slow, paid in chicken, no heroics. Not vet advice. | pic `day1` ("Day 1. Oreo opens negotiations.") | - |
| 1 | Why bother? | Most adult cats have dental disease (50-90% by source) and hide it. Plaque starts to harden in about 36-48 h; brushing cannot remove tartar; no evidence it prevents tooth resorption. [S2, S3, S7, S8, S12] | clip `plaque` (~20 s: plaque film -> 48 h -> tartar crust -> "brush can't help now, vet can"); pic `hides_pain` (Oreo, "I'm fine." with a thought bubble of a sore tooth) | Q1 timing (choice); Q2 tartar (choice); Q7 no signs = healthy? (choice) |
| 2 | Attitude, or a sore mouth? | Hostility near the mouth can be pain. Vet exam first. A cat with problem behaviour: train only with a feline behaviourist's input. [S3, S5, S17] | pic `vet` (Oreo on the exam table: "Say ahh." / "Say no."); list of mouth-pain signs | Q8 hiss-and-swat first step (choice); "which are signs of a painful mouth" (choice, multi-select) |
| 3 | Reading Oreo: stop at the quiet signals | Fear goes quiet, then away, then loud: freeze -> avoid -> growl, hiss, swat, bite [S17]. Stop at the quiet ones. No scruffing, no tight restraint; a towel only as a loose wrap. [S9, S17] | pics `relaxed`, `frozen`, `hiss` (one Oreo, three dials); diagram `escalation` (3 groups: inhibition / avoidance / repelling; flow lights "stop here" at the first one); signal table | Q6 ears sideways + still + wide pupils (choice); order the escalation (order); match signal -> what you do (match) |
| 4 | The slow ladder | Tiny steps, each paid with food; the cat can always leave; 30 s sessions; weeks to months. Bad day -> go one step back, end on a treat. No progress after a few weeks -> get professional help. [S1, S3, S9, S14, S17] | clip `ladder` (~45 s: touch face -> taste paste -> lip lift -> brush on one canine -> a few teeth -> one side; a "step back" branch when Oreo's ears turn); pic `calendar` (week 1 .. week 8, Oreo unimpressed throughout) | order the ladder (order); bad-session response (choice); how long (choice) |
| 5 | Kit and technique, fingers out of the mouth | Cat toothpaste only; a handled brush, not a finger brush, for a cat that bites [S1]; one brush per cat. Back towards you; head hold; mouth stays closed; lift the lip; bristles 45 degrees into the gumline; small circles; outer surfaces, big cheek teeth and canines; 10 s building to 30 s per side. [S1, S3, S7] | **clip `brushing` (the video, below)**; pic `mouth` (labelled side view: gumline, canine, cheek teeth, "tongue does the inside"); pic `toothpaste` (cat paste ✓ vs human paste ✗) | Q4 toothpaste (choice); Q3 surfaces (choice); Q5 position (choice) |
| 6 | Keeping all your fingers | Prevention, all sourced: handled brush, not a finger brush [S1]; mouth stays closed, never forced [S7, S9]; stop at the quiet signals [S17]; no scruffing or tight restraint [S17]. If a bite or scratch breaks the skin: wash with soap and water and contact a doctor (general first aid; no figures, by the user's choice). | pic `bandage` (owner's bandaged thumb, Oreo smug) | which habits keep fingers safe (choice, multi-select); bitten: what now (choice) |
| 7 | Plan B: when the brush never works | Some cats never accept it [S1]. Ladder of options: vet nurse demo and behaviour help -> VOHC-accepted diets/treats/additives (seal = sponsor trials reviewed, not tested by VOHC) -> exams every 3-12 months -> cleaning under anaesthesia. Not "anaesthesia-free" scaling: cosmetic only [S10]. Brushing stays the gold standard. [S1, S2, S8-S13] | diagram `plan_b` (4 steps, least to most effort); pic `seal` (Oreo crunching a dental treat, smug) | Q9 after weeks of refusal (choice); Q10 why not anaesthesia-free (choice) |
| - | Review quiz | | | 8 items (below) + score summary |

### Clip `brushing` (the video, about 70-90 s, 8 scenes)
Every scene follows the sources; captions say pass/fail where it matters.

| # | Scene | What Oreo and the hands do | Source |
|---|-------|----------------------------|--------|
| 1 | Set up | Quiet small room, door closed; towel on a low table; paste on the brush; treats ready | S7, S9 |
| 2 | Position | Oreo sits with his back to you, on your lap or the table | S1, S7 |
| 3 | Head hold | Palm on top of the head; thumb and second finger on the cheekbones; index finger up, off the eyes | S1 |
| 4 | Lift the lip | Mouth stays closed; the thumb lifts the upper lip at the cheek | S1, S7 |
| 5 | Angle | Close-up: bristles at 45 degrees into the crevice between tooth and gum | S3 |
| 6 | Brush | Small circles along the gumline, cheek teeth and canine; 10 s per side at first, later 30 s | S1, S7 |
| 7 | Read Oreo | Ears start to turn sideways: brush away, session over, no finishing "just one more tooth" | S1, S9, S17 |
| 8 | Pay up | Treat, praise, end on a good note; "same time tomorrow" | S1 |

Drawing: scenes 1-3 and 7-8 use the front Oreo from `oreo()` with the owner's hands drawn behind
him; scenes 4-6 need a new close-up profile drawing of the mouth (lip, gumline, teeth). The
stage is dark, so Oreo gets a light outline there (ink = `COLORS.fg`).

## Review quiz (8 items)
1. Plaque to tartar timing (choice) [S8, S9]
2. What brushing cannot do: remove tartar (choice) [S2, S12]
3. Hostile cat, first step: vet exam, maybe a behaviourist (choice) [S3, S5, S17]
4. Order the escalation: freeze, move away, hiss, bite (order) [S17]
5. Match brush types to the note: handled cat brush / child's soft brush / finger brush (bite
   risk, sources disagree) / cotton bud (training step) (match) [S1, S7, S14]
6. Which tooth surfaces: outer, at the gumline (choice) [S3, S7]
7. Why scruffing is out (choice) [S17]
8. Plan B: what a VOHC seal does and does not mean (choice) [S11, S12]

## Accuracy
- Every factual claim cites a source tag in research/brief.md.
- "Sources differ" boxes (not facts): D1 daily vs. 3x/week; D2 finger brushes; D5 which teeth
  first; D6 inner surfaces. The prevalence figures are given as a range (D10).
- Not in the module (unsourced or not researched): xylitol; chlorhexidine; lip-licking, tail
  thumping and skin twitching as stress signs; "approach from the side"; "brush after play";
  gloves as bite protection; any medication for home brushing (only "ask your vet about vet
  visits"); "brushing prevents tooth resorption".
- No product names. "Look for the VOHC seal" and the list date (August 2026) only.
- The hostile-cat ladder is the sources' approximation principle [S9, S17], not a published
  protocol; the module says so and points to a behaviourist.
- Disclaimer in the intro: general education, not a replacement for a vet.

## Decisions at approval (2026-10-10)
1. Bite facts: option (b). No bite statistics or infection figures (S20-S24 stay unverified and
   unused). Section 6 gives only general first aid: wash with soap and water, contact a doctor.
2. The research agent's stray `.playwright-mcp/` folder: deleted with the user's approval.

## As built (2026-10-10)
- Section 3 uses one wide picture, `signals` (three Oreos: relaxed, quiet, loud), not three pics.
- Section 7's picture is `plan_b` (Oreo behind a bowl of dental kibble), not `seal`.
- The review ends with a `finale` picture (Oreo's slow blink) and the Sources list.
- Clip lengths: `plaque` 30 s, `ladder` 37 s, `brushing` 91 s (18 captions).
- Section 5's "How often?" box is a tip (D1: daily vs. 3x a week), not a warning.
- Review quiz, as built (8 items):
  1. Oreo has tartar and red gums: which plan fits (choice) [S1, S2, S14]
  2. What the sources support about tooth resorption (choice) [S2, S3, S5]
  3. Match each tool to its note (match) [S1, S7, S14]
  4. Why scruffing is out (choice) [S17]
  5. What a VOHC seal tells you (choice) [S11-S13]
  6. How often to brush, once Oreo accepts it (choice) [S1, S3, S7, S14]
  7. A little blood on the brush after a few weeks (choice) [S1, S3, S9]
  8. Which teeth to start with: sources differ (choice) [S1, S3, S7, S14; D5]
  Plaque timing and the escalation order are asked in sections 1 and 3, so the review does not
  repeat them.
