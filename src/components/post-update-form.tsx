"use client";

import { Icons } from "@/components/icons";
import { PostBinButton } from "@/components/post-bin-button";
import { PostForm } from "@/components/post-form";
import { PostRestoreButton } from "@/components/post-restore-button";
import { Tooltip } from "@/components/tooltip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks/use-locale";
import axios from "@/lib/axios";
import { clientHttpRequest, cn } from "@/lib/utils";
import { Dictionary } from "@/types/locale";
import { postUpdateSchema } from "@/validations/posts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ImageType, Post, Project, StudyCase } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { Image } from "./image";
import { Link } from "./link";
import { useSession } from "./session-provider";

export type PostUpdateFormProps = {
  post: Post & {
    image: ImageType | null;
    caseStudy: (StudyCase & { project: Project }) | null;
  };
  disabled?: boolean;
} & Dictionary["post-update-form"] &
  Dictionary["image-form"] &
  Dictionary["post-form"] &
  Dictionary["dialog"] &
  Dictionary["post-bin-button"] &
  Dictionary["post-restore-button"] &
  Dictionary["back-button"];

export function PostUpdateForm({
  dic: { "post-update-form": c, ...dic },
  post,
  disabled,
}: PostUpdateFormProps) {
  const locale = useLocale();
  const { user } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(disabled ?? false);
  const [open, setOpen] = useState<boolean>(false);

  const form = useForm<z.infer<typeof postUpdateSchema>>({
    mode: "onSubmit",
    resolver: zodResolver(postUpdateSchema),
    defaultValues: {
      id: post.id,
      title: post.title,
      content: post.content ?? "",
      platform: post.platform,
      postAt: post.postAt ?? new Date(),
      confirm: !!post?.["confirmedAt"],
    },
  });

  async function onSubmit({
    id,
    confirm,
    ...data
  }: z.infer<typeof postUpdateSchema>) {
    await clientHttpRequest(async () => {
      await axios({ locale, user }).patch(`/api/posts/${id}`, {
        ...data,
        confirmedAt: confirm ? new Date() : null,
        status: confirm ? "CONFIRMED" : "PENDING",
      });
      toast.success(c?.["updated successfully."]);
      setOpen(false);
      form.reset();
      router.refresh();
    }, setLoading);
  }

  return (
    <div className="container max-w-screen-sm space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-2">
          {/* <BackButton dic={dic} type="button" variant="ghost" size="sm" /> */}
          <h1 className="text-md font-semibold">{c?.["post details"]}</h1>

          <div>
            {post?.["deletedAt"] ? (
              <PostRestoreButton
                disabled={post?.["deletedAt"] ? false : disabled}
                dic={dic}
                asChild
                post={post}
              >
                <Button
                  disabled={post?.["deletedAt"] ? false : disabled}
                  variant="secondary"
                  size="sm"
                >
                  {c?.["restore post"]}
                </Button>
              </PostRestoreButton>
            ) : (
              <PostBinButton
                disabled={loading || disabled}
                dic={dic}
                asChild
                post={post}
              >
                <Button
                  disabled={loading || disabled}
                  size="sm"
                  variant="destructive"
                >
                  {c?.["delete post"]}
                </Button>
              </PostBinButton>
            )}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="hidden items-center justify-end md:flex">
            <Button type="submit" disabled={loading} size="sm">
              {!disabled && loading && <Icons.spinner />}
              {c?.["save changes"]}
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <div
                className={cn(
                  "relative h-full min-h-60 flex-col overflow-hidden rounded text-primary-foreground dark:border-r lg:flex"
                  // form.watch("image") && `bg-[src(${form.getValues("image")})]`,
                )}
              >
                {/* <div className="absolute inset-0" /> */}
                <Image src={post?.["image"]?.["src"]!} alt="" />

                <div className="absolute right-4 top-4 z-50 flex items-center gap-4 text-lg font-medium">
                  <Tooltip text={c?.["edit image"]}>
                    <div>
                      <Link
                        href={`/editors/images/${post?.["image"]?.["id"]}`}
                        disabled={loading}
                        className={buttonVariants({
                          variant: "outline",
                          size: "icon",
                        })}
                      >
                        <Icons.edit />
                      </Link>
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{c?.["post information"]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <PostForm.title
                  dic={dic}
                  form={form as any}
                  loading={loading}
                />
                <div>
                  <Label>{c?.["project name"]}</Label>
                  <Input
                    value={post?.["caseStudy"]?.["project"]?.["title"]}
                    disabled={true}
                  />
                </div>
                <PostForm.content
                  dic={dic}
                  form={form as any}
                  loading={loading}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <PostForm.contentLength
                    dic={dic}
                    form={form as any}
                    loading={true}
                  />
                  <PostForm.campaignType
                    dic={dic}
                    form={form as any}
                    loading={true}
                  />
                </div>
                <div className="grid items-center gap-4 md:grid-cols-[1fr,1fr]">
                  <PostForm.postAt
                    dic={dic}
                    form={form as any}
                    loading={loading}
                  />
                  <PostForm.noOfWeeks
                    dic={dic}
                    form={form as any}
                    loading={true}
                  />
                </div>

                <PostForm.confirmedAt
                  dic={dic}
                  form={form as any}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </div>
          <div className="flex items-center justify-center gap-2 md:hidden">
            {post?.["deletedAt"] ? (
              <PostRestoreButton
                disabled={post?.["deletedAt"] ? false : disabled}
                dic={dic}
                asChild
                post={post}
              >
                <Button
                  size="sm"
                  disabled={post?.["deletedAt"] ? false : disabled}
                  variant="secondary"
                >
                  {c?.["restore post"]}
                </Button>
              </PostRestoreButton>
            ) : (
              <PostBinButton
                disabled={loading || disabled}
                dic={dic}
                asChild
                post={post}
              >
                <Button
                  size="sm"
                  disabled={loading || disabled}
                  variant="destructive"
                >
                  {c?.["delete post"]}
                </Button>
              </PostBinButton>
            )}

            <Button
              disabled={loading || disabled}
              type="submit"
              size="sm"
              className="w-full"
            >
              {!disabled && loading && <Icons.spinner />}
              {c?.["save changes"]}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
