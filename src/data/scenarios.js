export const scenarioPacks = [
  {
    id: "smoke",
    name: "Smoke",
    description: "Open the target app and verify that the page renders.",
    command: "smoke"
  },
  {
    id: "release-video",
    name: "Release Video",
    description: "Reserved for scripted walkthroughs with video output.",
    command: "release-video"
  },
  {
    id: "custom",
    name: "Custom",
    description: "Use this as a starter profile for app-specific scenario packs.",
    command: "custom"
  }
];

export const appProfiles = [
  {
    id: "customer-webapp",
    name: "Customer Webapp",
    targetUrl: "http://127.0.0.1:5173",
    scenarioPack: "smoke",
    viewportWidth: 393,
    viewportHeight: 852
  },
  {
    id: "blank-local",
    name: "Local App",
    targetUrl: "http://127.0.0.1:3000",
    scenarioPack: "smoke",
    viewportWidth: 393,
    viewportHeight: 852
  }
];
