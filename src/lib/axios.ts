import { Locale } from "@/types/locale";
import Axios from "axios";
import { User } from "lucia";

/**
 * Backend HTTP client. Uses the JWT cookie (`ar_session`) for auth via
 * `withCredentials: true`. The legacy `user` header is sent during the
 * migration window (controlled by NEXT_PUBLIC_LEGACY_USER_HEADER) so the
 * backend can fall back when a fresh JWT cookie isn't yet present.
 */
const axios = ({
  locale,
  user,
  workspaceSlug,
}: {
  locale: Locale;
  user: User | null;
  workspaceSlug?: string | null;
}) => {
  const sendLegacy = process.env.NEXT_PUBLIC_LEGACY_USER_HEADER !== "disabled";

  const headers: Record<string, string> = {
    locale,
    "Content-Type": "application/json",
  };

  if (workspaceSlug) headers["x-workspace-slug"] = workspaceSlug;
  if (sendLegacy && user) {
    headers.user = btoa(encodeURIComponent(JSON.stringify(user)));
  }

  return Axios.create({
    baseURL: process.env.NEXT_PUBLIC_SERVER_BASE_URL,
    withCredentials: true,
    headers,
  });
};

export default axios;
