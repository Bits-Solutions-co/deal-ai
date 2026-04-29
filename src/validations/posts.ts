import {
  platformsArr,
  postCampaignArr,
  postContentLengthArr,
} from "@/db/enums";
import { z } from "@/lib/zod";

export const postSchema = z.object(
  // <Record<keyof Omit<Post, "createdAt">, any>>
  {
    id: z.string("id"),
    caseStudyId: z.string("caseStudyId"),
    imageId: z.string("imageId").optional().nullable(),
    framedImageURL: z.stringNotRequired("framed-image").optional().nullable(),
    title: z.string("title"),
    content: z.string("content"),
    noOfWeeks: z.string("no of weeks"),
    campaignType: z.enum(postCampaignArr),
    contentLength: z.enum(postContentLengthArr),
    platform: z.enum(platformsArr),
    postAt: z.date("post at"),

    deletedAt: z.date("deletedAt").nullable(),
    confirmedAt: z.date("confirmedAt").optional(),
  },
);

export const postCreateSchema = postSchema
  .pick({
    caseStudyId: true,
    noOfWeeks: true,
    campaignType: true,
    contentLength: true,
  })
  .extend({
    platforms: z
      .array(z.enum(platformsArr))
      .min(1, "Select at least one platform."),
  });

export const postUpdateSchema = postSchema
  .pick({
    id: true,
    title: true,
    content: true,
    // noOfWeeks: true ,
    // campaignType: z.enum(postCampaignArr),
    // contentLength: z.enum(postContentLengthArr),
    platform: true,
    postAt: true,
  })
  .and(z.object({ confirm: z.boolean("confirm") }));

export const postUpdateContentSchema = postSchema.pick({
  id: true,
  content: true,
});
export const postUpdateImageSchema = postSchema.pick({
  id: true,
  imageId: true,
});
export const postUpdateScheduleSchema = postSchema.pick({
  id: true,
  postAt: true,
});

export const postDeleteSchema = postSchema.pick({ id: true });
export const postBinSchema = postSchema.pick({
  id: true,
  deletedAt: true,
});
export const postRestoreSchema = postSchema.pick({
  id: true,
});
