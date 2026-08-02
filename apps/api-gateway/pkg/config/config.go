package config

// Reads and validates environment variables at startup (fail-fast pattern).
// Uses envconfig or viper. Panics immediately if required vars are missing.
// Required: GATEWAY_PORT, POSTGRES_DSN, REDIS_URL, KAFKA_BROKERS,
//           GITHUB_WEBHOOK_SECRET, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH
