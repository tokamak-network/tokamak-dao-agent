#!/bin/bash
# GovLens E2E Test Script
# Usage: bash test-e2e.sh
#
# Requires: GovLens server running on localhost:4000

set -e

BASE="http://localhost:4000"
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# ENS Governor — a known OZ Governor deployment on Ethereum mainnet
ENS_GOVERNOR="0x323A76393544d5ecca80cd6ef2A560C6a395b7E3"
SLUG="ens-test-$(date +%s)"

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}── $1 ──${NC}"; }

echo -e "${CYAN}GovLens E2E Test Suite${NC}"
echo "Target: $BASE"
echo "Test slug: $SLUG"

# ─── 1. Health Check ─────────────────────────────────────────
step "1. Health Check"
HEALTH=$(curl -s $BASE/health)
echo "$HEALTH" | grep -q '"ok"' && pass "Health endpoint" || fail "Health endpoint"

# ─── 2. 404 Handling ─────────────────────────────────────────
step "2. 404 Handling"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/v1/nonexistent)
[ "$STATUS" = "404" ] && pass "404 for unknown route" || fail "Expected 404, got $STATUS"

# ─── 3. Governance Discovery (ENS Governor) ──────────────────
step "3. Governance Discovery — ENS Governor"
DISCOVER=$(curl -s -X POST $BASE/api/v1/discover \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$ENS_GOVERNOR\", \"chainId\": 1}")
echo "$DISCOVER" | python3 -m json.tool 2>/dev/null || echo "$DISCOVER"

echo "$DISCOVER" | grep -q '"oz_governor"' && pass "Detected OZ Governor framework" || fail "Framework detection failed"
echo "$DISCOVER" | grep -q '"governor"' && pass "Found governor contract" || fail "Governor not discovered"
echo "$DISCOVER" | grep -q '"timelock"' && pass "Found timelock contract" || fail "Timelock not discovered"
echo "$DISCOVER" | grep -q '"token"' && pass "Found governance token" || fail "Token not discovered"

# ─── 4. Input Validation ─────────────────────────────────────
step "4. Input Validation"
INVALID_ADDR=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/v1/discover \
  -H "Content-Type: application/json" \
  -d '{"address": "not_an_address", "chainId": 1}')
[ "$INVALID_ADDR" = "400" ] && pass "Rejects invalid address (400)" || fail "Expected 400, got $INVALID_ADDR"

INVALID_CHAIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/v1/discover \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$ENS_GOVERNOR\", \"chainId\": 999}")
[ "$INVALID_CHAIN" = "400" ] && pass "Rejects invalid chain ID (400)" || fail "Expected 400, got $INVALID_CHAIN"

INVALID_SLUG=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d "{\"slug\": \"A\", \"name\": \"Bad\", \"address\": \"$ENS_GOVERNOR\", \"chainId\": 1}")
[ "$INVALID_SLUG" = "400" ] && pass "Rejects invalid slug (400)" || fail "Expected 400 for bad slug, got $INVALID_SLUG"

# ─── 5. Tenant Onboarding ────────────────────────────────────
step "5. Tenant Onboarding — ENS"
ONBOARD=$(curl -s -X POST $BASE/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d "{\"slug\": \"$SLUG\", \"name\": \"ENS Test\", \"address\": \"$ENS_GOVERNOR\", \"chainId\": 1}")

API_KEY=$(echo "$ONBOARD" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)
if [ -n "$API_KEY" ]; then
  pass "Tenant created with API key: ${API_KEY:0:24}..."
else
  echo "$ONBOARD"
  fail "Tenant creation failed — no API key returned"
fi

TENANT_ID=$(echo "$ONBOARD" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Tenant ID: $TENANT_ID"
echo "  Framework: $(echo "$ONBOARD" | grep -o '"framework":"[^"]*"' | cut -d'"' -f4)"

# ─── 6. Duplicate Slug Rejection ─────────────────────────────
step "6. Duplicate Slug Rejection"
DUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/api/v1/tenants \
  -H "Content-Type: application/json" \
  -d "{\"slug\": \"$SLUG\", \"name\": \"Dup\", \"address\": \"$ENS_GOVERNOR\", \"chainId\": 1}")
[ "$DUP_STATUS" = "409" ] && pass "Rejects duplicate slug (409)" || fail "Expected 409, got $DUP_STATUS"

# ─── 7. Auth Enforcement ─────────────────────────────────────
step "7. Auth Enforcement"
NO_AUTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/tenants/$SLUG")
[ "$NO_AUTH" = "401" ] && pass "Rejects no auth (401)" || fail "Expected 401, got $NO_AUTH"

BAD_KEY=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/tenants/$SLUG" \
  -H "Authorization: Bearer gvl_invalidkey123")
[ "$BAD_KEY" = "401" ] && pass "Rejects bad API key (401)" || fail "Expected 401, got $BAD_KEY"

BAD_FORMAT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/tenants/$SLUG" \
  -H "Authorization: Bearer sk_not_govlens")
[ "$BAD_FORMAT" = "401" ] && pass "Rejects wrong key format (401)" || fail "Expected 401, got $BAD_FORMAT"

# ─── 8. Get Tenant Info ──────────────────────────────────────
step "8. Get Tenant Info"
TENANT=$(curl -s "$BASE/api/v1/tenants/$SLUG" \
  -H "Authorization: Bearer $API_KEY")

echo "$TENANT" | grep -q "\"$SLUG\"" && pass "Tenant slug matches" || fail "Slug mismatch"
echo "$TENANT" | grep -q '"criteria"' && pass "Criteria config present" || fail "Criteria missing"
echo "$TENANT" | grep -q '"lenses"' && pass "Lenses config present" || fail "Lenses missing"

CRITERIA_COUNT=$(echo "$TENANT" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['criteria']))" 2>/dev/null || echo "?")
LENS_COUNT=$(echo "$TENANT" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['lenses']))" 2>/dev/null || echo "?")
echo "  Criteria: $CRITERIA_COUNT, Lenses: $LENS_COUNT"

# ─── 9. Slug Mismatch Protection ─────────────────────────────
step "9. Slug Mismatch Protection"
MISMATCH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/tenants/wrong-slug/proposals" \
  -H "Authorization: Bearer $API_KEY")
[ "$MISMATCH" = "403" ] && pass "Rejects mismatched slug (403)" || fail "Expected 403, got $MISMATCH"

# ─── 10. Proposals List (empty) ──────────────────────────────
step "10. Proposals List"
PROPOSALS=$(curl -s "$BASE/api/v1/tenants/$SLUG/proposals" \
  -H "Authorization: Bearer $API_KEY")
echo "$PROPOSALS" | grep -q '"proposals"' && pass "Proposals endpoint returns array" || fail "Proposals endpoint broken"

PROP_COUNT=$(echo "$PROPOSALS" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null || echo "?")
echo "  Proposals synced: $PROP_COUNT"

# ─── 11. Credibility Endpoint ────────────────────────────────
step "11. Credibility Endpoint"
CRED=$(curl -s "$BASE/api/v1/tenants/$SLUG/credibility" \
  -H "Authorization: Bearer $API_KEY")
echo "$CRED" | grep -q '"agents"' && pass "Credibility endpoint returns agents" || fail "Credibility endpoint broken"

# ─── 12. Nonexistent Proposal ────────────────────────────────
step "12. Nonexistent Proposal Handling"
NOT_FOUND=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/v1/tenants/$SLUG/proposals/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $API_KEY")
[ "$NOT_FOUND" = "404" ] && pass "Returns 404 for nonexistent proposal" || fail "Expected 404, got $NOT_FOUND"

# ─── Cleanup info ────────────────────────────────────────────
step "Cleanup"
echo "  Test tenant '$SLUG' left in DB for manual inspection."
echo "  To remove: psql govlens -c \"DELETE FROM tenants WHERE slug = '$SLUG'\""

# ─── Summary ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  All E2E tests passed! (12 steps, ~20 checks)${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo "Tenant: $SLUG"
echo "API Key: $API_KEY"
