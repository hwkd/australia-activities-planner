import { env } from "cloudflare:workers";
import type { Db } from "./db";
import type { ContentMode } from "./activities";
import { readCookie, sessionUser, type User } from "./auth";

/** The D1 database (binding `DB` in wrangler.jsonc). */
export const db = (): Db => env.DB as unknown as Db;

/** "published" in production (verified activities only); "preview" locally and on staging. */
export const contentMode = (): ContentMode => ((env.CONTENT_MODE as string) === "published" ? "published" : "preview");

/** The signed-in admin for this request, if any (used for draft previews). */
export const requestUser = (req: Request): Promise<User | null> => sessionUser(db(), readCookie(req.headers.get("Cookie")));
