package webhook

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"

	"github.com/usena/sentra/api-gateway/internal/db"
)

// Service bridges HTTP ingest and the PostgreSQL Transactional Outbox.
type Service struct {
	dbPool *pgxpool.Pool
}

// NewService creates a new webhook service.
func NewService(pool *pgxpool.Pool) *Service {
	return &Service{dbPool: pool}
}

// ProcessWebhook runs the ACID transaction to store the payload and queue the outbox event.
func (s *Service) ProcessWebhook(ctx context.Context, deliveryID, eventType, action, senderLogin string, installationID, organizationID, repositoryID int64, rawPayload []byte) error {
	// Start PostgreSQL transaction
	tx, err := s.dbPool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := db.New(tx)

	// Convert strings/integers to pgtype structs for pgx/v5 compatibility
	delUUID, _ := uuid.Parse(deliveryID)
	pgUUID := pgtype.UUID{Bytes: delUUID, Valid: true}

	actionType := pgtype.Text{String: action, Valid: action != ""}
	senderType := pgtype.Text{String: senderLogin, Valid: senderLogin != ""}
	orgType := pgtype.Int8{Int64: organizationID, Valid: organizationID > 0}
	repoType := pgtype.Int8{Int64: repositoryID, Valid: repositoryID > 0}

	// Extract details for the Upsert from the raw payload
	var extraData struct {
		Repository struct {
			FullName string `json:"full_name"`
			Private  bool   `json:"private"`
			Owner    struct {
				ID    int64  `json:"id"`
				Login string `json:"login"`
				Type  string `json:"type"`
			} `json:"owner"`
		} `json:"repository"`
		Organization struct {
			Login string `json:"login"`
		} `json:"organization"`
	}
	_ = json.Unmarshal(rawPayload, &extraData)

	// 1. Upsert Organization and Repository if present
	// This prevents foreign key violations in the webhook_payloads table
	// when processing webhooks for repos that haven't been fully synced yet.
	if orgType.Valid {
		orgLogin := extraData.Organization.Login
		if orgLogin == "" {
			orgLogin = extraData.Repository.Owner.Login
		}
		if orgLogin == "" {
			orgLogin = "unknown"
		}

		internalOrgID, err := qtx.UpsertOrganization(ctx, db.UpsertOrganizationParams{
			GithubID:       organizationID,
			Login:          orgLogin,
			Type:           "Organization",
			InstallationID: installationID,
		})
		if err != nil {
			log.Printf("Failed to upsert organization (continuing anyway): %v", err)
		} else {
			orgType.Int64 = internalOrgID
		}
	}

	if repoType.Valid {
		repoFullName := extraData.Repository.FullName
		if repoFullName == "" {
			repoFullName = "unknown/unknown"
		}

		// If org isn't present, owner is a User
		var orgIDForRepo int64 = orgType.Int64
		if !orgType.Valid && extraData.Repository.Owner.Type == "User" {
			// Also upsert a User as an Organization so the FK works
			internalOrgID, err := qtx.UpsertOrganization(ctx, db.UpsertOrganizationParams{
				GithubID:       extraData.Repository.Owner.ID,
				Login:          extraData.Repository.Owner.Login,
				Type:           "User",
				InstallationID: installationID,
			})
			if err == nil {
				orgIDForRepo = internalOrgID
				orgType.Valid = true
				orgType.Int64 = internalOrgID
			}
		}

		if orgType.Valid {
			internalRepoID, err := qtx.UpsertRepository(ctx, db.UpsertRepositoryParams{
				GithubID:       repositoryID,
				OrganizationID: orgIDForRepo,
				FullName:       repoFullName,
				IsPrivate:      extraData.Repository.Private,
			})
			if err != nil {
				log.Printf("Failed to upsert repository (continuing anyway): %v", err)
			} else {
				repoType.Int64 = internalRepoID
			}
		}
	}

	// 2. Insert Webhook Payload (Part 1 of Dual-Write)
	payloadParams := db.InsertWebhookPayloadParams{
		DeliveryID:     pgUUID,
		EventType:      eventType,
		Action:         actionType,
		InstallationID: installationID,
		OrganizationID: orgType,
		RepositoryID:   repoType,
		SenderLogin:    senderType,
		Payload:        rawPayload,
		SignatureValid: true,
	}

	_, err = qtx.InsertWebhookPayload(ctx, payloadParams)
	if err != nil {
		return fmt.Errorf("failed to insert webhook payload: %w", err)
	}

	// 3. Determine Kafka routing and insert Outbox Event (Part 2 of Dual-Write)
	// Extract Pull Request Number from payload if applicable
	var pullNumber int64 = 0
	if eventType == "pull_request" {
		var prData struct {
			Number int64 `json:"number"`
		}
		if err := json.Unmarshal(rawPayload, &prData); err == nil {
			pullNumber = prData.Number
		}
	}

	if pullNumber > 0 && repoType.Valid {
		aggregateID := fmt.Sprintf("%d:%d", repoType.Int64, pullNumber)
		outboxParams := db.InsertOutboxEventParams{
			AggregateID:  aggregateID,
			EventType:    "PullRequestCreated",
			KafkaTopic:   "sentra.pr.queue",
			PayloadProto: rawPayload, // Phase 4: Simply using the raw JSON payload instead of Proto for now
		}

		_, err = qtx.InsertOutboxEvent(ctx, outboxParams)
		if err != nil {
			return fmt.Errorf("failed to insert outbox event: %w", err)
		}
	}

	// 4. Commit ACID transaction
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	log.Printf("Webhook processed and outbox event queued via ACID transaction, delivery_id: %v", deliveryID)
	return nil
}
