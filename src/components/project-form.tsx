"use client";

import { Icons } from "@/components/icons";
import { Image } from "@/components/image";
import { MapPicker } from "@/components/map";
import { Tooltip } from "@/components/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { platforms } from "@/db/enums";
import { useLocale } from "@/hooks/use-locale";
import axios from "@/lib/axios";
import { t } from "@/lib/locale";
import { clientAction, fileToBase64 } from "@/lib/utils";
import { Dictionary } from "@/types/locale";
import {
  projectCreateFormSchema,
  projectUpdateFormSchema,
} from "@/validations/projects";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { extractImagesFromPdf } from "sinsintro-pdf-extractor";
import { toast } from "sonner";
import * as z from "zod";
import { useSession } from "./session-provider";
import { Card, CardContent, CardHeader } from "./ui/card";

export type ProjectFormProps = {
  loading: boolean;
  form: UseFormReturn<
    | z.infer<typeof projectCreateFormSchema>
    | z.infer<typeof projectUpdateFormSchema>,
    any,
    undefined
  >;
} & Dictionary["project-form"];

export const ProjectForm = {
  title: ({ dic: { "project-form": c }, loading, form }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="title"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>{c?.["title"]?.["label"]}</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder={c?.["title"]?.["health center"]}
              disabled={loading}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  logo: ({
    dic: {
      "project-form": { logo: c },
    },
    loading,
    form,
  }: ProjectFormProps) => (
    <FormField
      control={form?.["control"]}
      name="logo"
      render={({ field }) => (
        <FormItem>
          <div className="relative flex aspect-square h-20 cursor-pointer items-center justify-center rounded-full border border-dashed p-0 transition-all hover:bg-gray-50">
            <div className="relative">
              {form.getValues("logo") ? (
                <>
                  <Image
                    src={form.getValues("logo")!}
                    alt=""
                    className="h-full w-full rounded-full"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute -right-5 -top-5 h-6 w-6"
                    disabled={loading}
                    onClick={() => form.resetField("logo")}
                  >
                    <Icons.x />
                  </Button>
                </>
              ) : (
                <Icons.image className="text-gray-500" />
              )}
            </div>

            <FormLabel className="sr-only">{c?.["label"]} </FormLabel>
            <FormControl>
              <Input
                {...field}
                type="file"
                accept="image/*"
                className="absolute h-full w-full cursor-pointer rounded-full p-0 opacity-0"
                disabled={loading}
                value={undefined}
                onChange={async (e) => {
                  form.resetField("logo");
                  const file = e?.["target"]?.["files"]?.[0];

                  if (file) {
                    // field.onChange(file);
                    const base64 = (await fileToBase64(file))?.toString();
                    form.setValue("logo", base64 ?? "");
                  }
                }}
              />
            </FormControl>
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  ),
  pdf: function Component({
    dic: {
      "project-form": { pdf: c },
    },
    loading,
    form,
  }: ProjectFormProps) {
    const locale = useLocale();
    const { user } = useSession();
    const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
    const { append } = useFieldArray({
      name: "properties",
      control: form?.["control"],
    });

    const uploadPdf = async () => {
      await clientAction(async () => {
        const base64Arr = await extractImagesFromPdf(
          form.getValues("pdfFile")!
        );
        console.log(base64Arr);
if(!base64Arr?.['length']) throw new Error("no images")

        const pdfImages: string[] = await axios({ user, locale })
          .post("/api/images", base64Arr)
          .then((r) => r?.["data"])
          .catch((err) => {
            console.error(
              "upload images error: ",
              err?.["response"] ? err?.["response"]?.["data"] : err?.["message"]
            );
          });
        // // upload into space
        // const formData = new FormData();
        // formData.append("file", form.getValues("pdfFile")!);

        // const pdfImages = await getPdfImages({
        //   locale,
        //   user,
        //   file: form.getValues("pdfFile"),
        // });
        // if (!(pdfImages ?? [])?.["length"]) throw new Error("No images");

if(!pdfImages?.['length']) throw new Error("no images")
        form.setValue("pdf", pdfImages );
        console.log(pdfImages );

        // get fields using pdgImages
        const data: {
          Title: string;
          Description: string;
          District: string;
          City: string;
          Country: string;
          Land_Area: string;
          Project_Assets: {
            Asset_Type: "Apartment" | "Villa";
            Title: string;
            No_Of_Units: string;
            Space: string;
            Finishing: string;
            Floors: string;
            Rooms: string;
            Bathrooms: string;
            Livingrooms: string;
          }[];
        } = await axios({ user, locale })
          .post(process.env.NEXT_PUBLIC_AI_API! + "/ar/pdf-data-extractor", {
            images: pdfImages ?? [],
          })
          .then((r) => r?.["data"])
          .catch((err) => {
            console.error(
              "pdf extractor error: ",
              err?.["response"] ? err?.["response"]?.["data"] : err?.["message"]
            );
          });

          if(!data ) throw new Error("no data")
        console.log("data: ", data);

        if (data?.["Title"] != "0") form.setValue("title", data?.["Title"]);
        if (data?.["Description"] != "0")
          form.setValue("description", data?.["Description"]);
        if (data?.["District"] != "0")
          form.setValue("distinct", data?.["District"]);
        if (data?.["City"] != "0") form.setValue("city", data?.["City"]);
        if (data?.["Country"] != "0")
          form.setValue("country", data?.["Country"]);
        if (data?.["Land_Area"] != "0")
          form.setValue("spaces", data?.["Land_Area"]);

        if (data?.["Project_Assets"]?.["length"]) {
          const aprts = data?.["Project_Assets"]?.filter(
            (e) => e?.["Asset_Type"] === "Apartment"
          );

          const villas = data?.["Project_Assets"]?.filter(
            (e) => e?.["Asset_Type"] === "Villa"
          );

          if (villas?.["length"])
            append(
              villas?.map((e) => ({
                type: "VILLA",
                projectId: "x",
                title: e?.["Title"] ?? "بدون إسم",
                price: "2,000,000",
                bathrooms: e?.["Bathrooms"] ?? "2",
                finishing: e?.["Finishing"] ?? "مودرن",
                floors: e?.["Floors"] ?? "2",
                livingrooms: e?.["Livingrooms"] ?? "1",
                units: e?.["No_Of_Units"] ?? "10",
                rooms: e?.["Rooms"] ?? "4",
                space: e?.["Space"] ?? "120",
              }))
            );

          if (aprts?.["length"])
            append(
              aprts?.map((e) => ({
                type: "APARTMENT",
                projectId: "x",
                title: e?.["Title"] ?? "بدون إسم",
                price: "2,000,000",
                bathrooms: e?.["Bathrooms"] ?? "2",
                finishing: e?.["Finishing"] ?? "مودرن",
                floors: e?.["Floors"] ?? "2",
                livingrooms: e?.["Livingrooms"] ?? "1",
                units: e?.["No_Of_Units"] ?? "10",
                rooms: e?.["Rooms"] ?? "4",
                space: e?.["Space"] ?? "120",
              }))
            );
        }
      }, setLoadingPdf).then(() => {
        toast.success(c?.["fields are filled using AI."]);
      });
    };

    return (
      <div className="flex flex-col items-center gap-4">
        <FormField
          control={form?.["control"]}
          name="pdfFile"
          render={({ field }) => (
            <FormItem>
              <div className="relative flex aspect-square h-20 cursor-pointer items-center justify-center rounded-full border border-dashed p-0 transition-all hover:bg-gray-50">
                <div>
                  <Icons.file className="text-gray-500" />
                  {form.watch("pdfFile") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="absolute -right-5 -top-5 h-6 w-6"
                      disabled={loading || loadingPdf}
                      onClick={() => form.resetField("pdfFile")}
                    >
                      <Icons.x />
                    </Button>
                  )}
                </div>
                <FormLabel className="sr-only">{c?.["label"]}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="file"
                    accept="application/pdf"
                    className="absolute h-full w-full cursor-pointer rounded-full p-0 opacity-0"
                    disabled={loading || loadingPdf}
                    value={undefined}
                    // onChange={(e) => {
                    //   const selectedFile = e?.target?.files[0];
                    //   if (selectedFile) {
                    //     form.setValue("pdfFile", selectedFile); // Set the selected file in the form state
                    //   }
                    // }}
                    onChange={async (e) => {
                      const selectedFile = e?.["target"]?.["files"]?.[0];
                      if (selectedFile) field.onChange(selectedFile);
                    }}
                  />
                </FormControl>
              </div>

              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch("pdfFile") && (
          <Button
            type="button"
            onClick={uploadPdf}
            disabled={loading || loadingPdf}
          >
            {loadingPdf && <Icons.spinner />}
            {c?.["fill fields using ai"]}
          </Button>
        )}
      </div>
    );
  },
  map: ({
    dic: {
      "project-form": { map: c },
    },
    loading,
    form,
  }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="map"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="sr-only">{c?.["label"]}</FormLabel>
          <FormControl>
            <Dialog>
              <DialogTrigger>
                <Tooltip text={c?.["choose on map"]} align="end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={loading}
                  >
                    <Icons.mapPicker />
                  </Button>
                </Tooltip>
              </DialogTrigger>
              <DialogContent>
                <MapPicker />
              </DialogContent>
            </Dialog>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  description: ({
    dic: { "project-form": c },
    loading,
    form,
  }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel> {c?.["description"]?.["label"]}</FormLabel>
          <FormControl>
            <Textarea
              placeholder={c?.["description"]?.["describe your project"]}
              disabled={loading}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  distinct: ({
    dic: { "project-form": c },
    loading,
    form,
  }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="distinct"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel> {c?.["distinct"]?.["label"]}</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder={c?.["distinct"]?.["nasr city"]}
              disabled={loading}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  city: ({ dic: { "project-form": c }, loading, form }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="city"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>{c?.["city"]?.["label"]}</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder={c?.["city"]?.["cairo"]}
              disabled={loading}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  country: ({
    dic: { "project-form": c },
    loading,
    form,
  }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="country"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel> {c?.["country"]?.["label"]}</FormLabel>
          <FormControl>
            <Input
              type="text"
              placeholder={c?.["country"]?.["egypt"]}
              disabled={loading}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  spaces: ({ dic: { "project-form": c }, loading, form }: ProjectFormProps) => (
    <FormField
      control={form.control}
      name="spaces"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{c?.["spaces"]?.["label"]}</FormLabel>
          <FormControl>
            <Input type="text" disabled={loading} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ),
  // propertyTypes: ({ dic:{"project-form": c},loading, form }: ProjectFormProps) => (
  //   <FormField
  //     control={form.control}
  //     name="propertyTypes"
  //     render={({ field }) => (
  //       <FormItem>
  //         <FormLabel>Type of {c?.['propertyTypes']?.['label']}</FormLabel>
  //         <FormControl>
  //           <Select
  //             onValueChange={field.onChange}
  //             defaultValue={field.value}
  //             disabled={loading}
  //           >
  //             <FormControl>
  //               <SelectTrigger>
  //                 <SelectValue placeholder="Select your project type" />
  //               </SelectTrigger>
  //             </FormControl>
  //             <SelectContent>
  //               {propertyTypes?.map((e, i) => (
  //                 <SelectItem key={i} value={e?.["value"]}>
  //                   {e?.["label"]}
  //                 </SelectItem>
  //               ))}
  //             </SelectContent>
  //           </Select>
  //         </FormControl>
  //         <FormMessage />
  //       </FormItem>
  //     )}
  //   />
  // ),
  platforms: function Component({
    dic: {
      "project-form": { platforms: c },
    },
    loading,
    form,
    limit,
  }: ProjectFormProps & {
    limit?: number;
  }) {
    const lang = useLocale();
    const router = useRouter();
    const [connectLoading, setConnectLoading] = useState<number | null>(null);
    const { fields, remove, append } = useFieldArray({
      name: "platforms",
      control: form?.["control"],
    });

    function connectSocial(i: number) {
      setConnectLoading(i);

      toast.promise(
        new Promise((resolve, reject) => {
          let receiveMessage: (event: MessageEvent) => void;
          try {
            const platform = form.getValues(`platforms.${i}`);
            const domain = process.env.NEXT_PUBLIC_SERVER_BASE_URL;

            let authWindow: Window | null = null;

            if (platform.value === "TWITTER") {
              console.log("Opening Twitter sign-in in a new window");

              const width = 600;
              const height = 700;
              const left = window.screen.width / 2 - width / 2;
              const top = window.screen.height / 2 - height / 2;

              authWindow = window.open(
                `${domain}/twitter-login`,
                "Twitter Login",
                `width=${width},height=${height},top=${top},left=${left}`
              );

              receiveMessage = (event: MessageEvent) => {
                if (event.origin !== domain) return; // Ensure the message comes from your domain

                if (event.data.type === "TWITTER_AUTH_SUCCESS") {
                  console.log("Twitter access token: ", event.data.accessToken);
                  console.log(
                    "Twitter access token: ",
                    event.data.refreshToken
                  );

                  // Set the client ID in the form
                  form.setValue(
                    `platforms.${i}.clientId`,
                    event.data.accessToken
                  );
                  form.setValue(
                    `platforms.${i}.refreshToken`,
                    event.data.refreshToken
                  );

                  // Close the window after successful authentication
                  authWindow?.close();

                  // Remove the message event listener
                  window.removeEventListener("message", receiveMessage);

                  // Resolve the promise
                  resolve({
                    clientId: event.data.accessToken,
                    refreshToken: event.data.refreshToken,
                  });
                }
              };

              // Add the message event listener
              window.addEventListener("message", receiveMessage);
            } else if (platform.value === "LINKEDIN") {
              console.log("Opening LinkedIn sign-in in a new window");

              const width = 600;
              const height = 700;
              const left = window.screen.width / 2 - width / 2;
              const top = window.screen.height / 2 - height / 2;

              authWindow = window.open(
                `${domain}/linkedin-login`,
                "LinkedIn Login",
                `width=${width},height=${height},top=${top},left=${left}`
              );

              receiveMessage = (event: MessageEvent) => {
                if (event.origin !== domain) return; // Ensure the message comes from your domain

                if (event.data.type === "LINKEDIN_AUTH_SUCCESS") {
                  console.log(
                    "LinkedIn access token: ",
                    event.data.accessToken
                  );
                  console.log("LinkedIn access urn: ", event.data.urn);

                  // Set the client ID in the form
                  form.setValue(
                    `platforms.${i}.clientId`,
                    event.data.accessToken
                  );
                  form.setValue(`platforms.${i}.urn`, event.data.urn);

                  console.log(form.getValues(`platforms.${i}`));

                  // Close the window after successful authentication
                  authWindow?.close();

                  // Resolve the promise
                  resolve({ clientId: event.data.accessToken });
                }
              };
            } else {
              // Handle other platforms if needed
              receiveMessage = (event: MessageEvent) => {
                resolve({ clientId: "1" });
              };
            }

            // Listen for the message event
            window.addEventListener("message", receiveMessage, false);

            // Polling to check if the authWindow has been closed by the user
            const checkWindowClosed = setInterval(() => {
              if (authWindow?.closed) {
                clearInterval(checkWindowClosed);
                window.removeEventListener("message", receiveMessage);

                // If the window was closed without receiving the token, reject the promise
                reject(
                  new Error(
                    "Authentication window was closed before completing the process."
                  )
                );
              }
            }, 500);
          } catch (err) {
            reject(err);
          }
        }),
        {
          finally: () => setConnectLoading(null),
          error: async (err) => {
            const msg = await t(err?.["message"], { from: "en", to: lang });
            return msg;
          },
          success: (data) => {
            router.refresh();
            return c?.["connected successfully."];
          },
        }
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <FormLabel>{c?.["label"]}</FormLabel>
            <Button
              type="button"
              size="icon"
              // @ts-ignore
              onClick={() => append({})}
              disabled={limit ? fields?.["length"] == limit : loading}
            >
              <Icons.add />
            </Button>
          </div>
        </CardHeader>

        {fields.map((field, i) => (
          <CardContent key={i} className="flex items-start gap-2">
            <FormField
              control={form.control}
              name={`platforms.${i}.value`}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <div className="flex items-center justify-center gap-2">
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={
                          loading ||
                          connectLoading == i ||
                          !!form?.getValues(`platforms.${i}.clientId`)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={c?.["select your platform"]}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {platforms(lang)?.map((e, i) => {
                            const Icon = Icons?.[e?.["icon"]] ?? null;
                            return (
                              <SelectItem
                                key={i}
                                value={e?.["value"]}
                                disabled={
                                  !!form
                                    ?.getValues("platforms")
                                    ?.find((p) => p?.["value"] === e?.["value"])
                                }
                              >
                                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                                  {Icon && <Icon />}
                                  <span>{e?.["label"]}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              onClick={() => connectSocial(i)}
              disabled={
                loading ||
                connectLoading == i ||
                !!form?.getValues(`platforms.${i}.clientId`)
              }
            >
              {connectLoading == i && <Icons.spinner />}
              {form?.getValues(`platforms.${i}.clientId`)
                ? c?.["connected"]
                : c?.["connect"]}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => remove(i)}
              disabled={loading || connectLoading == i}
            >
              <Icons.x />
            </Button>
          </CardContent>
        ))}
      </Card>
    );
  },
};