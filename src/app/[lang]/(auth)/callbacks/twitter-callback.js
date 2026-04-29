import { useRouter } from "next/router";
import { useEffect } from "react";

export default function TwitterCallback() {
  const router = useRouter();

  useEffect(() => {
    async function fetchToken() {
      const { code, state } = router.query;

      if (code && state) {
        try {
          const domain = process.env.NEXT_PUBLIC_SERVER_BASE_URL;
          const response = await fetch(
            `${domain}/twitter-callback?code=${code}&state=${state}`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (response.ok) {
            const data = await response.json();
            console.log("Access token received:", data.access_token);

            // Store the token or use it as needed
            // For example, you could save it in localStorage or a state management store
          } else {
            console.error("Error fetching access token", response.statusText);
          }
        } catch (error) {
          console.error("Error during callback processing", error);
        }
      }
    }

    fetchToken();
  }, [router.query]);

  return <div>Processing Twitter login...</div>;
}
