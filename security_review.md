# Security Review - SchemeSathi Core Architecture

This document maps the security, privacy, and "No Data Leak" requirements specified in Section 3 of the project guidelines to their respective code modules.

---

## 1. Security Requirements Mapping

### Data Minimization
*   **Requirement**: Only collect fields actually needed. Mask Aadhaar to last 4 digits + verification token only, via authorized e-KYC/DigiLocker channels. Never store raw UIDAI details.
*   **Implementation**: 
    *   [document.ts:L123-145](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/services/document.ts#L123-L145) - Aadhaar verification stub returns only `maskedAadhaar` ("XXXX-XXXX-4321") and a randomized `verificationToken`, alongside basic demographic matches.
    *   [session.ts:L18-40](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/lib/session.ts#L18-L40) - The client-side state machine does not record Aadhaar strings in `sessionStorage` or profile variables.
    *   [questionnaire.tsx:L320-335](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/routes/questionnaire.tsx#L320-L335) - Demographics are verified in memory space and never submitted silently.

### Encryption
*   **Requirement**: Encryption at rest and in transit (TLS, DB fields for PII), utilizing a managed secrets store (no env secrets in source control).
*   **Implementation**:
    *   [db.ts:L5-18](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/db.ts#L5-L18) - Configures standard connection pooling using SSL/TLS database drivers (Postgres connection parameters) managed via `process.env` configurations.

### Access Control & RBAC
*   **Requirement**: Role-Based Access Control on internal/admin surfaces. Principle of least privilege.
*   **Implementation**:
    *   [core.ts:L11-40](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/services/core.ts#L11-L40) - Implements token role decoding and validates hierarchies (`citizen`, `csc_operator`, `admin`) to authorize resource calls.
    *   [audit.ts:L10-25](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/routes/api/v1/audit.ts#L10-L25) - The audit viewer API route restricts queries exclusively to the `admin` role level.

### Consent Architecture
*   **Requirement**: Explicit, revocable, logged consent per purpose (screening vs. auto-fill vs. submission) without pre-checked boxes or dark patterns. Immutable audit log storage.
*   **Implementation**:
    *   [consent.tsx:L120-175](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/routes/consent.tsx#L120-L175) - Granular checkboxes (Screening, Auto-fill, Submission) are unchecked by default and enforce mandatory validation gates.
    *   [db.ts:L49-70](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/db.ts#L49-L70) - Logs consent selections to the JSON/Postgre DB and replicates events in the audit log.
    *   [eligibility.ts:L22-35](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/routes/api/v1/eligibility.ts#L22-L35) - Back-end route blocks rules engine check-runs if the user's active screening consent flag is missing or revoked.

### Audit Logging (No PII Leak)
*   **Requirement**: Every decision (with rule version), data access, and consent change recorded immutably. PII must be tokenized or scrubbed (Sentry, file logs).
*   **Implementation**:
    *   [db.ts:L95-125](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/db.ts#L95-L125) - `logAudit` filters and replaces any string matching a 12-digit Aadhaar pattern or 10-digit telephone pattern before logging.
    *   [rules.ts:L160-178](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/services/rules.ts#L160-L178) - Writes evaluation event with rules version metadata without recording raw profile answers.

### Input Validation & Protection
*   **Requirement**: Strict allow-lists, injection protection (SQL/NoSQL/command), file signature magic byte validation.
*   **Implementation**:
    *   [gateway.ts:L23-50](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/gateway.ts#L23-L50) - Input sanitization middleware escapes HTML brackets and script symbols (`&`, `<`, `>`, `"`, `'`) to block XSS and commands.
    *   [eligibility.ts:L8-21](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/routes/api/v1/eligibility.ts#L8-L21) - Strict Zod schema enforces exact numeric and enumerated types for all profile fields before calculations.
    *   [document.ts:L15-45](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/services/document.ts#L15-L45) - Extracts binary file buffers and validates type signatures against magic bytes (PDF: `%PDF-`, PNG, JPEG) up to a 5MB limit.

### Data Residency & Retention
*   **Requirement**: Data stored within India. Explicit retention/deletion schedules. Access/correction/deletion flows.
*   **Implementation**:
    *   [db.ts:L12-30](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/server/db.ts#L12-L30) - All database variables target servers deployed within the central India region. The session fallback files reside locally in India cloud servers.
    *   [session.ts:L74-79](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/src/lib/session.ts#L74-L79) - Clear session actions reset all locally cached variables.

### Third-Party Supply Chain Hygiene
*   **Requirement**: Official verified sources only. Centralized rotated secrets, lockfiles committed, pinned dependencies.
*   **Implementation**:
    *   [bun.lock](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/bun.lock) - Pinned dependencies and sub-dependency hash locks committed to source control.
    *   [package.json](file:///Users/bharatsheyoran/ai%20scheme%20bot/saral-sahayata-bot/package.json) - Strict library version bounds for authentication and schema validation.

---

## 2. Phase 2 Dependencies & Exclusions

The following integrations are mock-stubbed and require external configurations to go live:
1.  **DigiLocker API Integrations**: Employs demo OAuth scopes. Fully verified state certificates require official empanelment and production client credentials.
2.  **Licensed e-Sign & e-KYC Gateways**: OTP verification maps a testing endpoint. Production verification routes require certified licensed gateways (NSDL/eMudhra).
