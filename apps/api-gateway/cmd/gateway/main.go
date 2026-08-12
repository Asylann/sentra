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
	"github.com/usena/sentra/api-gateway/internal/repos"
	"github.com/usena/sentra/api-gateway/internal/settings"
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
	orgsHandler := organizations.NewHandler(queries, dbPool)

	// 10. Settings Handler (raw pgx — bypasses sqlc for schema-evolution flexibility)
	settingsHandler := settings.NewHandler(dbPool)
	reposHandler := repos.NewHandler(queries, dbPool)

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

	router.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}
		
		html := `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Lost in the Void</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #0B0F19;
            color: #F8FAFC;
            font-family: system-ui, -apple-system, sans-serif;
            background-image: radial-gradient(circle at 50% 30%, #1a1a2e 0%, transparent 70%);
            overflow: hidden;
            position: relative;
        }
        .container {
            text-align: center;
            position: relative;
            z-index: 10;
        }
        h1 {
            font-size: 150px;
            font-weight: 900;
            margin: 0;
            line-height: 1;
            background: linear-gradient(135deg, #6366F1, #A855F7, #EC4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .7; }
        }
        h2 {
            font-size: 2.5rem;
            margin: 20px 0;
        }
        p {
            color: #94A3B8;
            font-size: 1.25rem;
            max-width: 500px;
            margin: 0 auto 40px auto;
        }
        a {
            display: inline-flex;
            align-items: center;
            padding: 15px 30px;
            background: #1F2937;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 500;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.1);
        }
        a:hover {
            transform: scale(1.05);
            background: #374151;
            box-shadow: 0 0 40px -10px rgba(99,102,241,0.5);
        }
        .glow {
            position: absolute;
            width: 300px;
            height: 300px;
            background: rgba(99,102,241,0.2);
            border-radius: 50%;
            filter: blur(100px);
            z-index: 1;
        }
        .glow-1 { top: 20%; left: 20%; }
        .glow-2 { bottom: 20%; right: 20%; background: rgba(236,72,153,0.2); }
    </style>
</head>
<body>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
    <div class="container">
        <h1>404</h1>
        <h2>Lost in the Void</h2>
        <p>The endpoint or page you're looking for doesn't exist.</p>
        <a href="` + frontendURL + `">Return to Dashboard</a>
    </div>
</body>
</html>`
		c.Data(http.StatusNotFound, "text/html; charset=utf-8", []byte(html))
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
			protected.DELETE("/invites/:id", invitesHandler.RevokeInvite)
			protected.POST("/orgs", orgsHandler.CreateWorkspace)
			protected.GET("/orgs/:id/prs", orgsHandler.GetOrgPRs)
			protected.GET("/orgs/:id/leaderboard", orgsHandler.GetLeaderboard)
			protected.GET("/orgs/:id/members", orgsHandler.GetOrgMembers)
			protected.PUT("/orgs/:id", orgsHandler.RenameWorkspace)
			protected.DELETE("/orgs/:id", orgsHandler.DeleteWorkspace)
			protected.PUT("/orgs/:id/members/:user_id/role", orgsHandler.UpdateMemberRole)
			protected.DELETE("/orgs/:id/members/:user_id", orgsHandler.RemoveMember)
			protected.POST("/orgs/:id/invites", invitesHandler.CreateInvite)
			protected.GET("/orgs/:id/invites/pending", invitesHandler.GetOrgPendingInvites)

			// Settings routes
			protected.GET("/orgs/:id/settings", settingsHandler.GetOrgSettings)
			protected.PUT("/orgs/:id/settings", settingsHandler.UpdateOrgSettings)

			// Repository management routes
			protected.GET("/orgs/:id/repos", reposHandler.GetOrgRepos)
			protected.POST("/orgs/:id/repos/sync", reposHandler.SyncInstallationRepos)
			protected.PUT("/orgs/:id/repos/:repo_id", reposHandler.LinkOrgRepo)
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
