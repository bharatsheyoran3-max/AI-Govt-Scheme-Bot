import { createAPIFileRoute } from "@tanstack/start/api";
import { coreService } from "../../../../server/services/core";

export const APIRoute = createAPIFileRoute("/api/v1/audit")({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const targetUserId = url.searchParams.get("userId") || undefined;

      // Restrict access using RBAC verification
      const auth = await coreService.authenticateAndAuthorize(request, "admin");
      if (!auth.authenticated) {
        return new Response(JSON.stringify({ error: auth.error || "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }

      const logs = await coreService.getAuditLogs(request, targetUserId);

      return new Response(JSON.stringify({ success: true, logs }), {
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
