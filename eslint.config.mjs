// eslint-config-next 16 ships native flat configs — no FlatCompat bridge needed.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // react-hooks v6 (new with Next 16) added these rules; they flag
    // pre-existing player/profile code. Downgraded to warnings until that
    // code is reworked — TODO(rebirth): fix and restore to errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "scripts/**",
      "coverage/**",
      "attic/**",
    ],
  },
];

export default eslintConfig;
