import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../../server/gateway";
import { documentService } from "../../../../../server/services/document";

const digiLockerVerifySchema = z.object({
  code: z.string().min(3),
  transactionId: z.string().uuid()
});

export const APIRoute = createAPIFileRoute("/api/v1/document/digilocker-verify")({
  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, digiLockerVerifySchema);
      if (!validation.success) {
        return validation.response;
      }

      const { code, transactionId } = validation.data;
      const verifiedData = await documentService.completeDigiLockerExchange(code, transactionId);

      return new Response(JSON.stringify({ success: true, ...verifiedData }), {
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
