package models

import "time"

type DeliveryStatusHistory struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	DeliveryID      uint      `json:"delivery_id" gorm:"index;not null"`
	Status          string    `json:"status" gorm:"size:50;not null"`
	ChangedByUserID uint      `json:"changed_by_user_id" gorm:"index;not null"`
	ChangedByUser   *User     `json:"changed_by_user,omitempty" gorm:"foreignKey:ChangedByUserID"`
	Note            string    `json:"note" gorm:"size:255"`
	CreatedAt       time.Time `json:"created_at"`
}
