package ws

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"log"
)

// Hub manages active WebSocket connections and broadcasts messages from Redis.
type Hub struct {
	// connections maps a GitHub User ID to their active WebSocket connection
	connections map[int64]*websocket.Conn
	mu          sync.RWMutex
	redisClient *redis.Client
}

// NewHub creates a new WebSocket Hub.
func NewHub(redisClient *redis.Client) *Hub {
	return &Hub{
		connections: make(map[int64]*websocket.Conn),
		redisClient: redisClient,
	}
}

// AddConnection registers a new WebSocket connection for a given GitHub User ID.
func (h *Hub) AddConnection(githubID int64, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// Close existing connection if one exists
	if oldConn, exists := h.connections[githubID]; exists {
		_ = oldConn.Close()
	}

	h.connections[githubID] = conn
	log.Printf("WebSocket connection added, github_id: %v", githubID)
}

// RemoveConnection unregisters a WebSocket connection.
func (h *Hub) RemoveConnection(githubID int64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, exists := h.connections[githubID]; exists {
		delete(h.connections, githubID)
		log.Printf("WebSocket connection removed, github_id: %v", githubID)
	}
}

// ListenToRedis subscribes to the Redis pattern for PR events and broadcasts them.
func (h *Hub) ListenToRedis(ctx context.Context) {
	// Subscribe to all PR event channels: user:<github_id>:pr_events
	pubsub := h.redisClient.PSubscribe(ctx, "user:*:pr_events")
	defer pubsub.Close()

	ch := pubsub.Channel()
	log.Println("WebSocket Hub listening to Redis pattern: user:*:pr_events")

	for {
		select {
		case <-ctx.Done():
			log.Println("WebSocket Hub stopping Redis listener")
			return
		case msg, ok := <-ch:
			if !ok {
				return
			}

			// Parse the githubID from the channel name: "user:<github_id>:pr_events"
			var githubID int64
			_, err := fmt.Sscanf(msg.Channel, "user:%d:pr_events", &githubID)
			if err != nil {
				log.Printf("Failed to parse githubID from channel, channel: %v, err: %v", msg.Channel, err)
				continue
			}

			// Broadcast to the user if they are connected to this instance
			h.broadcastToUser(githubID, []byte(msg.Payload))
		}
	}
}

func (h *Hub) broadcastToUser(githubID int64, payload []byte) {
	h.mu.RLock()
	conn, exists := h.connections[githubID]
	h.mu.RUnlock()

	if !exists {
		return // User not connected to this gateway instance
	}

	// Set write deadline
	_ = conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	err := conn.WriteMessage(websocket.TextMessage, payload)
	if err != nil {
		log.Printf("Failed to write to WebSocket, removing connection, github_id: %v, err: %v", githubID, err)
		h.RemoveConnection(githubID)
		_ = conn.Close()
	} else {
		log.Printf("Broadcasted message to user, github_id: %v, payload: %s", githubID, payload)
	}
}
