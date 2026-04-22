package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"delivery-backend/internal/config"
	"delivery-backend/internal/handlers"
	"delivery-backend/internal/middleware"
	"delivery-backend/internal/models"
	"delivery-backend/internal/services"
	"delivery-backend/internal/utils"
)

func Register(router *gin.Engine, db *gorm.DB, cfg config.Config, app *services.App) {
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimitRequests, cfg.RateLimitWindowSeconds)
	jwtManager := utils.NewJWTManager(cfg.JWTSecret, cfg.JWTExpirationHours)
	catalogHandler := handlers.NewCatalogHandler(app.Catalog)
	authHandler := handlers.NewAuthHandler(db, jwtManager, app.Cache, cfg)
	deliveryHandler := handlers.NewDeliveryHandler(app.Deliveries)
	orderHandler := handlers.NewOrderHandler(app.Orders)
	adminHandler := handlers.NewAdminHandler(app.Deliveries)
	notificationHandler := handlers.NewNotificationHandler(app.Notifications)
	authMiddleware := middleware.NewAuthMiddleware(db, jwtManager)

	api := router.Group("/api/v1")
	api.Use(rateLimiter.Middleware)
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "service is up"})
	})

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "delivery backend is running",
			"frontend": gin.H{
				"status": "standalone",
				"note":   "Run the Next.js frontend separately and point it at /api/v1.",
			},
		})
	})

	auth := api.Group("/auth")
	auth.POST("/register/request-code", authHandler.RequestRegistrationCode)
	auth.POST("/register", authHandler.Register)
	auth.POST("/login", authHandler.Login)
	auth.GET("/social/:provider/start", authHandler.SocialStart)
	auth.GET("/social/:provider/callback", authHandler.SocialCallback)
	auth.POST("/social/:provider/callback", authHandler.SocialCallback)
	auth.GET("/me", authMiddleware.RequireAuth, authHandler.Me)

	restaurants := api.Group("/restaurants")
	restaurants.GET("", catalogHandler.ListRestaurants)
	restaurants.GET("/:slug", catalogHandler.GetRestaurant)

	deliveries := api.Group("/deliveries")
	deliveries.Use(authMiddleware.RequireAuth)
	deliveries.POST("/quote", deliveryHandler.Quote)
	deliveries.POST("", deliveryHandler.Create)
	deliveries.GET("", deliveryHandler.List)
	deliveries.GET("/history", deliveryHandler.History)
	deliveries.GET("/:id/status-history", deliveryHandler.StatusHistory)
	deliveries.GET("/:id/tracking", deliveryHandler.Tracking)
	deliveries.PATCH("/:id/status", deliveryHandler.UpdateStatus)

	driver := api.Group("/driver")
	driver.Use(authMiddleware.RequireAuth, authMiddleware.RequireRoles(models.RoleDriver))
	driver.GET("/deliveries/available", deliveryHandler.Available)
	driver.GET("/deliveries/assigned", deliveryHandler.Assigned)
	driver.PATCH("/deliveries/:id/accept", deliveryHandler.Accept)
	driver.PATCH("/deliveries/:id/status", deliveryHandler.UpdateStatus)

	notifications := api.Group("/notifications")
	notifications.Use(authMiddleware.RequireAuth)
	notifications.GET("", notificationHandler.List)
	notifications.PATCH("/:id/read", notificationHandler.MarkRead)

	orders := api.Group("/orders")
	orders.Use(authMiddleware.RequireAuth)
	orders.GET("", orderHandler.List)
	orders.GET("/:id", orderHandler.Get)
	orders.POST("", orderHandler.Create)

	admin := api.Group("/admin")
	admin.Use(authMiddleware.RequireAuth, authMiddleware.RequireRoles(models.RoleAdmin))
	admin.GET("/dashboard", adminHandler.Dashboard)
	admin.GET("/deliveries", adminHandler.ListDeliveries)
	admin.GET("/logs", adminHandler.Logs)
	admin.GET("/drivers", adminHandler.ListDrivers)
	admin.PATCH("/deliveries/:id/assign", adminHandler.AssignDelivery)
}
