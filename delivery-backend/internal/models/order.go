package models

import "time"

type RestaurantOrder struct {
	ID                uint                  `json:"id" gorm:"primaryKey"`
	CustomerID        uint                  `json:"customer_id" gorm:"index;not null"`
	Customer          *User                 `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	DeliveryID        uint                  `json:"delivery_id" gorm:"index;not null"`
	Delivery          *Delivery             `json:"delivery,omitempty" gorm:"foreignKey:DeliveryID"`
	RestaurantSlug    string                `json:"restaurant_slug" gorm:"size:80;index;not null"`
	RestaurantName    string                `json:"restaurant_name" gorm:"size:120;not null"`
	RestaurantCuisine string                `json:"restaurant_cuisine" gorm:"size:120;not null"`
	RestaurantImage   string                `json:"restaurant_image" gorm:"size:255;not null"`
	RestaurantAddress string                `json:"restaurant_address" gorm:"size:255;not null"`
	DeliveryAddress   string                `json:"delivery_address" gorm:"size:255;not null"`
	DeliveryNotes     string                `json:"delivery_notes" gorm:"size:255"`
	SubtotalCents     int64                 `json:"subtotal_cents" gorm:"default:0;not null"`
	DeliveryFeeCents  int64                 `json:"delivery_fee_cents" gorm:"default:0;not null"`
	ServiceFeeCents   int64                 `json:"service_fee_cents" gorm:"default:0;not null"`
	TotalCents        int64                 `json:"total_cents" gorm:"default:0;not null"`
	Items             []RestaurantOrderItem `json:"items,omitempty" gorm:"foreignKey:OrderID"`
	CreatedAt         time.Time             `json:"created_at"`
	UpdatedAt         time.Time             `json:"updated_at"`
}

type RestaurantOrderItem struct {
	ID              uint      `json:"id" gorm:"primaryKey"`
	OrderID         uint      `json:"order_id" gorm:"index;not null"`
	MenuItemID      string    `json:"menu_item_id" gorm:"size:80;not null"`
	MenuSectionName string    `json:"menu_section_name" gorm:"size:120;not null"`
	Name            string    `json:"name" gorm:"size:120;not null"`
	Description     string    `json:"description" gorm:"size:255"`
	Quantity        int       `json:"quantity" gorm:"not null"`
	UnitPriceCents  int64     `json:"unit_price_cents" gorm:"default:0;not null"`
	TotalPriceCents int64     `json:"total_price_cents" gorm:"default:0;not null"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}
