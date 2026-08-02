package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"strings"
)

// ValidateSignature verifies the HMAC-SHA256 signature of a GitHub webhook payload.
// Research3 §"HMAC Verification": constant-time compare is required to prevent timing attacks.
func ValidateSignature(secret, signatureHeader string, payload []byte) bool {
	if signatureHeader == "" || secret == "" {
		return false
	}

	// GitHub sends signature as "sha256=..."
	parts := strings.SplitN(signatureHeader, "=", 2)
	if len(parts) != 2 || parts[0] != "sha256" {
		return false
	}

	signatureBytes, err := hex.DecodeString(parts[1])
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := mac.Sum(nil)

	// ALWAYS use subtle.ConstantTimeCompare for HMAC comparison
	return subtle.ConstantTimeCompare(signatureBytes, expectedMAC) == 1
}
