package health

// handler.go — Liveness and Readiness probe endpoints.
// GET /healthz  → liveness (process is alive, always returns 200)
// GET /readyz   → readiness (DB pool, Redis, Kafka are connected)
//                 Returns 503 if any dependency is unreachable.
// Used by Kubernetes probes and Docker healthcheck.
