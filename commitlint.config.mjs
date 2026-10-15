/** Conventional Commits in English (git standard §4). */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    "type-enum": [2, "always", ["feat", "fix", "perf", "refactor", "test", "docs", "build", "ci", "chore", "revert"]],
  },
};
