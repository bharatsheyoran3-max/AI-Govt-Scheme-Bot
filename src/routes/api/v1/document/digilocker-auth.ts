import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../../server/gateway";
import { documentService } from "../../../../../server/services/document";

const digiLockerAuthSchema = z.object({
  redirectUrl: z.string().url()
});

export const APIRoute = createAPIFileRoute("/api/v1/document/digilocker-auth")({
  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, digiLockerAuthSchema);
      if (!validation.success) {
        return validation.response;
      }

      const { redirectUrl } = validation.data;
      const auth = await documentService.initiateDigiLockerAuth(redirectUrl);

      return new Response(JSON.stringify({ success: true, ...auth }), {
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
