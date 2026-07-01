/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard"],
  rules: {
    "at-rule-no-deprecated": [
      true,
      {
        ignoreAtRules: ["tailwind"],
      },
    ],
    "no-descending-specificity": null,
    "custom-property-pattern": null,
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$",
      {
        message: "Expected class selector to be camelCase or kebab-case",
      },
    ],
    "keyframes-name-pattern": null,
    "rule-empty-line-before": [
      "always-multi-line",
      {
        except: ["first-nested"],
        ignore: ["after-comment"],
      },
    ],
  },
  ignoreFiles: ["dist/**", "coverage/**", "node_modules/**"],
}
