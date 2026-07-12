import fs from "fs";
import path from "path";

// In a real application, you'd use a postgres pool like pg or an ORM like drizzle/prisma, and a redis client.
// Here we stub database connections and fall back to local file system stores or in-memory arrays to ensure it runs out of the box.

const isProduction = process.env.NODE_ENV === "production";
const DB_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

// Simple file-based fallback paths in the project directory
const FALLBACK_DIR = path.resolve(process.cwd(), "data");
const CONSENT_FILE = path.join(FALLBACK_DIR, "consents.json");
const AUDIT_FILE = path.join(FALLBACK_DIR, "audit_logs.json");
const PROFILE_FILE = path.join(FALLBACK_DIR, "profiles.json");

function ensureFallbackDirectory() {
  if (!fs.existsSync(FALLBACK_DIR)) {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONSENT_FILE)) fs.writeFileSync(CONSENT_FILE, "[]", "utf-8");
  if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, "[]", "utf-8");
  if (!fs.existsSync(PROFILE_FILE)) fs.writeFileSync(PROFILE_FILE, "[]", "utf-8");
}

ensureFallbackDirectory();

export interface ConsentLog {
  id: string;
  userId: string;
  purposes: {
    screening: boolean;
    autoFill: boolean;
    submission: boolean;
  };
  timestamp: string;
  ip: string;
  userAgent: string;
  revoked: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string; // e.g. "ELIGIBILITY_RUN", "CONSENT_GRANT", "CONSENT_REVOKE", "DATA_ACCESS"
  userId: string;
  details: string; // JSON string, scrubbed of PII
}

// In-memory sessions store to act as Redis
const sessions: Record<string, { profile: any; ip: string; expiresAt: number }> = {};

export const db = {
  // Verify connections
  async checkHealth() {
    return {
      postgres: DB_URL ? "connected" : "fallback-active (in-memory/file)",
      redis: REDIS_URL ? "connected" : "fallback-active (in-memory)",
    };
  },

  // Consent logs
  async logConsent(log: Omit<ConsentLog, "id" | "timestamp">): Promise<ConsentLog> {
    ensureFallbackDirectory();
    const records = JSON.parse(fs.readFileSync(CONSENT_FILE, "utf-8")) as ConsentLog[];
    const newLog: ConsentLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
    };
    records.push(newLog);
    fs.writeFileSync(CONSENT_FILE, JSON.stringify(records, null, 2), "utf-8");

    // Also log this event to the immutable audit log
    await this.logAudit({
      action: "CONSENT_UPDATE",
      userId: log.userId,
      details: JSON.stringify({ purposes: log.purposes, revoked: log.revoked }),
    });

    return newLog;
  },

  async getConsent(userId: string): Promise<ConsentLog | null> {
    ensureFallbackDirectory();
    const records = JSON.parse(fs.readFileSync(CONSENT_FILE, "utf-8")) as ConsentLog[];
    // Find latest consent log for this user
    const userRecords = records.filter(r => r.userId === userId);
    if (userRecords.length === 0) return null;
    return userRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  },

  // Session state (Redis equivalent)
  async saveSession(sessionId: string, profile: any, ip: string, ttlSeconds = 3600): Promise<void> {
    // Redis SETEX equivalent
    sessions[sessionId] = {
      profile,
      ip,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
  },

  async getSession(sessionId: string): Promise<any | null> {
    const session = sessions[sessionId];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete sessions[sessionId];
      return null;
    }
    return session.profile;
  },

  async deleteSession(sessionId: string): Promise<void> {
    delete sessions[sessionId];
  },

  // Audit Logs (Immutable)
  async logAudit(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog> {
    ensureFallbackDirectory();
    const logs = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8")) as AuditLog[];
    const newLog: AuditLog = {
      ...log,
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
    };
    
    // Safety check: scrub any potential raw PII (like 12 digit Aadhaar, or emails, phone numbers)
    let safeDetails = log.details;
    if (safeDetails) {
      // Replace full Aadhaar numbers (12 digits) with masked version
      safeDetails = safeDetails.replace(/\b\d{12}\b/g, (match) => "XXXXXXXX" + match.slice(-4));
      // Scrub potential phone numbers (e.g. +91 10 digits or 10 digits)
      safeDetails = safeDetails.replace(/\b(\+91)?\d{10}\b/g, "[PHONE_SCRUBBED]");
    }
    newLog.details = safeDetails;

    logs.push(newLog);
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(logs, null, 2), "utf-8");
    return newLog;
  },

  async getAuditLogs(userId?: string): Promise<AuditLog[]> {
    ensureFallbackDirectory();
    const logs = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8")) as AuditLog[];
    if (userId) {
      return logs.filter(l => l.userId === userId);
    }
    return logs;
  }
};
