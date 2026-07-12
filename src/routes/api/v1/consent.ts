import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../server/gateway";
import { coreService } from "../../../../server/services/core";

const consentPostSchema = z.object({
  userId: z.string().min(3).max(64),
  purposes: z.object({
    screening: z.boolean(),
    autoFill: z.boolean(),
    submission: z.boolean()
  })
});

export const APIRoute = createAPIFileRoute("/api/v1/consent")({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("userId");

      if (!userId) {
        return new Response(JSON.stringify({ error: "Missing 'userId' parameter." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const consent = await coreService.getConsent(userId);
      return new Response(JSON.stringify({ consent }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },

  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, consentPostSchema);
      if (!validation.success) {
        return validation.response;
      }

      const { userId, purposes } = validation.data;
      const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const userAgent = request.headers.get("user-agent") || "unknown";

      const loggedConsent = await coreService.updateConsent(userId, purposes, clientIp, userAgent);

      return new Response(JSON.stringify({ success: true, consent: loggedConsent }), {
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
