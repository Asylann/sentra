module github.com/usena/sentra/api-gateway

go 1.22

// Dependencies added in Phase 3:
require (
	github.com/IBM/sarama v1.43.0 // Apache Kafka client (Sarama)
	github.com/gin-contrib/cors v1.7.2 // CORS middleware for Gin
	github.com/gin-gonic/gin v1.10.0 // HTTP framework (Radix tree routing)
	github.com/golang-jwt/jwt/v5 v5.2.1 // JWT signing and validation (Phase 11)
	github.com/jackc/pgx/v5 v5.6.0 // PostgreSQL driver (high-perf, no ORM)
	github.com/kelseyhightower/envconfig v1.4.0 // Env var validation
	github.com/redis/go-redis/v9 v9.5.1 // Redis client
	github.com/rs/zerolog v1.33.0 // Structured JSON logger
	golang.org/x/oauth2 v0.21.0 // GitHub OAuth2 flow (Phase 11)
	google.golang.org/protobuf v1.34.1 // Protobuf serialization
)

require (
	github.com/gorilla/websocket v1.5.3 // indirect
	github.com/pgvector/pgvector-go v0.2.2 // indirect
)
