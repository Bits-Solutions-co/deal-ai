"use client";

import { platforms } from "@/db/enums";
import { useLocale } from "@/hooks/use-locale";
import { cn, getMonth } from "@/lib/utils";
import { Dictionary } from "@/types/locale";
import {
  Image as ImageType,
  Platform,
  Post,
  Project,
  StudyCase,
} from "@prisma/client";
import dayjs from "dayjs";
import { Fragment, useEffect, useState } from "react";
import { DialogResponsive } from "./dialog";
import { Icons } from "./icons";
import { PostUpdateForm } from "./post-update-form";
import { Badge } from "./ui/badge";
import { Button, buttonVariants } from "./ui/button";
import { Link } from "./link";

export type SchedulerProps = {
  posts: (Post & {
    image: ImageType | null;
    caseStudy: (StudyCase & { project: Project & { platforms: Platform[] } }) | null;
  })[];
} & Dictionary["scheduler"] &
  Dictionary["post-update-form"] &
  Dictionary["image-form"] &
  Dictionary["post-form"] &
  Dictionary["dialog"] &
  Dictionary["post-bin-button"] &
  Dictionary["post-restore-button"] &
  Dictionary["back-button"] &
  Dictionary["constants"];

export function Scheduler({
  dic: { scheduler: c, ...dic },
  posts,
}: SchedulerProps) {
  const [currenMonth, setCurrentMonth] = useState(getMonth());
  const [monthIndex, setMonthIndex] = useState(dayjs().month());

  useEffect(() => {
    setCurrentMonth(getMonth(monthIndex));
  }, [monthIndex]);

  function handlePrevMonth() {
    setMonthIndex(monthIndex - 1);
  }
  function handleNextMonth() {
    setMonthIndex(monthIndex + 1);
  }
  function handleReset() {
    setMonthIndex(
      monthIndex === dayjs().month()
        ? monthIndex + Math.random()
        : dayjs().month(),
    );
    publish();
  }

  function publish() {
    console.log("attempting to publish");
    const domain = process.env.NEXT_PUBLIC_SERVER_BASE_URL;
    posts.forEach(async (post) => {
      console.log("in the posts array");
      let currentDate = new Date();

      // Extract platforms from posts
      const platforms = posts.flatMap(
        (post) => post.caseStudy?.project?.platforms ?? [],
      );

      if (post.platform === "LINKEDIN") {
        const targetedPlatform = platforms.find((e) => e.value === "LINKEDIN");
        console.log("targetedPlatform: ", targetedPlatform);

        if (post.postAt && post.postAt < currentDate) {
          const data = {
            text: post.content,
            access_token: targetedPlatform?.clientId,
            urn: targetedPlatform?.urn,
          };

          console.log(data);

          try {
            const response = await fetch(domain + "/linkedin-post", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              console.log("failed");
              throw new Error("Network response was not ok");
            }

            const result = await response.json();
            console.log("LinkedIn post result:", result);
          } catch (error) {
            console.error("Error posting to LinkedIn:", error);
          }
        }
      } else if (post.platform === "TWITTER") {
        const targetedPlatform = platforms.find((e) => e.value === "TWITTER");
        console.log(platforms);

        if (post.postAt && post.postAt < currentDate) {
          const data = {
            text: post.content,
            access_token: targetedPlatform?.clientId,
          };

          console.log(data);

          try {
            const response = await fetch(domain + "/post-tweet", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              console.log("failed");
              throw new Error("Network response was not ok");
            }

            const result = await response.json();
            console.log("Twitter post result:", result);
          } catch (error) {
            console.error("Error posting to Twitter:", error);
          }
        }
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center gap-4">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleReset}>
            {c?.["today"]}
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <Icons.chevronLeft className="rtl:rotate-180" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <Icons.chevronRight className="rtl:rotate-180" />
          </Button>
        </div>

        <h2 className="font-bold">
          {dayjs(new Date(dayjs().year(), monthIndex)).format("MMMM YYYY")}
        </h2>
      </header>

      <Month dic={dic} month={currenMonth} posts={posts} />
    </div>
  );
}

export function Month({
  dic,
  month,
  posts,
}: {
  month: dayjs.Dayjs[][];
  posts: (Post & {
    image: ImageType | null;
    caseStudy: (StudyCase & { project: Project }) | null;
  })[];
} & Dictionary["post-update-form"] &
  Dictionary["image-form"] &
  Dictionary["post-form"] &
  Dictionary["dialog"] &
  Dictionary["post-bin-button"] &
  Dictionary["post-restore-button"] &
  Dictionary["back-button"] &
  Dictionary["constants"]) {
  return (
    <div className="grid flex-1 grid-cols-7 grid-rows-5">
      {month.map((row, i) => (
        <Fragment key={i}>
          {row.map((day, idx) => (
            <Day dic={dic} day={day} key={idx} rowIdx={i} posts={posts} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

export function Day({
  dic: { constants, ...dic },
  day,
  rowIdx,
  posts,
}: {
  day: dayjs.Dayjs;
  rowIdx: number;
  posts: (Post & {
    image: ImageType | null;
    caseStudy: (StudyCase & { project: Project }) | null;
  })[];
} & Dictionary["post-update-form"] &
  Dictionary["image-form"] &
  Dictionary["post-form"] &
  Dictionary["dialog"] &
  Dictionary["post-bin-button"] &
  Dictionary["post-restore-button"] &
  Dictionary["back-button"] &
  Dictionary["constants"]) {
  const lang = useLocale();
  const [open, setOpen] = useState(false);
  const filteredPosts = posts.filter(
    (p) => day.format("DD-MM-YY") === dayjs(p?.["postAt"]).format("DD-MM-YY"),
  );

  const dayObj = constants?.days?.[day.day()] ?? null;
  // day.format("ddd")
  return (
    <div
      className={cn(
        "flex flex-1 flex-col border border-muted-foreground p-0.5",
      )}
    >
      <header className="flex flex-col items-center">
        {rowIdx === 0 && (
          <p className="mt-1 text-sm">
            {dayObj?.["label"] ?? day.format("ddd")?.toUpperCase()}
          </p>
        )}
        <p
          className={cn(
            "my-1 p-1 text-center text-xs",
            // today classes
            day.format("DD-MM-YY") === dayjs().format("DD-MM-YY")
              ? "w-7 rounded-full bg-primary text-primary-foreground"
              : "",
            // day.format("MM") !== dayjs().format("MM")
            //   ? "text-destructive line-through"
            //   : "",
          )}
        >
          {day.format("DD")}
        </p>
      </header>

      <div
        className="flex flex-1 cursor-pointer flex-col gap-0.5"
        onClick={() => {
          // setDaySelected(day);
          // setShowEventModal(true);
        }}
      >
        {filteredPosts?.map((evt, i) => {
          const p = platforms(lang).find(
            (p) => p?.["value"] === evt?.["platform"],
          );
          const Icon = Icons?.[p?.["icon"]!] ?? null;

          return (
            <Link
              key={i}
              href={`/dashboard/projects/${evt?.['caseStudy']?.['projectId']}/cases/${evt?.['caseStudyId']}/posts/${evt?.['id']}?to=/dashboard/calender`}
            disabled={
              // evt?.["postAt"] < new Date() ||
              evt?.["status"] === "PUBLISHED"
            }
              className={cn(
              buttonVariants({}),
                "relative justify-between gap-2 px-1 text-xs"
            )}
          >
            <Badge
              variant={
                evt?.["status"] === "PUBLISHED" ? "highlight" : "secondary"
              }
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-full"
            >
              {evt?.["status"]}
              </Badge>
              
            <div className="flex flex-col items-start">
              <h6>{evt?.["caseStudy"]?.["project"]?.["title"]}</h6>
              <p className="text-[9px] text-muted-foreground">
                {evt?.["title"]}
              </p>
            </div>

            <div>{Icon && <Icon />}</div>
            </Link>
            

            // <DialogResponsive
            //   key={i}
            //   dic={dic}
            //   content={
            //     <PostUpdateForm
            //       key={i}
            //       disabled={evt?.["postAt"] < new Date()}
            //       post={evt}
            //       dic={dic}
            //     />
            //   }
            //   title={""}
            //   description={""}
            //   open={open}
            //   setOpen={setOpen}
            // >
          //   <Button
          //   disabled={
          //     // evt?.["postAt"] < new Date() ||
          //     evt?.["status"] === "PUBLISHED"
          //   }
          //   className="relative justify-between gap-2 px-1 text-xs"
          // >
          //   <Badge
          //     variant={
          //       evt?.["status"] === "PUBLISHED" ? "highlight" : "secondary"
          //     }
          //     className="absolute left-0 top-0 -translate-x-1/2 -translate-y-full"
          //   >
          //     {evt?.["status"]}
          //   </Badge>
          //   <div className="flex flex-col items-start">
          //     <h6>{evt?.["caseStudy"]?.["project"]?.["title"]}</h6>
          //     <p className="text-[9px] text-muted-foreground">
          //       {evt?.["title"]}
          //     </p>
          //   </div>

          //   <div>{Icon && <Icon />}</div>
          //   </Button> 
            // </DialogResponsive>
          );
        })}
      </div>
    </div>
  );
}
