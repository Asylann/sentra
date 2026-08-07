package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"log"

	"github.com/redis/go-redis/v9"
	"github.com/usena/sentra/api-gateway/internal/auth"
	"github.com/usena/sentra/api-gateway/internal/dashboard"
	"github.com/usena/sentra/api-gateway/internal/db"
	"github.com/usena/sentra/api-gateway/internal/dedup"
	"github.com/usena/sentra/api-gateway/internal/invites"
	"github.com/usena/sentra/api-gateway/internal/kafka"
	"github.com/usena/sentra/api-gateway/internal/onboarding"
	"github.com/usena/sentra/api-gateway/internal/organizations"
	"github.com/usena/sentra/api-gateway/internal/users"
	"github.com/usena/sentra/api-gateway/internal/webhook"
	"github.com/usena/sentra/api-gateway/internal/ws"
)

func main() {
	// Configure structured logging
	log.Println("Starting Sentra API Gateway")

	// ---------------------------------------------------------------------------
	// Load configuration (fail-fast on missing required vars)
	// ---------------------------------------------------------------------------
	webhookSecret := os.Getenv("GITHUB_WEBHOOK_SECRET")
	if webhookSecret == "" {
		log.Fatal("GITHUB_WEBHOOK_SECRET is required")
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		dbUrl = "postgres://sentra:sentra_dev_password_change_in_prod@localhost:5432/sentra"
	}

	kafkaBrokersStr := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokersStr == "" {
		kafkaBrokersStr = "localhost:9094"
	}
	kafkaBrokers := strings.Split(kafkaBrokersStr, ",")

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	ctx := context.Background()

	// ---------------------------------------------------------------------------
	// Initialize dependencies
	// ---------------------------------------------------------------------------

	// 1. PostgreSQL connection pool
	dbPool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		log.Printf("Unable to create connection pool: %v", err)
	}
	defer dbPool.Close()

	// 2. Kafka producer
	kafkaProducer, err := kafka.NewProducer(kafkaBrokers)
	if err != nil {
		log.Printf("Failed to start Kafka Producer: %v", err)
	}
	defer kafkaProducer.Close()

	// 3. Redis dedup client
	redisClient := dedup.NewRedisClient(redisAddr, "")

	// 4. sqlc queries (for outbox relay worker)
	queries := db.New(dbPool)

	// 5. Auth service (validates GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, JWT_SECRET)
	authSvc := auth.NewService(dbPool)

	// 6. Application handlers
	webhookService := webhook.NewService(dbPool)
	webhookHandler := webhook.NewHandler(webhookSecret, redisClient, webhookService)
	authHandler := auth.NewHandler(authSvc)
	usersHandler := users.NewHandler(dbPool, authSvc)
	relayWorker := kafka.NewRelayWorker(queries, kafkaProducer)

	// 7. WebSocket Hub
	wsRedisClient := redis.NewClient(&redis.Options{Addr: redisAddr, Password: "", DB: 0})
	wsHub := ws.NewHub(wsRedisClient)
	wsHandler := ws.NewHandler(wsHub)

	// 8. Dashboard Handler
	dashboardHandler := dashboard.NewDashboardHandler(queries)

	// 9. B2B Multi-Tenancy Handlers
	onboardingHandler := onboarding.NewHandler(queries)
	invitesHandler := invites.NewHandler(queries)
	orgsHandler := organizations.NewHandler(queries)

	// ---------------------------------------------------------------------------
	// Start background workers
	// ---------------------------------------------------------------------------
	workerCtx, workerCancel := context.WithCancel(ctx)
	go relayWorker.Start(workerCtx)
	go wsHub.ListenToRedis(workerCtx)

	// ---------------------------------------------------------------------------
	// HTTP Router setup
	// ---------------------------------------------------------------------------
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	// CORS — allow the React dev server and any production frontend origin
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Request logging middleware
	router.Use(func(c *gin.Context) {
		start := time.Now()
		c.Next()
		log.Printf("HTTP request, status: %d, method: %s, path: %s, latency: %v", c.Writer.Status(), c.Request.Method, c.Request.URL.Path, time.Since(start))
	})

	// ---------------------------------------------------------------------------
	// Routes
	// ---------------------------------------------------------------------------

	// Health checks (no auth)
	router.GET("/healthz", func(c *gin.Context) { c.String(http.StatusOK, "OK") })
	router.GET("/readyz", func(c *gin.Context) { c.String(http.StatusOK, "OK") })

	// GitHub webhook endpoint (verified by HMAC, not JWT)
	router.POST("/webhook", webhookHandler.HandleWebhook)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// --- Auth routes (no JWT required) ---
		authGroup := v1.Group("/auth/github")
		{
			authGroup.GET("/login", authHandler.Login)
			authGroup.GET("/callback", authHandler.Callback)
		}

		// --- Protected routes (JWT required) ---
		protected := v1.Group("")
		protected.Use(auth.AuthRequired(authSvc))
		{
			protected.GET("/users/me", usersHandler.Me)
			protected.GET("/users/me/installation", usersHandler.CheckInstallation)
			protected.GET("/ws", wsHandler.ServeWS)

			// Dashboard routes
			protected.GET("/prs", dashboardHandler.GetPullRequests)
			protected.GET("/prs/:id", dashboardHandler.GetPullRequest)
			protected.GET("/metrics", dashboardHandler.GetMetrics)
			protected.GET("/repositories", dashboardHandler.GetRepositories)

			// B2B multi-tenancy routes
			protected.POST("/auth/onboarding", onboardingHandler.CompleteOnboarding)
			protected.GET("/users/me/invites", invitesHandler.GetMyInvites)
			protected.GET("/users/me/orgs", orgsHandler.GetMyOrganizations)
			protected.POST("/users/me/orgs/switch", orgsHandler.SwitchOrganization)
			protected.POST("/invites/:id/respond", invitesHandler.RespondToInvite)
			protected.GET("/orgs/:id/prs", orgsHandler.GetOrgPRs)
			protected.GET("/orgs/:id/leaderboard", orgsHandler.GetLeaderboard)
			protected.GET("/orgs/:id/members", orgsHandler.GetOrgMembers)
			protected.POST("/orgs/:id/invites", invitesHandler.CreateInvite)
			protected.GET("/orgs/:id/invites/pending", invitesHandler.GetOrgPendingInvites)
		}
	}

	// ---------------------------------------------------------------------------
	// HTTP Server with graceful shutdown
	// ---------------------------------------------------------------------------
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	go func() {
		log.Printf("API Gateway listening, port: %v", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server failed to start: %v", err)
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	workerCancel()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited properly")
}
