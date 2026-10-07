import { z } from "astro/zod";

/** Content schema for one activity: spec §4.1 (activity) and §4.3 (getting there, the real map, cost, visit). */

const money = z.tuple([z.number().min(0), z.number().min(0)]).refine(([a, b]) => a <= b, "min must be ≤ max");
const fit = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:MM");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
const legMode = z.enum(["walk", "train", "bus", "ferry", "metro", "light-rail"]);
const accessLevel = z.enum(["yes", "partial", "no"]);

export const categories = [
  "coastal-walk",
  "bushwalk",
  "beach",
  "swimming",
  "ferry",
  "lookout",
  "landmark",
  "museum",
  "gallery",
  "market",
  "food",
  "neighbourhood",
  "wildlife",
  "garden",
  "history",
  "water-sport",
  "event",
] as const;

const leg = z.object({
  mode: legMode,
  line: z.string().optional(),
  title: z.string().min(1),
  detail: z.string().optional(),
  mins: z.number().int().positive(),
});

/**
 * Getting there (spec §3.2 item 4, §4.3, D14): one public transport trip from the city centre
 * (Central), the way back, a Driving? note and an optional rideshare sentence.
 */
const routes = z.object({
  dest: z.object({ lat: z.number(), lng: z.number(), label: z.string() }),
  pt: z.object({
    total: z.string(),
    changes: z.number().int().min(0),
    fare: money,
    nonOpal: money.optional(),
    nonOpalChild: money.optional(),
    legs: z.array(leg).min(1),
    back: z.object({ text: z.string() }),
  }),
  drive: z
    .object({ total: z.string(), perCar: money, perCarLabel: z.string().min(1), notes: z.array(z.string()) })
    .nullable(),
  ride: z.string().min(1).optional(),
  unavailable: z.object({ drive: z.string().optional() }).optional(),
});

// Greater Sydney plus the day trips by train: Newcastle (about −32.9) to Kiama (about −34.7).
const lngLat = z.tuple([z.number().min(150).max(152), z.number().min(-35).max(-32.5)]);
const placeType = z.enum(["start", "end", "beach", "pool", "lookout", "food", "stop", "paid"]);
const mapLeg = z.object({
  mode: z.enum(["walk", "train", "bus", "ferry", "metro", "light-rail"]),
  line: z.string().optional(),
  coords: z.array(lngLat).min(2),
});

/**
 * The real map (spec §3.2 item 3, §4.3): the numbered places, the activity's own walking line,
 * toilets and cafés, and the routes of the trip from Central and the way back, all in [lng, lat].
 * From NSW National Parks, OpenStreetMap and Transport for NSW data, checked by an editor
 * (`checked` stays null until then).
 */
const geo = z.object({
  places: z
    .array(
      z.object({
        n: z.number().int().positive(),
        name: z.string().min(1),
        type: placeType,
        note: z.string(),
        lng: z.number().min(150).max(152),
        lat: z.number().min(-35).max(-32.5),
      }),
    )
    .min(1),
  trail: z.array(z.array(lngLat).min(2)).optional(),
  facilities: z.array(z.object({ kind: z.enum(["toilet", "cafe"]), lng: z.number(), lat: z.number() })).optional(),
  trip: z.object({ legs: z.array(mapLeg).min(1) }).optional(),
  back: z.object({ legs: z.array(mapLeg).min(1) }).optional(),
  source: z.string().min(1),
  checked: date.nullable(),
});

/** Where a detail that isn't confirmed yet shows on the activity page (spec §4.1). */
export const unconfirmedSections = ["map", "gettingThere", "driving", "cost", "visit", "access"] as const;

/**
 * How a visitor can check an unconfirmed detail themselves: the page (or phone number) that has the
 * answer, e.g. the operator's car park page, the Transport for NSW timetable, "Call Wylie's Baths".
 */
export const unconfirmedCheck = z.object({
  label: z.string().min(1).max(60),
  url: z
    .string()
    .max(500)
    .refine(
      (u) => /^https:\/\/[^\s]+$/.test(u) || /^tel:\+?[0-9]{6,15}$/.test(u),
      "use an https:// link or a tel: number",
    ),
});

export const activitySchema = z
  .object({
    id: z.string().max(60, "id must be 60 characters or fewer").regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
    status: z.enum(["draft", "verified"]),
    name: z.string().min(1),
    /**
     * D16: the state it's listed under; a union of the 8 states and territories once another is live
     * (spec §12.5). Defaults to New South Wales, so a draft saved without it (an admin tab opened before
     * migration 0004, or the old worker during a deploy) still saves and publishes.
     */
    state: z.literal("nsw").default("nsw"),
    city: z.literal("sydney"),
    area: z.string().min(1),
    category: z.enum(categories),
    categoryLabel: z.string().min(1),
    blurb: z.string().min(1).max(90),
    weatherFit: z.object({ sunny: fit, cloudy: fit, rainy: fit, hot: fit }),
    weatherNote: z.string().min(1).max(160),
    goodFor: z.array(z.enum(["date", "friends", "family", "solo"])).min(1),
    duration: z.object({ label: z.string(), minHours: z.number().positive(), maxHours: z.number().positive() }),
    cost: z.enum(["Free", "$", "$$", "$$$"]),
    gettingThere: z.string().min(1).max(240),
    newcomerTip: z.string().min(1).max(240),
    safetyNotes: z.array(z.string()).optional(),
    bookingRequired: z.boolean().optional(),
    days: z
      .array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]))
      .min(1)
      .optional(),
    seasonal: z.object({ months: z.array(z.number().int().min(1).max(12)).min(1), note: z.string() }).optional(),
    suggestedStart: hhmm,
    location: z.object({ lat: z.number(), lng: z.number() }),
    links: z.array(z.object({ label: z.string(), url: z.url() })).optional(),
    facts: z.array(z.object({ k: z.string(), v: z.string() })).length(4),
    routes,
    geo,
    costs: z.object({
      entry: money,
      entryChild: money.optional(),
      extras: z.array(z.object({ id: z.string(), label: z.string(), per: money, on: z.boolean() })),
      pricesChecked: date.nullable(),
    }),
    visit: z.object({
      bestTime: z.string(),
      hours: z.string(),
      bring: z.array(z.string()),
      facilities: z.array(z.string()),
      access: z.string(),
      safety: z.array(z.string()),
    }),
    pairings: z.array(z.object({ name: z.string(), why: z.string(), dist: z.string(), activityId: z.string() })),
    /** Phase 2 accessibility facts (spec §11.6): only from the venue or NSW National Parks, never guessed. */
    access: z
      .object({
        prams: accessLevel,
        stepFree: accessLevel,
        accessibleToilet: z.boolean(),
        notes: z.string().max(240).optional(),
      })
      .optional(),
    lastVerified: date.nullable(),
    /**
     * Details no official source could confirm when the activity was checked (spec §4.1). Each shows
     * as "Not yet confirmed" in its section until someone confirms it and the entry is removed.
     */
    /**
     * A temporary warning shown at the top of the activity page, e.g. a track closure from NSW National
     * Parks alerts, with the page that has the latest. Remove it when it no longer applies.
     */
    notice: z.object({ text: z.string().min(1).max(240), link: unconfirmedCheck.optional() }).optional(),
    unconfirmed: z
      .array(
        z.object({
          section: z.enum(unconfirmedSections),
          note: z.string().min(1).max(200),
          check: unconfirmedCheck.optional(),
        }),
      )
      .optional(),
  })
  .superRefine((a, ctx) => {
    if (a.duration.minHours > a.duration.maxHours)
      ctx.addIssue({ code: "custom", message: "duration.minHours > maxHours", path: ["duration"] });
    if (a.status === "verified" && (!a.lastVerified || !a.costs.pricesChecked))
      ctx.addIssue({
        code: "custom",
        message: "verified activities need lastVerified and costs.pricesChecked",
        path: ["status"],
      });
    if (!a.routes.drive && !a.routes.unavailable?.drive)
      ctx.addIssue({ code: "custom", message: "drive is null without a reason", path: ["routes", "unavailable"] });
    const ns = a.geo.places.map((p) => p.n);
    if (new Set(ns).size !== ns.length)
      ctx.addIssue({ code: "custom", message: "places need different numbers", path: ["geo", "places"] });
  });

export type Activity = z.infer<typeof activitySchema>;
