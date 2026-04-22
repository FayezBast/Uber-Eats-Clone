package models

import "time"

type DeliveryTrackingPoint struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	DeliveryID uint      `json:"delivery_id" gorm:"index;not null"`
	Latitude   float64   `json:"latitude" gorm:"type:numeric(10,6);not null"`
	Longitude  float64   `json:"longitude" gorm:"type:numeric(10,6);not null"`
	Progress   float64   `json:"progress" gorm:"type:numeric(5,4);not null"`
	CreatedAt  time.Time `json:"created_at"`
}

type TrackingSnapshot struct {
	DeliveryID          uint                    `json:"delivery_id"`
	Status              string                  `json:"status"`
	CurrentLatitude     float64                 `json:"current_latitude"`
	CurrentLongitude    float64                 `json:"current_longitude"`
	Progress            float64                 `json:"progress"`
	EstimatedETASeconds int                     `json:"estimated_eta_seconds"`
	RemainingDistanceKM float64                 `json:"remaining_distance_km"`
	Points              []DeliveryTrackingPoint `json:"points"`
}
