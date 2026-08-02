package webhook

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"log"

	"github.com/usena/sentra/api-gateway/internal/dedup"
)

// Handler processes incoming GitHub webhooks.
type Handler struct {
	webhookSecret string
	redis         *dedup.RedisClient
	service       *Service
}

// NewHandler creates a new webhook handler.
func NewHandler(secret string, redis *dedup.RedisClient, service *Service) *Handler {
	return &Handler{
		webhookSecret: secret,
		redis:         redis,
		service:       service,
	}
}

// HandleWebhook is the Gin route handler for POST /webhook
func (h *Handler) HandleWebhook(c *gin.Context) {
	// Research3 §"HMAC Verification": Read raw body first, BEFORE JSON parsing.
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed to read webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	signature := c.GetHeader("X-Hub-Signature-256")
	if !ValidateSignature(h.webhookSecret, signature, payload) {
		log.Println("Invalid webhook signature")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	deliveryID := c.GetHeader("X-GitHub-Delivery")
	if deliveryID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing delivery ID"})
		return
	}

	eventType := c.GetHeader("X-GitHub-Event")

	// Deduplication via Redis SETNX (24h TTL)
	isDuplicate, err := h.redis.CheckAndSet(c.Request.Context(), deliveryID)
	if err != nil {
		log.Printf("Redis dedup check failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	if isDuplicate {
		log.Printf("Duplicate webhook ignored, delivery_id: %v", deliveryID)
		// GitHub documentation recommends returning 2xx for duplicates
		c.Status(http.StatusAccepted)
		return
	}

	// Phase 4: Execute Transactional Outbox Dual-Write
	// Extract rudimentary JSON payload info
	var tempPayload struct {
		Action       string `json:"action"`
		Installation struct {
			ID int64 `json:"id"`
		} `json:"installation"`
		Organization struct {
			ID int64 `json:"id"`
		} `json:"organization"`
		Repository struct {
			ID int64 `json:"id"`
		} `json:"repository"`
		Sender struct {
			Login string `json:"login"`
		} `json:"sender"`
	}

	// Ignore err if it can't unmarshal cleanly, default values will be 0 or ""
	json.Unmarshal(payload, &tempPayload)

	err = h.service.ProcessWebhook(
		c.Request.Context(),
		deliveryID,
		eventType,
		tempPayload.Action,
		tempPayload.Sender.Login,
		tempPayload.Installation.ID,
		tempPayload.Organization.ID,
		tempPayload.Repository.ID,
		payload,
	)

	if err != nil {
		log.Printf("Failed to process webhook (Dual-Write error): %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "processing failed"})
		return
	}

	log.Printf("Webhook validated, persisted, and outbox event queued, delivery_id: %v, event_type: %v, payload_size: %v", deliveryID, eventType, len(payload))

	c.Status(http.StatusAccepted)
}
