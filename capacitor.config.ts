import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.marqueone.app",
  appName: "MARQUE ONE",
  webDir: "public",
  server: {
    url: "https://hall-management-app.vercel.app",
    cleartext: false,
  },
};

export default config;
