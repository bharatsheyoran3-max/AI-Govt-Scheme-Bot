import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../server/gateway";
import { nluService } from "../../../../server/services/nlu";

const nluPostSchema = z.object({
  query: z.string().min(1).max(500)
});

export const APIRoute = createAPIFileRoute("/api/v1/nlu")({
  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, nluPostSchema);
      if (!validation.success) {
        return validation.response;
      }

      const { query } = validation.data;
      const analysis = nluService.parseQuery(query);

      return new Response(JSON.stringify({ success: true, analysis }), {
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
