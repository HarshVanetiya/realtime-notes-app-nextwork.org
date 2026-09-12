import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Without this, `npm run lint` walks build output and reports thousands of
  // errors from generated bundles whenever a build exists on disk.
  {
    ignores: [".next/**", "node_modules/**", "out/**", "build/**", "next-env.d.ts", "extension/**"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
