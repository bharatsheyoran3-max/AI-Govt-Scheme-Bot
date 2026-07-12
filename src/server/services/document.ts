import crypto from "crypto";

export interface FileValidationResult {
  valid: boolean;
  mimeType?: string;
  error?: string;
}

export interface DigiLockerDoc {
  id: string;
  name: string;
  type: string; // e.g. "ADHAR", "INCER", "CASER"
  docNumberMasked: string;
  verified: boolean;
  issuedBy: string;
}

export const documentService = {
  // Validate magic bytes of file buffer/base64 string
  validateFile(fileBase64OrBuffer: string | Buffer, maxSizeBytes = 5 * 1024 * 1024): FileValidationResult {
    let buf: Buffer;
    
    if (typeof fileBase64OrBuffer === "string") {
      // Base64 string processing (strip headers like data:image/png;base64, if present)
      const matches = fileBase64OrBuffer.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      const cleanBase64 = matches ? matches[2] : fileBase64OrBuffer;
      try {
        buf = Buffer.from(cleanBase64, "base64");
      } catch (e) {
        return { valid: false, error: "Invalid base64 encoding." };
      }
    } else {
      buf = fileBase64OrBuffer;
    }

    // Check file size
    if (buf.length > maxSizeBytes) {
      return { valid: false, error: `File exceeds maximum size of ${maxSizeBytes / (1024 * 1024)}MB.` };
    }

    if (buf.length < 4) {
      return { valid: false, error: "File too small to be valid." };
    }

    // Check magic bytes (file signature verification)
    const hex = buf.toString("hex", 0, 4).toUpperCase();
    
    // PDF: %PDF (25 50 44 46)
    if (hex === "25504446") {
      return { valid: true, mimeType: "application/pdf" };
    }
    
    // PNG: 89 50 4E 47
    if (hex === "89504E47") {
      return { valid: true, mimeType: "image/png" };
    }

    // JPEG: FF D8 FF
    if (hex.startsWith("FFD8FF")) {
      return { valid: true, mimeType: "image/jpeg" };
    }

    return { 
      valid: false, 
      error: "Unsupported file type. Only PDF, JPEG, and PNG files are accepted." 
    };
  },

  // Stub for licensed DigiLocker integration
  // Phase 2 Dependency: Requires government empanelment, production API keys and licensed e-sign gateway integration.
  async initiateDigiLockerAuth(redirectUrl: string): Promise<{ authUrl: string; transactionId: string }> {
    const transactionId = crypto.randomUUID();
    // Simulate official consent redirect URL for DigiLocker OAuth2 gate
    const authUrl = `https://demo.digitallocker.gov.in/v3/oauth/authorize?response_type=code&client_id=SCHEMESATHI_MOCK_ID&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${transactionId}`;
    return { authUrl, transactionId };
  },

  async completeDigiLockerExchange(code: string, transactionId: string): Promise<{
    success: boolean;
    tokenMasked: string;
    documents: DigiLockerDoc[];
  }> {
    // Generate a secure hashed token representation in-memory to prevent leaking session secrets
    const tokenSecret = crypto.createHmac("sha256", "schemesathi-secret").update(code + transactionId).digest("hex");
    const tokenMasked = `dl_token_${tokenSecret.slice(0, 10)}...`;

    // Return mock DigiLocker documents associated with user profile
    const documents: DigiLockerDoc[] = [
      {
        id: "dl-aadhaar",
        name: "Aadhaar Card",
        type: "AADHAAR",
        docNumberMasked: "XXXX-XXXX-8924",
        verified: true,
        issuedBy: "UIDAI"
      },
      {
        id: "dl-income",
        name: "Income Certificate",
        type: "INCOME",
        docNumberMasked: "INC-2026-9921",
        verified: true,
        issuedBy: "Revenue Department"
      },
      {
        id: "dl-ration",
        name: "Ration Card (BPL)",
        type: "RATION",
        docNumberMasked: "RAT-MH-44510",
        verified: true,
        issuedBy: "Food & Civil Supplies"
      }
    ];

    return {
      success: true,
      tokenMasked,
      documents
    };
  },

  // e-KYC Verification stub. Only returns last 4 digits and verification token to follow data minimization.
  async verifyAadhaarOtpMock(otp: string, trackingId: string): Promise<{
    verified: boolean;
    maskedAadhaar: string;
    token: string;
    demographics: {
      name: string;
      dob: string;
      gender: "male" | "female" | "other";
      state: string;
    };
  }> {
    // Check if mock OTP matches normal test value "123456"
    if (otp !== "123456") {
      return { verified: false, maskedAadhaar: "", token: "", demographics: {} as any };
    }

    const verificationToken = crypto.randomUUID();
    return {
      verified: true,
      maskedAadhaar: "XXXX-XXXX-4321",
      token: verificationToken,
      demographics: {
        name: "Savitri Bai",
        dob: "1965-08-15",
        gender: "female",
        state: "Maharashtra"
      }
    };
  }
};
