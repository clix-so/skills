module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/bin/cli.ts", // Exclude entry point from coverage
  ],
};
