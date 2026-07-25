// remotion/scripts/check_scene_types.mjs
//
// Cross-checks the three places a "shot type" string has to agree:
//   1. src/types.ts        — ManifestScene union, source of truth
//   2. src/TikTokVideo.tsx — switch (shot.type) render dispatch
//   3. ../vidgen/pipeline/render_manifest_builder.py — TYPE_MAP values
//
// Parses via the real project/checker (typescript's native TS7 API), not
// regex, so it reads the same AST tsc itself would type-check against.
// Also writes remotion/scene_types.generated.json so Python can diff
// against the same source of truth without re-parsing TypeScript.
//
// Usage: node scripts/check_scene_types.mjs [--check-only]
//   --check-only   skip writing scene_types.generated.json; only exit
//                  non-zero on drift (used by `tsc --noEmit`-style CI steps
//                  that shouldn't touch the working tree)

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { API } = require("typescript/unstable/sync");
const is = require("typescript/unstable/ast/is");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(REMOTION_ROOT, "scene_types.generated.json");

// Walk ManifestScene's union members and collect each `type: "literal"` string.
function extractManifestSceneTypes(sourceFile) {
  let unionNode = null;
  sourceFile.forEachChild((node) => {
    if (unionNode) return;
    if (is.isTypeAliasDeclaration(node) && node.name.text === "ManifestScene") {
      unionNode = node;
    }
  });
  if (!unionNode) {
    throw new Error("Could not find `type ManifestScene = ...` — check src/types.ts");
  }
  if (!is.isUnionTypeNode(unionNode.type)) {
    throw new Error("ManifestScene is not a union type — check src/types.ts");
  }

  const types = [];
  for (const member of unionNode.type.types) {
    if (!is.isTypeLiteralNode(member)) continue;
    member.forEachChild((prop) => {
      if (
        is.isPropertySignatureDeclaration(prop) &&
        prop.name &&
        is.isIdentifier(prop.name) &&
        prop.name.text === "type" &&
        prop.type &&
        is.isLiteralTypeNode(prop.type) &&
        is.isStringLiteral(prop.type.literal)
      ) {
        types.push(prop.type.literal.text);
      }
    });
  }
  if (types.length === 0) {
    throw new Error('Found no `type: "..."` members on ManifestScene — check src/types.ts');
  }
  return types;
}

// Walk the `switch (shot.type)` in TikTokVideo.tsx and collect each case's string literal.
function extractSwitchCaseTypes(sourceFile) {
  let switchNode = null;
  function visit(node) {
    if (switchNode) return;
    if (
      is.isSwitchStatement(node) &&
      is.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "type"
    ) {
      switchNode = node;
      return;
    }
    node.forEachChild(visit);
  }
  visit(sourceFile);
  if (!switchNode) {
    throw new Error("Found no `switch (shot.type)` statement — check src/TikTokVideo.tsx");
  }

  return switchNode.caseBlock.clauses
    .filter(is.isCaseClause)
    .map((clause) => clause.expression)
    .filter(is.isStringLiteral)
    .map((lit) => lit.text);
}

function main() {
  const checkOnly = process.argv.includes("--check-only");

  const api = new API({ cwd: REMOTION_ROOT });
  let unionTypes, switchTypes;
  try {
    const snapshot = api.updateSnapshot({ openProjects: ["tsconfig.json"] });
    const project = snapshot.getProject("tsconfig.json");
    if (!project) {
      throw new Error("Could not load remotion/tsconfig.json as a project");
    }

    const typesSourceFile = project.program.getSourceFile("src/types.ts");
    const videoSourceFile = project.program.getSourceFile("src/TikTokVideo.tsx");
    if (!typesSourceFile) throw new Error("Could not load src/types.ts from the program");
    if (!videoSourceFile) throw new Error("Could not load src/TikTokVideo.tsx from the program");

    unionTypes = extractManifestSceneTypes(typesSourceFile);
    switchTypes = extractSwitchCaseTypes(videoSourceFile);
  } finally {
    api.close();
  }

  const unionSet = new Set(unionTypes);
  const switchSet = new Set(switchTypes);

  const errors = [];

  const dupUnion = unionTypes.filter((t, i) => unionTypes.indexOf(t) !== i);
  if (dupUnion.length > 0) {
    errors.push(`Duplicate type literals in ManifestScene union: ${[...new Set(dupUnion)].join(", ")}`);
  }

  const missingFromSwitch = [...unionSet].filter((t) => !switchSet.has(t));
  if (missingFromSwitch.length > 0) {
    errors.push(
      `Types in ManifestScene union but not handled by the TikTokVideo.tsx switch: ${missingFromSwitch.join(", ")}`
    );
  }

  const missingFromUnion = [...switchSet].filter((t) => !unionSet.has(t));
  if (missingFromUnion.length > 0) {
    errors.push(
      `Types handled by the TikTokVideo.tsx switch but absent from the ManifestScene union: ${missingFromUnion.join(", ")}`
    );
  }

  if (errors.length > 0) {
    console.error("scene type cross-check FAILED:\n");
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\nManifestScene union (${unionTypes.length}): src/types.ts`);
    console.error(`TikTokVideo.tsx switch (${switchTypes.length}): src/TikTokVideo.tsx`);
    process.exit(1);
  }

  console.log(
    `scene type cross-check OK — ${unionTypes.length} scene types agree between types.ts and TikTokVideo.tsx`
  );

  if (!checkOnly) {
    const payload = {
      // Sorted for a stable diff; this file is generated, do not hand-edit.
      sceneTypes: [...unionSet].sort(),
      generatedFrom: ["src/types.ts:ManifestScene", "src/TikTokVideo.tsx:switch(shot.type)"],
    };
    writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + "\n");
    console.log(`wrote ${path.relative(REMOTION_ROOT, OUTPUT_PATH)}`);
  }
}

main();
