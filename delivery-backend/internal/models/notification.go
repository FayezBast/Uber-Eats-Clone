package models

import "time"

type Notification struct {
	ID        uint       `json:"id" gorm:"primaryKey"`
	UserID    uint       `json:"user_id" gorm:"index;not null"`
	Type      string     `json:"type" gorm:"size:50;index;not null"`
	Message   string     `json:"message" gorm:"size:255;not null"`
	Payload   string     `json:"payload" gorm:"type:text"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func (n Notification) Read() bool {
	return n.ReadAt != nil
}
