"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dictionary } from "@/types/locale";
import { $Enums, Image as ImageType, Post, Project } from "@prisma/client";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Image } from "./image";
import { Link } from "./link";

type DashboardPostsBarChartProps = {
  posts: (Post & {
    image: ImageType | null;
    project: Project;
  })[];
} & Dictionary["dashboard-posts-bar-chart"];

export function DashboardPostsBarChart({
  dic: { "dashboard-posts-bar-chart": c },
  posts,
}: DashboardPostsBarChartProps) {
  const [choosenDate, setChoosenDate] = React.useState<string | null>(null);
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("FACEBOOK");

  const viewPlatforms = [
    "FACEBOOK",
    "INSTAGRAM",
    "LINKEDIN",
    "TWITTER",
  ] as $Enums.PLATFORM[];

  // Helper function to get the date range for previous, current, and next month
  function getDateRange() {
    const currentDate = new Date();
    const previousMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    const nextMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );

    return { previousMonth, currentDate, nextMonth };
  }

  const { previousMonth, currentDate, nextMonth } = getDateRange();

  // Use the actual post.postAt date for each post and map it accordingly
  const chartData = posts.reduce(
    (acc, post) => {
      const platform = post.platform;
      if (!post.postAt) return acc;
      const postAtDate = new Date(post.postAt).toISOString().split("T")[0]; // Get the postAt date

      // Find existing date entry or create a new one
      let dateEntry = acc.find((entry) => entry.date === postAtDate);

      if (!dateEntry) {
        dateEntry = {
          date: postAtDate,
          FACEBOOK: 0,
          INSTAGRAM: 0,
          LINKEDIN: 0,
          TWITTER: 0,
        };
        acc.push(dateEntry);
      }

      // Increment platform count based on post platform
      if (viewPlatforms.includes(platform)) dateEntry[platform] += 1;

      return acc;
    },
    [] as Array<{
      date: string;
      FACEBOOK: number;
      INSTAGRAM: number;
      LINKEDIN: number;
      TWITTER: number;
    }>,
  );

  // Populate the full 3-month date range for the chart, even if there are no posts for certain dates
  const fullDateRange = [];
  for (
    let d = new Date(previousMonth);
    d <= new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
    d.setDate(d.getDate() + 1)
  ) {
    const dateString = d.toISOString().split("T")[0];
    if (!chartData.some((entry) => entry.date === dateString)) {
      fullDateRange.push({
        date: dateString,
        FACEBOOK: 0,
        INSTAGRAM: 0,
        LINKEDIN: 0,
        TWITTER: 0,
      });
    }
  }

  // Merge full date range with actual chart data
  const mergedData = [...fullDateRange, ...chartData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const chartConfig = {
    views: {
      label: c?.["posts"],
    },
    FACEBOOK: {
      label: "Facebook",
      color: "hsl(var(--chart-1))",
    },
    INSTAGRAM: {
      label: "Instagram",
      color: "hsl(var(--chart-2))",
    },
    LINKEDIN: {
      label: "LinkedIn",
      color: "hsl(var(--chart-5))",
    },
    TWITTER: {
      label: "Twitter",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  const total = React.useMemo(
    () => ({
      FACEBOOK: chartData.reduce((acc, curr) => acc + curr.FACEBOOK, 0),
      INSTAGRAM: chartData.reduce((acc, curr) => acc + curr.INSTAGRAM, 0),
      LINKEDIN: chartData.reduce((acc, curr) => acc + curr.LINKEDIN, 0),
      TWITTER: chartData.reduce((acc, curr) => acc + curr.TWITTER, 0),
    }),
    [chartData],
  );

  return (
    <div className="rounded-none border-none">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>{c?.["posts"]}</CardTitle>
          <CardDescription>
            {c?.["showing total posts for the last 3 months."]}
          </CardDescription>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {viewPlatforms?.map((key) => {
            const chart = key as keyof typeof chartConfig;

            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {c?.[chart]}
                </span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {total?.[key as keyof typeof total]?.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={mergedData} // Use the merged full date range
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Bar
              dataKey={activeChart}
              fill={`var(--color-${activeChart})`}
              onClick={(e) => setChoosenDate(e?.["date"])}
              className="cursor-pointer"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>

      <Dialog
        open={!!choosenDate?.["length"]}
        onOpenChange={(o) => setChoosenDate(o ? "" : null)}
      >
        <DialogContent>
          {posts
            .filter(
              (p) =>
                p?.["platform"] === activeChart &&
                p?.["postAt"] &&
                p?.["postAt"].toLocaleDateString() ==
                  new Date(choosenDate ?? "").toLocaleDateString(),
            )
            ?.map((p, i) => (
              <Link
                key={i}
                href={`/dashboard/projects/${p?.["project"]?.["id"]}/cases/${p?.["caseStudyId"]}/posts/${p?.["id"]}`}
              >
                <Card>
                  <CardHeader className="flex flex-row items-start justify-start gap-4">
                    <div>
                      <Image
                        src={p?.["framedImageURL"] ?? p?.["image"]?.["src"]!}
                        alt=""
                        className="aspect-square max-h-20"
                      />
                    </div>
                    <div>
                      <CardTitle>{p?.["title"]}</CardTitle>
                      <CardDescription>
                        {c?.["project name"]}: {p?.["project"]?.["title"]}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}
