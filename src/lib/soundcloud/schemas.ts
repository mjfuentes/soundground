import { z } from "zod";

export const soundcloudUserSchema = z.object({
  avatar_url: z.string().url().optional(),
  city: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  followers_count: z.number(),
  followings_count: z.number(),
  full_name: z.string().nullable().optional(),
  id: z.number(),
  permalink: z.string(),
  permalink_url: z.string().url(),
  playlist_count: z.number(),
  track_count: z.number(),
  username: z.string(),
  verified: z.boolean(),
  public_favorites_count: z.number().optional(), // User's likes given
  reposts_count: z.number().optional(), // User's reposts made
  comments_count: z.number().optional(), // User's comments made
  visuals: z
    .object({
      urn: z.string(),
      visual_url: z.string().url(),
      entries: z
        .array(
          z.object({
            visual_url: z.string().url(),
          })
        )
        .optional(),
    })
    .nullable()
    .optional(),
});

export const soundcloudHydrationSchema = z.array(
  z.object({
    hydratable: z.string(),
    data: z.unknown(),
  })
);

export type SoundcloudUser = z.infer<typeof soundcloudUserSchema>;
