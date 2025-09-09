import { defineConfig } from "vocs";

export default defineConfig({
  title: "Glyfs Documentation",
  description:
    "Complete API documentation for the Glyfs infrastructure platform",

  basePath: "/docs",

  sidebar: [
    {
      text: "Getting Started",
      items: [
        { text: "Introduction", link: "/getting-started" },
        { text: "Quick Start", link: "/quick-start" },
        { text: "Authentication", link: "/authentication" },
      ],
    },
    {
      text: "API Reference",
      items: [
        { text: "Overview", link: "/api/" },
        { text: "Invoke API", link: "/api/invoke" },
        { text: "Streaming API", link: "/api/streaming" },
      ],
    },
    {
      text: "Examples",
      items: [
        { text: "JavaScript/TypeScript", link: "/examples/javascript" },
        { text: "Python", link: "/examples/python" },
        { text: "cURL", link: "/examples/curl" },
      ],
    },
    {
      text: "Tools & MCP",
      items: [
        { text: "Overview", link: "/tools/" },
        { text: "MCP Integration", link: "/tools/mcp" },
      ],
    },
  ],

  topNav: [
    { text: "API Reference", link: "/api/" },
    { text: "Examples", link: "/examples/" },
  ],

  theme: {
    colorScheme: "system",
  },

  search: {
    boostDocument: (id) => {
      if (id.includes("/api/")) return 2;
      if (id.includes("/authentication")) return 1.5;
      return 1;
    },
  },
});
