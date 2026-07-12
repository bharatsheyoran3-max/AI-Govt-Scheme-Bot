import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../../server/gateway";
import { documentService } from "../../../../../server/services/document";

const validateFileSchema = z.object({
  fileContent: z.string().min(10) // Base64 representation of file
});

export const APIRoute = createAPIFileRoute("/api/v1/document/validate")({
  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, validateFileSchema);
      if (!validation.success) {
        return validation.response;
      }

      const { fileContent } = validation.data;
      const fileCheck = documentService.validateFile(fileContent);

      if (!fileCheck.valid) {
        return new Response(JSON.stringify({ success: false, error: fileCheck.error }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, mimeType: fileCheck.mimeType }), {
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
