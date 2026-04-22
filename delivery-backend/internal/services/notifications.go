package services

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"

	"delivery-backend/internal/cache"
	"delivery-backend/internal/models"
)

type NotificationService struct {
	db    *gorm.DB
	cache *cache.Store
}

func NewNotificationService(db *gorm.DB, cacheStore *cache.Store) *NotificationService {
	return &NotificationService{
		db:    db,
		cache: cacheStore,
	}
}

func (s *NotificationService) Create(userIDs []uint, notificationType, message string, payload map[string]interface{}) error {
	if len(userIDs) == 0 {
		return nil
	}

	encodedPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	notifications := make([]models.Notification, 0, len(userIDs))
	for _, userID := range userIDs {
		notifications = append(notifications, models.Notification{
			UserID:  userID,
			Type:    notificationType,
			Message: message,
			Payload: string(encodedPayload),
		})
	}

	if err := s.db.Create(&notifications).Error; err != nil {
		return err
	}

	if len(notifications) > 0 {
		s.cache.Publish("delivery-backend:notifications", encodedPayload)
	}

	return nil
}

func (s *NotificationService) ListForUser(userID uint) ([]models.Notification, error) {
	var notifications []models.Notification
	if err := s.db.Where("user_id = ?", userID).Order("created_at desc").Limit(50).Find(&notifications).Error; err != nil {
		return nil, err
	}

	return notifications, nil
}

func (s *NotificationService) MarkRead(userID, notificationID uint) error {
	now := time.Now()
	return s.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Updates(map[string]interface{}{"read_at": &now}).Error
}
