import type { Config } from "tailwindcss";

const config: Config = {
  // Make sure these paths match where your components are!
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}", // <-- This line is the most important!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;