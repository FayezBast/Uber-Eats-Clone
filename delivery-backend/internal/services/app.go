package services

import (
	"time"

	"gorm.io/gorm"

	"delivery-backend/internal/cache"
	"delivery-backend/internal/config"
)

type App struct {
	Cache         *cache.Store
	Catalog       *CatalogService
	Notifications *NotificationService
	Tracking      *TrackingService
	Deliveries    *DeliveryService
	Orders        *OrderService
	Background    *BackgroundJobs
}

func NewApp(db *gorm.DB, cfg config.Config) *App {
	cacheStore := cache.NewStore(cfg)
	catalogService := NewCatalogService()
	notificationService := NewNotificationService(db, cacheStore)
	trackingService := NewTrackingService(db)
	deliveryService := NewDeliveryService(
		db,
		cacheStore,
		notificationService,
		trackingService,
		time.Duration(cfg.CacheTTLSeconds)*time.Second,
	)
	orderService := NewOrderService(db, catalogService, deliveryService)

	return &App{
		Cache:         cacheStore,
		Catalog:       catalogService,
		Notifications: notificationService,
		Tracking:      trackingService,
		Deliveries:    deliveryService,
		Orders:        orderService,
		Background: NewBackgroundJobs(
			trackingService,
			time.Duration(cfg.TrackingTickSeconds)*time.Second,
		),
	}
}
