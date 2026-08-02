package webhook

// outbox.go — Infrastructure Layer
// Responsibility: SQL queries for the Transactional Outbox pattern.
// The Relay goroutine (in internal/kafka/relay.go) polls this table using:
//   SELECT ... FOR UPDATE SKIP LOCKED
// This atomically locks rows for the current worker instance while other
// instances skip locked rows — enabling safe horizontal scaling without
// distributed locks or race conditions. Research1 §2.3, Research2 §3.2.

