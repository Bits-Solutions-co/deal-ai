"use client";

import { DataTable, DataTableProps } from "@/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";
import { DataTableRowActions } from "@/components/data-table-row-actions";
import { Link } from "@/components/link";
import {
  PostDeleteButton,
  PostDeleteButtonProps,
} from "@/components/post-delete-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Dictionary } from "@/types/locale";
import { Post, StudyCase } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import {
  PostRestoreButton,
  PostRestoreButtonProps,
} from "./post-restore-button";

type ColumnType = Post & { caseStudy: StudyCase | null };

type BinPostsTableProps = {
  data: ColumnType[];
} & Pick<DataTableProps<any, any>, "dic"> &
  Pick<PostDeleteButtonProps, "dic"> &
  Pick<PostRestoreButtonProps, "dic"> &
  Dictionary["dashboard"];

export function BinPostsTable({
  dic: {
    dashboard: {
      user: {
        projects: {
          project: {
            properties: { table: c },
          },
        },
      },
    },
    ...dic
  },
  data,
}: BinPostsTableProps) {
  return (
    <DataTable
      dic={dic}
      data={data}
      columns={
        [
          {
            accessorKey: "title",
            header: ({ column }) => (
              <DataTableColumnHeader
                dic={dic}
                column={column}
                title={c?.["name"]}
              />
            ),
            cell: ({ row: { original: r } }) => (
              <Link
                href={`/dashboard/projects/${r?.["caseStudy"]?.["projectId"]}/cases/${r?.["caseStudyId"]}/posts/${r?.["id"]}`}
                className={buttonVariants({
                  variant: "link",
                  className: "flex-col items-start justify-start",
                })}
              >
                <CardTitle>{r?.["title"]}</CardTitle>
              </Link>
            ),
            enableSorting: false,
            enableHiding: false,
          },
          {
            accessorKey: "deletedAt",
            header: ({ column }) => (
              <DataTableColumnHeader
                dic={dic}
                column={column}
                title={c?.["deletedAt"]}
              />
            ),
            cell: ({ row: { original: r } }) => (
              <div className="flex items-center gap-2">
                {new Date(r?.["deletedAt"]!)?.toLocaleDateString()}
              </div>
            ),
            enableSorting: false,
            enableHiding: false,
          },
          {
            id: "actions",
            cell: ({ row: { original: r } }) => {
              return (
                <>
                  <DataTableRowActions dic={dic}>
                    <PostRestoreButton dic={dic} asChild post={r}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-2 text-start font-normal"
                      >
                        {c?.["restore"]}
                      </Button>
                    </PostRestoreButton>
                    <DropdownMenuSeparator />

                    <PostDeleteButton dic={dic} asChild post={r}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start px-2 text-start font-normal"
                      >
                        {c?.["delete"]}
                        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                      </Button>
                    </PostDeleteButton>
                  </DataTableRowActions>
                </>
              );
            },
          },
        ] as ColumnDef<ColumnType>[]
      }
    />
  );
}
