export const formatImageUrl = (url?: string | null) => {
  if (!url) return "";
  
  if (url.startsWith("/") || url.startsWith("data:")) return url;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  if (url.includes("r2.dev") || url.includes("cloudflarestorage.com")) {
    let storageKey = "";
    if (url.includes(".r2.dev/")) {
      const parts = url.split(".r2.dev/");
      if (parts.length > 1) storageKey = parts[1];
    } else {
      const parts = url.split("cloudflarestorage.com/");
      if (parts.length > 1) {
        // Strip leading slash if exists
        const path = parts[1].replace(/^\//, "");
        const pathParts = path.split("/");
        if (pathParts[0] === "torquescout-listings") {
          storageKey = pathParts.slice(1).join("/");
        } else {
          storageKey = path;
        }
      }
    }

    if (storageKey) {
      return `${API_URL}/listings/media-proxy/${storageKey}`;
    }
  }

  return url;
};
