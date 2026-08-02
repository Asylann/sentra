package dedup

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisClient wraps the Redis connection for deduplication.
type RedisClient struct {
	client *redis.Client
}

// NewRedisClient creates a new deduplication client.
func NewRedisClient(addr, password string) *RedisClient {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       0,
	})
	return &RedisClient{client: rdb}
}

// CheckAndSet sets the deliveryID if it doesn't exist, with a 24h TTL.
// Returns true if the event is a duplicate (i.e. SETNX failed).
func (r *RedisClient) CheckAndSet(ctx context.Context, deliveryID string) (bool, error) {
	key := "webhook:delivery:" + deliveryID

	// SETNX with 24-hour TTL
	set, err := r.client.SetNX(ctx, key, "1", 24*time.Hour).Result()
	if err != nil {
		return false, err
	}

	// If set is false, the key already existed, meaning it's a duplicate.
	return !set, nil
}
