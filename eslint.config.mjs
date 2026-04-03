import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Practice directory (development only):
    "practice/**",
  ]),
  // CLAUDE.md coding conventions enforcement
  {
    rules: {
      // 1. any 사용 금지 (CLAUDE.md: "any 사용 금지")
      "@typescript-eslint/no-explicit-any": "error",

      // 2. 축약형 변수명 경고 (CLAUDE.md: "축약형 변수명 금지")
      "id-length": [
        "warn",
        {
          min: 2,
          exceptions: ["i", "j", "x", "y", "t", "p", "e", "_"],
          properties: "never",
        },
      ],

      // 3. console.log 프로덕션 금지 (CLAUDE.md: 디버그 코드 금지)
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // 4. 레이어 경계: 클라이언트에서 server/ 직접 import 금지
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/server/*", "../server/*", "../../server/*"],
              message:
                "server/ 코드를 클라이언트에서 직접 import할 수 없습니다. API 엔드포인트를 통해 통신하세요.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
