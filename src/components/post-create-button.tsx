"use client";

import { DialogResponsive, DialogResponsiveProps } from "@/components/dialog";
import { Icons } from "@/components/icons";
import { PostForm } from "@/components/post-form";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useLocale } from "@/hooks/use-locale";
import axios from "@/lib/axios";
import { isAxiosError } from "axios";
import { clientHttpRequest } from "@/lib/utils";
import { Dictionary } from "@/types/locale";
import { platformsArr } from "@/db/enums";
import { postCreateSchema } from "@/validations/posts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Platform, Project, StudyCase } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useSession } from "./session-provider";

export type PostCreateButtonProps = {
  caseStudy: StudyCase;
  project: Project & { platforms: Platform[] };
} & Omit<DialogResponsiveProps, "open" | "setOpen"> &
  Dictionary["post-create-button"] &
  Dictionary["post-form"] &
  Dictionary["dialog"];

export function PostCreateButton({
  dic: { "post-create-button": c, ...dic },
  caseStudy,
  project,
  disabled,
  ...props
}: PostCreateButtonProps) {
  const locale = useLocale();
  const { user } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(disabled ?? false);
  const [open, setOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof postCreateSchema>>({
    resolver: zodResolver(postCreateSchema),
    defaultValues: {
      caseStudyId: caseStudy?.["id"],
      platforms: project?.platforms?.length
        ? project.platforms.map((p) => p.value)
        : [...platformsArr],
    },
  });

  let firstSuccess = false; // Flag to track the first successful post

  async function handleAxiosRequest(postData: any){
    await axios({ locale, user }).post(`/api/posts`, postData);
    if (!firstSuccess) {
      firstSuccess = true;
      // Stop loading and close the dialog
      setLoading(false);
      setOpen(false);
      form.reset();
      toast.success("Post created successfully.");
      router.refresh();
    } else {
      // For subsequent posts, just refresh the UI
      toast.success(`Another post created successfully.`);
      router.refresh();
    }
  }

  async function onSubmit(data: z.infer<typeof postCreateSchema>) {
    await clientHttpRequest(async () => {
      try {
        if (!locale || !user) {
          throw new Error("Locale or user information is missing.");
        }

        firstSuccess = false;

        const generateResponse = await axios({ locale, user }).post(
          `/api/ideas`,
          {
            ...data,
            project,
            caseStudy,
          },
        );

        if (generateResponse.data.success) {
          const contentIdeas = generateResponse.data.data;

          // Calculate the starting date for each account to ensure unique dates
          let currentDate = new Date();

          if (!contentIdeas || typeof contentIdeas !== "object") {
            throw new Error(
              "Invalid content ideas format received from the server.",
            );
          }

          const postPromises: Promise<any>[] = [];

          for (const platform in contentIdeas) {
            if (contentIdeas.hasOwnProperty(platform)) {
              const ideas = contentIdeas[platform];

              let noOfPostsPerWeek =
                data.campaignType === "BRANDING_AWARENESS" ||
                data.campaignType === "ENGAGEMENT"
                  ? 5
                  : 3;

              const numOfIdeas = Array.isArray(ideas) ? ideas.length : 0;

              const daysToPost =
                noOfPostsPerWeek === 3 ? [0, 2, 4] : [0, 1, 2, 3, 4];

              if (Array.isArray(ideas)) {
                ideas.forEach((idea: any) => {
                  currentDate.setDate(currentDate.getDate() + 1);

                  // Adjust currentDate to the next valid posting day
                  while (!daysToPost.includes(currentDate.getDay()))
                    currentDate.setDate(currentDate.getDate() + 1);

                  const randomHour = Math.floor(Math.random() * (20 - 11) + 11);
                  currentDate.setHours(randomHour, 0, 0);

                  const postData = {
                    ...data,
                    project,
                    caseStudy,
                    idea,
                    platform,
                    date: currentDate,
                  };

                  postPromises.push(
                    handleAxiosRequest(postData),
                  );
                });
              } else {
                console.warn(
                  `Ideas for platform "${platform}" are not in an array format.`,
                );
              }
            }
          }

          if (postPromises.length === 0) {
            console.warn("No post creation requests to process.");
          }

          const postResponses = await Promise.all(postPromises);

          postResponses.forEach((result, index) => {
            const postResponse = result;
            console.log(postResponse);
            if (postResponse.status === 201) {
              console.log(
                `Post ${index + 1} created successfully:`
              );
            } else {
              console.error(
                `Failed to create Post ${index + 1}:`
              );
            }
          });

          console.log("Content Ideas Generated:", contentIdeas);

          toast.success("Posts created successfully.");
          setOpen(false);
          form.reset();
          router.refresh();
        } else {
          console.error(
            "Failed to generate content ideas:",
            generateResponse.data.error,
          );
          toast.error(
            generateResponse.data.error || "Failed to generate content ideas.",
          );
        }
      } catch (error: any) {
        if (isAxiosError(error)) {
          if (error.response) {
            console.error(
              "Server Error:",
              error.response.data.error || error.message,
            );
            toast.error(
              error.response.data.error || "An error occurred on the server.",
            );
          } else if (error.request) {
            console.error("Network Error:", error.message);
            toast.error("Network error. Please try again.");
          } else {
            console.error("Error:", error.message);
            toast.error(error.message || "An unexpected error occurred.");
          }
        } else {
          console.error("Unexpected Error:", error.message);
          toast.error(error.message || "An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    }, setLoading);
  }

  return (
    <DialogResponsive
      dic={dic}
      disabled={loading}
      confirmButton={
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <Button disabled={loading} className="w-full md:w-fit">
                {!disabled && loading && <Icons.spinner />}
                {c?.["submit"]}
              </Button>
            </form>
          </Form>
        </>
      }
      content={
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              <PostForm.noOfWeeks
                dic={dic}
                form={form as any}
                loading={loading}
              />
              <PostForm.campaignType
                dic={dic}
                form={form as any}
                loading={loading}
              />
              <PostForm.contentLength
                dic={dic}
                form={form as any}
                loading={loading}
              />
              <PostForm.platforms
                dic={dic}
                form={form as any}
                loading={loading}
              />
            </form>
          </Form>
        </>
      }
      title={c?.["create posts"]}
      description={
        c?.[
          "streamline your marketing efforts by generating and scheduling posts across all your platforms using AI, and automatically publishes it at optimal times, maximizing reach and engagement."
        ]
      }
      open={open}
      setOpen={setOpen}
      {...props}
    />
  );
}
