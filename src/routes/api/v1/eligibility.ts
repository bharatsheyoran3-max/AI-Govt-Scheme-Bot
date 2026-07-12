import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../server/gateway";
import { rulesEngine } from "../../../../server/services/rules";
import { coreService } from "../../../../server/services/core";

// Define strict profile validation schema to protect server from malformed input
const profileSchema = z.object({
  state: z.string().optional(),
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  income: z.number().nonnegative().optional(),
  occupation: z.enum(["farmer", "student", "salaried", "self", "unemployed", "retired"]).optional(),
  category: z.enum(["general", "obc", "sc", "st", "ews"]).optional(),
  land: z.enum(["none", "small", "medium", "large"]).optional(),
  disability: z.boolean().optional(),
  ration: z.enum(["bpl", "aay", "apl", "none"]).optional(),
  familySize: z.number().int().min(1).max(30).optional(),
});

const checkSchema = z.object({
  userId: z.string().min(3).max(64),
  profile: profileSchema,
  versionOverrides: z.record(z.string()).optional()
});

export const APIRoute = createAPIFileRoute("/api/v1/eligibility")({
  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, checkSchema);
      if (!validation.success) {
        return validation.response;
      }

      const { userId, profile, versionOverrides } = validation.data;

      // Access Control: Validate that user has active consent for "screening"
      const consent = await coreService.getConsent(userId);
      if (!consent || !consent.purposes.screening || consent.revoked) {
        return new Response(
          JSON.stringify({ error: "Active screening consent is required to evaluate eligibility." }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Execute rules evaluation
      const results = await rulesEngine.evaluate(userId, profile, versionOverrides);

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
});
