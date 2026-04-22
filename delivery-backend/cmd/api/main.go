package main

import (
	"context"
	"log"

	"github.com/gin-gonic/gin"

	"delivery-backend/internal/config"
	"delivery-backend/internal/database"
	"delivery-backend/internal/middleware"
	"delivery-backend/internal/routes"
	"delivery-backend/internal/services"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("connect database: %v", err)
	}

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("auto migrate database: %v", err)
	}

	if err := database.SeedLocalUsers(db); err != nil {
		log.Fatalf("seed local users: %v", err)
	}

	router := gin.Default()
	_ = router.SetTrustedProxies(nil)
	router.Use(middleware.CORS())

	app := services.NewApp(db, cfg)
	go app.Background.Start(context.Background())

	routes.Register(router, db, cfg, app)

	log.Printf("delivery backend listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("run server: %v", err)
	}
}
