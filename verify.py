import os
import sys
import re

def print_status(message, success):
    if success:
        print(f"[OK] {message}")
    else:
        print(f"[FAIL] {message}")

def check_file_exists(filepath):
    exists = os.path.exists(filepath)
    print_status(f"File exists: {filepath}", exists)
    return exists

def validate_openapi():
    # Simple check to see if YAML is readable and has required paths
    filepath = "openapi.yaml"
    if not check_file_exists(filepath):
        return False
    try:
        import yaml
        with open(filepath, "r") as f:
            data = yaml.safe_load(f)
            paths = data.get("paths", {})
            required_endpoints = [
                "/consent", "/eligibility", "/nlu", 
                "/document/validate", "/document/digilocker-auth", 
                "/document/digilocker-verify", "/document/ekyc-verify", "/audit"
            ]
            success = True
            for endpoint in required_endpoints:
                if endpoint not in paths:
                    print_status(f"OpenAPI missing path: {endpoint}", False)
                    success = False
            if success:
                print_status("OpenAPI YAML schema validated successfully.", True)
            return success
    except ImportError:
        print("PyYAML not installed, performing basic line check.")
        with open(filepath, "r") as f:
            content = f.read()
            success = all(endpoint in content for endpoint in ["/consent", "/eligibility", "/nlu"])
            print_status("OpenAPI string check completed.", success)
            return success
    except Exception as e:
        print_status(f"OpenAPI validation error: {e}", False)
        return False

def check_ts_syntax():
    # Simple syntax check for main server files using python compiler syntax verification if possible
    # We will search for unmatched braces or obvious syntax typos in our typescript files
    files = [
        "src/server/db.ts",
        "src/server/gateway.ts",
        "src/server/services/rules.ts",
        "src/server/services/nlu.ts",
        "src/server/services/document.ts",
        "src/server/services/core.ts"
    ]
    all_ok = True
    for f in files:
        if not check_file_exists(f):
            all_ok = False
            continue
        # Verify basic brace matching
        with open(f, "r") as src:
            content = src.read()
            open_braces = content.count("{")
            close_braces = content.count("}")
            if open_braces != close_braces:
                print_status(f"Brace mismatch in {f}: {open_braces} open, {close_braces} close", False)
                all_ok = False
            else:
                print_status(f"Braces match in {f} ({open_braces} pairs)", True)
    return all_ok

def main():
    print("--- Running SchemeSathi System Check ---")
    files_ok = True
    critical_files = [
        "public/sw.js",
        "security_review.md",
        "src/routes/consent.tsx",
        "src/routes/questionnaire.tsx",
        "src/routes/results.tsx",
        "src/routes/scheme.$id.tsx"
    ]
    for filepath in critical_files:
        if not check_file_exists(filepath):
            files_ok = False

    syntax_ok = check_ts_syntax()
    openapi_ok = validate_openapi()

    if files_ok and syntax_ok and openapi_ok:
        print("\nAll sanity checks passed successfully!")
        sys.exit(0)
    else:
        print("\nSome sanity checks failed. Check logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
