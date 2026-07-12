import { db, type ConsentLog, type AuditLog } from "../db";

export type Role = "citizen" | "csc_operator" | "admin";

export interface UserSessionProfile {
  userId: string;
  role: Role;
  scopes: string[];
}

export const coreService = {
  // Simple session authentication helper (RBAC validation)
  async authenticateAndAuthorize(
    request: Request,
    requiredRole: Role = "citizen"
  ): Promise<{ authenticated: boolean; session?: UserSessionProfile; error?: string }> {
    const authHeader = request.headers.get("Authorization");
    
    // In production, verify JWT token/session secrets. Here we mock user auth headers.
    let role: Role = "citizen";
    let userId = "user-123";

    if (authHeader) {
      if (authHeader.includes("admin")) {
        role = "admin";
        userId = "admin-999";
      } else if (authHeader.includes("csc")) {
        role = "csc_operator";
        userId = "operator-555";
      }
    }

    // Role hierarchies
    const roleLevels: Record<Role, number> = { citizen: 0, csc_operator: 1, admin: 2 };
    if (roleLevels[role] < roleLevels[requiredRole]) {
      return {
        authenticated: false,
        error: `Access Denied: Required role '${requiredRole}' matches level ${roleLevels[requiredRole]}, but client has level ${roleLevels[role]}.`
      };
    }

    return {
      authenticated: true,
      session: {
        userId,
        role,
        scopes: role === "admin" ? ["*"] : ["read:schemes", "write:consent"]
      }
    };
  },

  // Consent Management
  async getConsent(userId: string): Promise<ConsentLog | null> {
    return await db.getConsent(userId);
  },

  async updateConsent(
    userId: string,
    purposes: { screening: boolean; autoFill: boolean; submission: boolean },
    ip: string,
    userAgent: string
  ): Promise<ConsentLog> {
    const log = await db.logConsent({
      userId,
      purposes,
      ip,
      userAgent,
      revoked: false
    });
    return log;
  },

  async revokeConsent(userId: string, ip: string, userAgent: string): Promise<ConsentLog> {
    const log = await db.logConsent({
      userId,
      purposes: { screening: false, autoFill: false, submission: false },
      ip,
      userAgent,
      revoked: true
    });
    return log;
  },

  // Audit Logs
  async getAuditLogs(request: Request, userId?: string): Promise<AuditLog[]> {
    const auth = await this.authenticateAndAuthorize(request, "admin");
    if (!auth.authenticated) {
      throw new Error(auth.error || "Unauthorized");
    }
    
    // Logs are scrubbed before storage, but we track data-access events when logs are queried
    await db.logAudit({
      action: "DATA_ACCESS",
      userId: auth.session?.userId || "unknown",
      details: JSON.stringify({ target: "AUDIT_LOGS", filterUserId: userId || "all" })
    });

    return await db.getAuditLogs(userId);
  }
};
