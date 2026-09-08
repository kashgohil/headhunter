import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file) : [file];
  });
}

describe("protected operation coverage", () => {
  test("checks the owner inside every workspace Server Action", () => {
    const files = filesBelow(path.join(process.cwd(), "app", "(workspace)"))
      .filter((file) => /actions\.tsx?$/.test(file))
      .filter((file) => !file.endsWith("auth-actions.ts"));
    const missing: string[] = [];
    let actions = 0;
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const parsed = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      for (const statement of parsed.statements) {
        if (!ts.isFunctionDeclaration(statement) || !statement.body) continue;
        const modifiers = statement.modifiers ?? [];
        if (
          !modifiers.some((item) => item.kind === ts.SyntaxKind.ExportKeyword) ||
          !modifiers.some((item) => item.kind === ts.SyntaxKind.AsyncKeyword)
        ) continue;
        actions += 1;
        const body = statement.body.getText(parsed);
        if (!/^\{\s*await requireOwner\(\);/.test(body)) {
          missing.push(`${path.relative(process.cwd(), file)}:${statement.name?.getText(parsed)}`);
        }
      }
    }
    expect(actions).toBeGreaterThan(70);
    expect(missing).toEqual([]);
  });

  test("checks the owner inside every private route handler", () => {
    const routes = filesBelow(path.join(process.cwd(), "app"))
      .filter((file) => file.endsWith("route.ts"))
      .filter((file) => !file.endsWith(path.join("api", "health", "route.ts")));
    const missing = routes
      .filter((file) => !readFileSync(file, "utf8").includes("await authorizeRoute(request)"))
      .map((file) => path.relative(process.cwd(), file));
    expect(routes.length).toBe(5);
    expect(missing).toEqual([]);
  });
});
