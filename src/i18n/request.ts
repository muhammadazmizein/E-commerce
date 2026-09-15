import { getRequestConfig } from "next-intl/server";

// English-only — there is no locale switcher, so this always resolves to
// the same messages file.
export default getRequestConfig(async () => {
  return {
    locale: "en",
    messages: (await import("../messages/en.json")).default,
  };
});
