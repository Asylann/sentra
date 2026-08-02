package kafka

import (
	"context"
	"time"

	"github.com/usena/sentra/api-gateway/internal/db"
	"log"
)

// RelayWorker polls the outbox_events table and publishes to Kafka.
// It solves the Dual-Write problem using the Transactional Outbox pattern.
type RelayWorker struct {
	queries  *db.Queries
	producer *Producer
}

// NewRelayWorker creates a new Outbox Relay worker.
func NewRelayWorker(queries *db.Queries, producer *Producer) *RelayWorker {
	return &RelayWorker{
		queries:  queries,
		producer: producer,
	}
}

// Start begins the continuous polling loop for outbox events.
func (r *RelayWorker) Start(ctx context.Context) {
	log.Println("Starting Transactional Outbox Relay Worker")
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("Relay Worker shutting down")
			return
		case <-ticker.C:
			r.processBatch(ctx)
		}
	}
}

func (r *RelayWorker) processBatch(ctx context.Context) {
	// 1. Fetch locked events (SELECT ... FOR UPDATE SKIP LOCKED)
	events, err := r.queries.GetAndLockPendingOutboxEvents(ctx, 50)
	if err != nil {
		log.Printf("Failed to fetch pending outbox events: %v", err)
		return
	}

	if len(events) == 0 {
		return
	}

	// 2. Publish and update status
	for _, event := range events {
		err := r.producer.Publish(event.KafkaTopic, event.AggregateID, event.PayloadProto)
		if err != nil {
			log.Printf("Failed to publish outbox event to Kafka, event_id: %v, err: %v", event.ID, err)
			// Mark failed, max retries = 3
			failParams := db.MarkOutboxEventFailedParams{
				ID:         event.ID,
				LastError:  err.Error(),
				MaxRetries: 3,
			}
			if markErr := r.queries.MarkOutboxEventFailed(ctx, failParams); markErr != nil {
				log.Printf("Failed to mark outbox event as failed in DB, event_id: %v, err: %v", event.ID, markErr)
			}
			continue
		}

		// 3. Mark published
		if err := r.queries.MarkOutboxEventPublished(ctx, event.ID); err != nil {
			log.Printf("Failed to mark outbox event as published in DB, event_id: %v, err: %v", event.ID, err)
		} else {
			log.Printf("Successfully published event, event_id: %v, topic: %v", event.ID, event.KafkaTopic)
		}
	}
}
