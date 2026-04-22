package models

import (
	"fmt"
	"time"
)

const (
	DeliveryStatusPending   = "pending"
	DeliveryStatusAccepted  = "accepted"
	DeliveryStatusPickedUp  = "picked_up"
	DeliveryStatusDelivered = "delivered"
)

var deliveryTransitions = map[string][]string{
	DeliveryStatusPending:   {DeliveryStatusAccepted},
	DeliveryStatusAccepted:  {DeliveryStatusPickedUp},
	DeliveryStatusPickedUp:  {DeliveryStatusDelivered},
	DeliveryStatusDelivered: {},
}

type Delivery struct {
	ID                  uint      `json:"id" gorm:"primaryKey"`
	CustomerID          uint      `json:"customer_id" gorm:"column:user_id;index;not null"`
	Customer            *User     `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	DriverID            *uint     `json:"driver_id,omitempty" gorm:"index"`
	Driver              *User     `json:"driver,omitempty" gorm:"foreignKey:DriverID"`
	PickupAddress       string    `json:"pickup_address" gorm:"size:255;not null"`
	DropoffAddress      string    `json:"dropoff_address" gorm:"size:255;not null"`
	EstimatedDistanceKM float64   `json:"estimated_distance_km" gorm:"type:numeric(10,2);default:0;not null"`
	PriceCents          int64     `json:"price_cents" gorm:"default:0;not null"`
	Status              string    `json:"status" gorm:"size:50;default:pending;not null"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type DeliveryResponse struct {
	ID                  uint         `json:"id"`
	CustomerID          uint         `json:"customer_id"`
	Customer            *UserSummary `json:"customer,omitempty"`
	DriverID            *uint        `json:"driver_id,omitempty"`
	Driver              *UserSummary `json:"driver,omitempty"`
	PickupAddress       string       `json:"pickup_address"`
	DropoffAddress      string       `json:"dropoff_address"`
	EstimatedDistanceKM float64      `json:"estimated_distance_km"`
	PriceCents          int64        `json:"price_cents"`
	PriceDisplay        string       `json:"price_display"`
	Status              string       `json:"status"`
	CreatedAt           time.Time    `json:"created_at"`
	UpdatedAt           time.Time    `json:"updated_at"`
}

type DeliveryQuote struct {
	EstimatedDistanceKM float64 `json:"estimated_distance_km"`
	BaseFeeCents        int64   `json:"base_fee_cents"`
	DistanceFeeCents    int64   `json:"distance_fee_cents"`
	ServiceFeeCents     int64   `json:"service_fee_cents"`
	PriceCents          int64   `json:"price_cents"`
	PriceDisplay        string  `json:"price_display"`
}

func ValidDeliveryStatus(status string) bool {
	_, ok := deliveryTransitions[status]
	return ok
}

func CanTransitionDeliveryStatus(currentStatus, nextStatus string) bool {
	if currentStatus == nextStatus {
		return true
	}

	for _, allowedStatus := range deliveryTransitions[currentStatus] {
		if allowedStatus == nextStatus {
			return true
		}
	}

	return false
}

func (d Delivery) Response() DeliveryResponse {
	response := DeliveryResponse{
		ID:                  d.ID,
		CustomerID:          d.CustomerID,
		DriverID:            d.DriverID,
		PickupAddress:       d.PickupAddress,
		DropoffAddress:      d.DropoffAddress,
		EstimatedDistanceKM: d.EstimatedDistanceKM,
		PriceCents:          d.PriceCents,
		PriceDisplay:        FormatPriceCents(d.PriceCents),
		Status:              d.Status,
		CreatedAt:           d.CreatedAt,
		UpdatedAt:           d.UpdatedAt,
	}

	if d.Customer != nil {
		customer := d.Customer.Summary()
		response.Customer = &customer
	}
	if d.Driver != nil {
		driver := d.Driver.Summary()
		response.Driver = &driver
	}

	return response
}

func FormatPriceCents(cents int64) string {
	return fmt.Sprintf("$%.2f", float64(cents)/100)
}
