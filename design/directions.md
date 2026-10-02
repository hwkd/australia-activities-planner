# Design directions: research, analysis and evaluation

Related: [intent.md](../intent.md) · [spec.md](../spec.md) · Canvas: https://claude.ai/artifact/3DefgcrPvBH4JCFK3qrYJX

The v1 prototype (sandstone and ferry green, Fraunces over Figtree) worked, but it was **plain**. This document covers:
1. what we looked at
2. what the product actually needs from its design
3. three distinct directions
4. how they compare.

---

## Status update: 30 Sep 2026

- **Chosen concept: A · Sky Mode**, "the interface is the forecast". The client liked it best. Its rain was thinned by about 25%.
- **The original B (The Weekender) and C (Flags Up) were rejected** and removed from the canvas.
- **B is now Harbour Window, a variant of A:**
  - the weather is shown through an illustrated Sydney harbour (sun, clouds, rain and heat move within the scene)
  - content sits on solid weather-tinted surfaces instead of glass, which addresses A's contrast risk
  - Unbounded + Onest.
- **C · Aura** (a dark, minimal variant with a glowing weather orb) was built and then removed at the client's request.
- **Detail page:** both A and B now have "Activity detail" artboards. They include a schematic map, route options by origin and mode, a getting-back route, a cost estimate calculator, and visit info. See spec.md §3.2 and §4.3.

The research and evaluation below are kept for reference; they describe the first round of directions.


## 1. Research

### What wins awards in this space

| Reference | What it does | Lesson for us |
|---|---|---|
| **CARROT Weather**: Apple Design Award, App of the Year | A weather app with a *personality* you can choose, from "professional" to "overkill". | Personality isn't decoration. It's why people come back to a utility they could get anywhere. |
| **(Not Boring) Weather** | Clouds drift, rain falls and the sun peeks out, all in sync with a timeline you scrub; there are also haptics and sound. | Weather can be *felt* rather than just read. Motion that reflects real state is memorable *and* informative. |
| **When to Travel**: Awwwards Site of the Day | A travel-timing site with a horizontal timeline, GSAP motion and a bold turquoise and coral palette. It scored 7.3–7.5 for design and animation but only **6.8 for usability**, and it was marked down on accessibility. | Showy travel sites often trade clarity for spectacle. Our users are newcomers making a decision, so the spectacle has to *serve* that decision. |
| **Recent Awwwards travel honours** (Hedwig, Vita Travels, Travelling Distribution, 2026) | Editorial, curated and typography-led; imagery comes first. | Curation and an editorial voice signal trust, but they depend heavily on photography. |
| **Destination NSW, "Feel New"** | NSW's visitor brand: "a place to feel free, feel alive, feel new". It's emotion-led and built on photography and video. | The emotional promise fits newcomers perfectly. But we have **no photo library yet**, so a direction that needs great photography starts at a disadvantage. |

### 2026 interface and motion trends worth using (and ones to avoid)

- **Use:**
  - spring physics and staggered entrance choreography, so elements *arrive* in reading order
  - kinetic variable-font type (animating weight or width)
  - tactile and "tactile-brutalist" surfaces (hard shadows, pressable buttons)
  - depth-aware layered glass.
- **Avoid:**
  - motion for its own sake
  - decorative gradient washes
  - glassmorphism with poor contrast
  - generic type (Inter, Roboto; even Fraunces is now a cliché, and v1 used it).

### Sydney's visual DNA (things we can own)

- **Colours:**
  - harbour cobalt
  - sandstone ochre
  - **jacaranda purple**: the trees bloom around October and November, the same time as this first "issue"
  - **surf lifesaving red and yellow flags**, the first safety rule every newcomer learns
  - ferry green and gold.
- **Graphic systems:** transit wayfinding signage, the Opera House sails, and ocean pools.

## 2. Analysis: what the design must do

1. **Make the weather the hero variable.** It's the one input that changes every weekend and the product's differentiator. The design should make "it's raining on Sunday" feel instantly different, not just filter a list.
2. **Help people decide, not browse.** Ranking, hidden counts and the Great/OK/Skip rating must be readable at a glance, and never by colour alone.
3. **Be warm to strangers.** Newcomers are often lonely and unsure, so the voice and visuals should say "you've got this". It should feel neither touristy nor exclusive.
4. **Work without photography.** Until we license or shoot images, the visual system has to carry itself on type, colour, shape and illustration.
5. **Make it shareable.** The plan is sent to a date or a group, so it should look good enough to screenshot.
6. **Put motion where it means something:** changes of state (weather, adding to the plan, Plan B), not idle decoration. Always respect reduced motion.

## 3. The three directions

Each has a phone (390×844) and a desktop (1440×960) artboard. All share one logic engine, so they behave identically; only the design differs.

### A. Sky Mode: "the interface is the forecast"
- **Concept:** Every weather has its own full-screen, living sky: cobalt harbour sun, drifting pearl clouds, layered night rain, and terracotta heat haze. Activities float over it on frosted glass. Switching weather crossfades the whole world and re-ranks the picks.
- **Type:** Mona Sans for everything, at fixed widths (changed from Bricolage Grotesque + Instrument Sans on 1 Oct 2026; see "Font evaluation" below).
- **Signature motion:** the sky crossfade plus the headline's weather word rising in.
- **Strengths:** unforgettable, it turns our key variable into an emotion, and it needs no photography.
- **Risks:**
  - contrast over changing skies, and the performance and legibility of glass
  - it can drift into "weather app" and away from "things to do"
  - four scenes cost more to build and test.

### B. The Weekender: "a weekly magazine for new Sydneysiders"
- **Concept:** Each weekend is an *issue*: a masthead, numbered stories, critic-style verdict dots, the newcomer tip as a pull-quote, and a jacaranda purple accent on newsprint cream.
- **Type:** Instrument Serif over Geist and Geist Mono.
- **Signature motion:** the headline revealing line by line when the weather changes, plus a ticker of the picks.
- **Strengths:** trustworthy and grown-up, excellent for dates, with strong typographic accessibility and long-term brand value.
- **Risks:**
  - editorial design depends on real photography and great writing, both of which we lack today
  - it can feel exclusive or "not for me" to some newcomers
  - weather is less visceral than in A.

### C. Flags Up: "Sydney's street graphics as a tactile planner"
- **Concept:** The red and yellow surf flags, wayfinding signage and harbour ferries become a chunky graphic system. Activities are perforated **tickets**, and the weekend is a **ticket wallet**.
- **Type:** Archivo, across its full width range, from expanded black to condensed labels.
- **Signature motion:** a rubber-stamp "SAT"/"SUN" slamming onto a ticket when it's added, plus a kinetic width-axis headline.
- **Strengths:**
  - signage is *designed* for orienting strangers, so it's the clearest at a glance
  - playful and warm, great for friends and families
  - very shareable, and needs no photos.
- **Risks:**
  - loud, and can tire the eye with many colours
  - must stay clearly original, not a copy of Transport for NSW, Opal or Surf Life Saving marks
  - the flags motif is Australian rather than Sydney-specific, which is fine for expanding to other cities.

## 4. Evaluation

Each direction is scored 1–5 against the analysis above. The weights reflect what the product needs from its design.

| Criterion | Weight | A. Sky Mode | B. Weekender | C. Flags Up |
|---|---|---|---|---|
| Decision clarity (ranking and ratings at a glance) | 25% | 4 | 4 | **5** |
| Personality and memorability | 20% | **5** | 4 | **5** |
| Warmth for newcomers | 15% | 4 | 3 | **5** |
| Accessibility risk (5 = lowest risk) | 15% | 3 | **5** | 4 |
| Motion payoff tied to meaning | 10% | **5** | 3 | 4 |
| Works without photos, scales to more cities | 15% | **5** | 3 | 4 |
| **Weighted score** | | **4.30** | **3.75** | **4.60** |

These are desk-research judgements, not user evidence. The scores are close enough that a quick test with real newcomers should decide.

### Recommendation

- **Lead with C (Flags Up) as the system, and borrow A's best idea:** weather that changes the atmosphere. For example, the ticket wallet's backdrop and the marquee could shift with each day's forecast. That combines the clearest, warmest system with the most meaningful motion.
- **Keep B's editorial voice for content, not chrome:** numbered picks, critic-style verdicts and pull-quote tips work in any direction.

### Next: validate with users

- **Who:** 5–6 newcomers (e.g. international students, working-holiday makers), in 20-minute sessions.
- **Tasks:**
  1. Plan a rainy Sunday with a partner.
  2. Find a free family activity.
  3. Share your plan.
- **What to measure:** time to plan, and whether they notice and use Plan B.
- **What to ask:** "Which one would you open again next Thursday?"
- **Also check:** contrast in A's cloudy and hot scenes, and whether reduced-motion settings are respected.

## Sources

- [Apple Design Awards 2025 winners and finalists](https://developer.apple.com/design/awards/2025/)
- [CARROT Weather on the App Store](https://apps.apple.com/us/app/carrot-weather-alerts-radar/id961390574)
- [(Not Boring) Weather product case study](https://medium.com/@mohit15856/product-case-study-2-not-boring-weather-the-weather-app-that-actually-makes-you-smile-b4cc32bb27a9)
- [When to Travel, Awwwards Site of the Day](https://www.awwwards.com/sites/when-to-travel)
- [Awwwards travel and tourism winners](https://www.awwwards.com/websites/travel-tourism/)
- [Destination NSW, Feel New visitor brand](https://www.destinationnsw.com.au/marketing/feel-new-visitor-brand)
- [Tubik: UI design trends 2026](https://tubikstudio.com/blog/ui-design-trends-2026/)
- [Motion UI trends 2026](https://lomatechnology.com/blog/motion-ui-trends-2026/2911)
- [Fireart: Web design trends 2026, tactile brutalism](https://fireart.studio/blog/the-best-web-design-trends/)


## Font evaluation for A · Sky Mode (1 Oct 2026)

Specimens of each option on A's four skies and glass: `design/font-eval/specimens.html`.

**What A needs from its type:** big, confident headlines that hold up over moving skies and rain; small text that stays legible on frosted glass; a way to take part in "the interface is the forecast"; something less ubiquitous than Bricolage Grotesque, which became a default look in 2024–25; Vietnamese and extended Latin for newcomers; and a clear difference from B (Unbounded + Onest) and v1 (Fraunces + Figtree).

| Option | Over skies | Small text on glass | Weather behaviour | Distinctive | Verdict |
|---|---|---|---|---|---|
| Bricolage Grotesque + Instrument Sans (current) | Good | Good | Width axis only to 100 | Overused | Replace |
| **Mona Sans** (one family) | Strong | Very good | Width 75–125 and weight 200–900, animatable | Yes, refined | **Chosen** |
| Anybody + Hanken Grotesk | Loud | Good | Width 50–150 | Yes, but gimmicky at the extremes; titles run to 4 lines | No |
| Geologica | Good | Very good | Sharpness axis, too subtle to read as weather | Mild | Runner-up |
| Schibsted Grotesk | Strong | Good | None | Newspaper feel, static | No |
| Instrument Serif + Geist | Elegant but thin over rain and busy skies | Good | None | Trendy in 2025 | No |
| Funnel Display + Funnel Sans | Good | Good | None | Close to the current look | No |

**Why Mona Sans:** one well-made family (SIL Open Font License) covers display and text, so there's one font request. It is crisp over moving skies and very legible on glass, and it covers Latin, Latin Extended and Vietnamese.

**Widths are fixed** (decided 1 Oct 2026): the type does not change with the weather. Big titles use width 80, section heads 90, numbers and labels 100. An earlier version varied the width by weather; it was removed at the client's request.
