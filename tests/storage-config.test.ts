import { describe, expect, test } from "bun:test";
import path from "node:path";

import { storagePaths } from "@/lib/storage/config";

describe("hosted storage configuration", () => {
  test("keeps local data in the workspace by default", () => {
    expect(
      storagePaths({
        environment: { NODE_ENV: "development" },
        workingDirectory: "/srv/headhunter",
      }).database,
    ).toBe(path.join("/srv/headhunter", ".data", "headhunter.db"));
  });

  test("requires an absolute persistent encrypted volume in hosted mode", () => {
    const base = {
      HEADHUNTER_ACCESS_MODE: "hosted",
      NODE_ENV: "production",
    };
    expect(() => storagePaths({ environment: base })).toThrow();
    expect(() =>
      storagePaths({
        environment: { ...base, HEADHUNTER_DATA_DIR: "/data" },
      }),
    ).toThrow("persistent");
    expect(() =>
      storagePaths({
        environment: {
          ...base,
          HEADHUNTER_DATA_DIR: "/data",
          HEADHUNTER_PERSISTENT_STORAGE: "true",
        },
      }),
    ).toThrow("encrypted");
    expect(
      storagePaths({
        environment: {
          ...base,
          HEADHUNTER_DATA_DIR: "/data",
          HEADHUNTER_PERSISTENT_STORAGE: "true",
          HEADHUNTER_STORAGE_ENCRYPTED: "true",
          DATABASE_FILE: "owner.db",
        },
      }).database,
    ).toBe("/data/owner.db");
  });

  test("rejects database path traversal", () => {
    expect(() =>
      storagePaths({
        environment: {
          NODE_ENV: "development",
          DATABASE_FILE: "../another.db",
        },
      }),
    ).toThrow("filename");
  });
});
