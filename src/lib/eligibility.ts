// Rule evaluator + eligibility scoring.
import type { Condition, Scheme, UserProfile } from "./schemes";
import { SCHEMES } from "./schemes";

export type Confidence = "high" | "medium" | "low";

export interface EligibilityMatch {
  scheme: Scheme;
  confidence: Confidence;
  reasons: string[]; // human-readable "why" fragments (English fallback)
}

function evalCondition(c: Condition, p: UserProfile): boolean | null {
  if ("all" in c) {
    const results = c.all.map((x) => evalCondition(x, p));
    if (results.some((r) => r === false)) return false;
    if (results.some((r) => r === null)) return null;
    return true;
  }
  if ("any" in c) {
    const results = c.any.map((x) => evalCondition(x, p));
    if (results.some((r) => r === true)) return true;
    if (results.some((r) => r === null)) return null;
    return false;
  }
  if ("not" in c) {
    const r = evalCondition(c.not, p);
    return r === null ? null : !r;
  }
  const v = p[c.field];
  if (v === undefined || v === null) return null;
  switch (c.op) {
    case "eq": return v === c.value;
    case "neq": return v !== c.value;
    case "in": return (c.value as unknown[]).includes(v as unknown);
    case "gte": return typeof v === "number" && v >= c.value;
    case "lte": return typeof v === "number" && v <= c.value;
    case "gt": return typeof v === "number" && v > c.value;
    case "lt": return typeof v === "number" && v < c.value;
  }
}

function reasonsFor(c: Condition, p: UserProfile, acc: string[] = []): string[] {
  if ("all" in c) c.all.forEach((x) => reasonsFor(x, p, acc));
  else if ("any" in c) {
    // pick the first satisfied branch as the reason
    const sat = c.any.find((x) => evalCondition(x, p) === true);
    if (sat) reasonsFor(sat, p, acc);
  } else if ("not" in c) {
    // skip
  } else {
    const v = p[c.field];
    if (v === undefined) return acc;
    const label = String(c.field);
    if (c.op === "eq") acc.push(`${label} = ${String(c.value)}`);
    else if (c.op === "in") acc.push(`${label} ∈ ${(c.value as unknown[]).join(", ")}`);
    else if (c.op === "gte") acc.push(`${label} ≥ ${c.value}`);
    else if (c.op === "lte") acc.push(`${label} ≤ ${c.value}`);
    else if (c.op === "gt") acc.push(`${label} > ${c.value}`);
    else if (c.op === "lt") acc.push(`${label} < ${c.value}`);
  }
  return acc;
}

export function evaluateAll(profile: UserProfile): EligibilityMatch[] {
  const matches: EligibilityMatch[] = [];
  for (const scheme of SCHEMES) {
    const result = evalCondition(scheme.rule, profile);
    if (result === false) continue;
    let confidence: Confidence = "high";
    if (result === null) confidence = "medium";
    // Downgrade if any soft field is missing
    if (scheme.softFields?.some((f) => profile[f] === undefined)) {
      confidence = confidence === "high" ? "medium" : "low";
    }
    matches.push({ scheme, confidence, reasons: reasonsFor(scheme.rule, profile) });
  }
  // Sort: high first, then medium, then low
  const order: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  return matches.sort((a, b) => order[a.confidence] - order[b.confidence]);
}
