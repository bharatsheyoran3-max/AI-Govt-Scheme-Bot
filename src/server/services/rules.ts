import type { UserProfile, Condition } from "../../lib/schemes";
import { db } from "../db";

export interface VersionedRule {
  schemeId: string;
  version: string;
  effectiveStart: string; // ISO date
  effectiveEnd: string | null; // ISO date or null if active
  rule: Condition;
  softFields?: (keyof UserProfile)[];
}

// In a real-world system, this catalog would be loaded from PostgreSQL.
// Here we load it from an in-memory/compiled database that contains the official rules versioned.
export const VERSIONED_RULES: VersionedRule[] = [
  {
    schemeId: "pm-kisan",
    version: "1.0.0",
    effectiveStart: "2019-02-24T00:00:00Z",
    effectiveEnd: null,
    rule: {
      all: [
        { field: "occupation", op: "eq", value: "farmer" },
        { field: "land", op: "in", value: ["small", "medium"] },
      ],
    },
    softFields: ["land"],
  },
  {
    schemeId: "ayushman-bharat",
    version: "1.0.0",
    effectiveStart: "2018-09-23T00:00:00Z",
    effectiveEnd: null,
    rule: {
      any: [
        { field: "ration", op: "in", value: ["bpl", "aay"] },
        { field: "income", op: "lt", value: 100000 },
      ],
    },
    softFields: ["ration", "income"],
  },
  {
    schemeId: "ujjwala",
    version: "1.0.0",
    effectiveStart: "2016-05-01T00:00:00Z",
    effectiveEnd: null,
    rule: {
      all: [
        { field: "gender", op: "eq", value: "female" },
        {
          any: [
            { field: "ration", op: "in", value: ["bpl", "aay"] },
            { field: "income", op: "lt", value: 100000 },
          ],
        },
      ],
    },
    softFields: ["ration", "income"],
  },
  {
    schemeId: "post-matric-sc",
    version: "1.0.0",
    effectiveStart: "2020-04-01T00:00:00Z",
    effectiveEnd: null,
    rule: {
      all: [
        { field: "category", op: "eq", value: "sc" },
        { field: "occupation", op: "eq", value: "student" },
        { field: "income", op: "lt", value: 250000 },
      ],
    },
    softFields: ["income"],
  },
  {
    schemeId: "ignoaps",
    version: "1.0.0",
    effectiveStart: "2007-11-19T00:00:00Z",
    effectiveEnd: null,
    rule: {
      all: [
        { field: "age", op: "gte", value: 60 },
        {
          any: [
            { field: "ration", op: "in", value: ["bpl", "aay"] },
            { field: "income", op: "lt", value: 100000 },
          ],
        },
      ],
    },
    softFields: ["ration", "income"],
  },
];

export interface EvaluationResult {
  schemeId: string;
  version: string;
  status: "eligible" | "ineligible" | "needs_clarification";
  confidence: "high" | "medium" | "low";
  missingFields: (keyof UserProfile)[];
  reasons: string[];
}

function evalConditionWithMissing(
  c: Condition,
  p: UserProfile,
  missing: Set<keyof UserProfile>
): boolean | null {
  if ("all" in c) {
    const results = c.all.map(x => evalConditionWithMissing(x, p, missing));
    if (results.some(r => r === false)) return false;
    if (results.some(r => r === null)) return null;
    return true;
  }
  if ("any" in c) {
    const results = c.any.map(x => evalConditionWithMissing(x, p, missing));
    if (results.some(r => r === true)) return true;
    if (results.some(r => r === null)) return null;
    return false;
  }
  if ("not" in c) {
    const r = evalConditionWithMissing(c.not, p, missing);
    return r === null ? null : !r;
  }

  const v = p[c.field];
  if (v === undefined || v === null) {
    missing.add(c.field);
    return null;
  }

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

export const rulesEngine = {
  // Find rules active at a specific historical point for full auditing
  getRuleForScheme(schemeId: string, timestamp: string = new Date().toISOString()): VersionedRule | null {
    const time = new Date(timestamp).getTime();
    const rules = VERSIONED_RULES.filter(r => r.schemeId === schemeId);
    
    for (const rule of rules) {
      const start = new Date(rule.effectiveStart).getTime();
      const end = rule.effectiveEnd ? new Date(rule.effectiveEnd).getTime() : Infinity;
      if (time >= start && time < end) {
        return rule;
      }
    }
    return null;
  },

  async evaluate(
    userId: string,
    profile: UserProfile,
    ruleVersionOverrides?: Record<string, string>
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const evaluationDate = new Date().toISOString();

    for (const rule of VERSIONED_RULES) {
      // Allow pinning specific versions if needed for grievance review, otherwise use currently active rule
      const targetRule = ruleVersionOverrides 
        ? (VERSIONED_RULES.find(r => r.schemeId === rule.schemeId && r.version === ruleVersionOverrides[rule.schemeId]) || rule)
        : rule;

      const missing = new Set<keyof UserProfile>();
      const outcome = evalConditionWithMissing(targetRule.rule, profile, missing);

      let status: "eligible" | "ineligible" | "needs_clarification" = "ineligible";
      let confidence: "high" | "medium" | "low" = "high";

      if (outcome === true) {
        status = "eligible";
        // Check if soft fields are missing
        const missingSoft = targetRule.softFields?.filter(f => profile[f] === undefined) || [];
        if (missingSoft.length > 0) {
          confidence = "medium";
        }
      } else if (outcome === null) {
        status = "needs_clarification";
        confidence = "low";
      }

      results.push({
        schemeId: targetRule.schemeId,
        version: targetRule.version,
        status,
        confidence,
        missingFields: Array.from(missing),
        reasons: [], // Detailed descriptions populated dynamically on localized frontend
      });
    }

    // Write this run to immutable audit log for compliance review, masking user inputs
    await db.logAudit({
      action: "ELIGIBILITY_RUN",
      userId,
      details: JSON.stringify({
        ruleVersions: results.map(r => ({ id: r.schemeId, v: r.version })),
        statusCounts: {
          eligible: results.filter(r => r.status === "eligible").length,
          clarification: results.filter(r => r.status === "needs_clarification").length,
        }
      })
    });

    return results;
  }
};
