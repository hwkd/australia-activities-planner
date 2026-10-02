import { z } from "astro/zod";

/**
 * A curated event (spec §11.4, tracker M15): a few highlights a fortnight, not a listings feed. Events
 * live in D1 (`events`) with the same draft / publish / history flow as activities. Ids start with
 * `e-` so they never clash with activity ids in plans and share links.
 */
const fit = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time must be HH:MM");

export const eventSchema = z
  .object({
    id: z.string().regex(/^e-[a-z0-9]+(-[a-z0-9]+)*$/, "id must start with e- and be kebab-case"),
    name: z.string().min(1).max(80),
    blurb: z.string().min(1).max(90),
    /** First and last day it's on (Sydney dates, inclusive). */
    start: date,
    end: date,
    area: z.string().min(1),
    venue: z.object({ name: z.string().min(1), lat: z.number(), lng: z.number() }),
    weatherFit: z.object({ sunny: fit, cloudy: fit, rainy: fit, hot: fit }),
    goodFor: z.array(z.enum(["date", "friends", "family", "solo"])).min(1),
    duration: z.object({ label: z.string().min(1), minHours: z.number().positive(), maxHours: z.number().positive() }),
    cost: z.enum(["Free", "$", "$$", "$$$"]),
    suggestedStart: hhmm,
    /** The official page: where visitors check times and book. */
    link: z.object({ label: z.string().min(1), url: z.url() }),
    /** When it's at a place that's already an activity, e.g. a festival at the Botanic Garden. */
    activityId: z.string().optional(),
    /** The day an editor last checked it against the official page. */
    checked: date,
  })
  .superRefine((e, ctx) => {
    if (e.end < e.start) ctx.addIssue({ code: "custom", message: "end is before start", path: ["end"] });
    if (e.duration.minHours > e.duration.maxHours) ctx.addIssue({ code: "custom", message: "duration.minHours > maxHours", path: ["duration"] });
  });

export type EventItem = z.infer<typeof eventSchema>;
