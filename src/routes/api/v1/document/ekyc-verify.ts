import { createAPIFileRoute } from "@tanstack/start/api";
import { z } from "zod";
import { validateRequest } from "../../../../../server/gateway";
import { documentService } from "../../../../../server/services/document";

const ekycVerifySchema = z.object({
  otp: z.string().length(6),
  trackingId: z.string().min(3).max(64)
});

export const APIRoute = createAPIFileRoute("/api/v1/document/ekyc-verify")({
  POST: async ({ request }) => {
    try {
      const validation = await validateRequest(request, ekycVerifySchema);
      if (!validation.success) {
        return validation.response;
      }

      const { otp, trackingId } = validation.data;
      const res = await documentService.verifyAadhaarOtpMock(otp, trackingId);

      if (!res.verified) {
        return new Response(JSON.stringify({ success: false, error: "Incorrect OTP. Please check and try again." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, ...res }), {
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
