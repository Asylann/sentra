package ws

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
	"github.com/usena/sentra/api-gateway/internal/auth"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins for simplicity in development; 
	// in production, validate against frontend URL.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Handler handles WebSocket requests.
type Handler struct {
	hub *Hub
}

// NewHandler creates a new WebSocket handler.
func NewHandler(hub *Hub) *Handler {
	return &Handler{
		hub: hub,
	}
}

// ServeWS upgrades the HTTP connection to a WebSocket and registers the user.
func (h *Handler) ServeWS(c *gin.Context) {
	// The AuthRequired middleware should have injected claims
	claims, ok := c.Get("claims")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing auth claims"})
		return
	}
	sentraClaims, ok := claims.(*auth.SentraClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid auth claims"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Error().Err(err).Msg("Failed to upgrade WebSocket connection")
		return
	}

	// Register connection with the Hub using GitHub ID
	githubID := sentraClaims.GitHubID
	h.hub.AddConnection(githubID, conn)

	// Keep connection alive and read messages (even if we just discard them)
	// so we can detect client disconnects.
	go func() {
		defer func() {
			h.hub.RemoveConnection(githubID)
			conn.Close()
		}()
		
		conn.SetReadLimit(512)
		_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		conn.SetPongHandler(func(string) error { 
			_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil 
		})

		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Warn().Err(err).Int64("github_id", githubID).Msg("WebSocket closed unexpectedly")
				}
				break // Exit loop on error/disconnect
			}
		}
	}()
	
	// Start a ticker to ping the client
	go func() {
		ticker := time.NewTicker(50 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(time.Second)); err != nil {
				return
			}
		}
	}()
}
