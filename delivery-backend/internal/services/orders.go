package services

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"

	"delivery-backend/internal/models"
	"delivery-backend/internal/validation"
)

type OrderService struct {
	db              *gorm.DB
	catalogService  *CatalogService
	deliveryService *DeliveryService
}

type PlaceOrderInput struct {
	RestaurantSlug  string           `json:"restaurant_slug"`
	DeliveryAddress string           `json:"delivery_address"`
	DeliveryNotes   string           `json:"delivery_notes"`
	Items           []OrderItemInput `json:"items"`
}

type OrderItemInput struct {
	MenuItemID string `json:"menu_item_id"`
	Quantity   int    `json:"quantity"`
}

type OrderItemResponse struct {
	ID                uint   `json:"id"`
	MenuItemID        string `json:"menu_item_id"`
	MenuSectionName   string `json:"menu_section_name"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Quantity          int    `json:"quantity"`
	UnitPriceCents    int64  `json:"unit_price_cents"`
	UnitPriceDisplay  string `json:"unit_price_display"`
	TotalPriceCents   int64  `json:"total_price_cents"`
	TotalPriceDisplay string `json:"total_price_display"`
}

type OrderResponse struct {
	ID                 uint                           `json:"id"`
	RestaurantSlug     string                         `json:"restaurant_slug"`
	RestaurantName     string                         `json:"restaurant_name"`
	RestaurantCuisine  string                         `json:"restaurant_cuisine"`
	RestaurantImage    string                         `json:"restaurant_image"`
	RestaurantAddress  string                         `json:"restaurant_address"`
	DeliveryAddress    string                         `json:"delivery_address"`
	DeliveryNotes      string                         `json:"delivery_notes"`
	SubtotalCents      int64                          `json:"subtotal_cents"`
	SubtotalDisplay    string                         `json:"subtotal_display"`
	DeliveryFeeCents   int64                          `json:"delivery_fee_cents"`
	DeliveryFeeDisplay string                         `json:"delivery_fee_display"`
	ServiceFeeCents    int64                          `json:"service_fee_cents"`
	ServiceFeeDisplay  string                         `json:"service_fee_display"`
	TotalCents         int64                          `json:"total_cents"`
	TotalDisplay       string                         `json:"total_display"`
	Status             string                         `json:"status"`
	StatusLabel        string                         `json:"status_label"`
	Items              []OrderItemResponse            `json:"items"`
	Delivery           *models.DeliveryResponse       `json:"delivery,omitempty"`
	Tracking           *models.TrackingSnapshot       `json:"tracking,omitempty"`
	History            []models.DeliveryStatusHistory `json:"history,omitempty"`
	CreatedAt          string                         `json:"created_at"`
	UpdatedAt          string                         `json:"updated_at"`
}

func NewOrderService(db *gorm.DB, catalogService *CatalogService, deliveryService *DeliveryService) *OrderService {
	return &OrderService{
		db:              db,
		catalogService:  catalogService,
		deliveryService: deliveryService,
	}
}

func (s *OrderService) ListOrders(user models.User) ([]OrderResponse, error) {
	if user.Role != models.RoleCustomer && user.Role != models.RoleAdmin {
		return nil, newError(http.StatusForbidden, "only customers can list food orders")
	}

	query := s.orderQuery().Order("restaurant_orders.created_at desc")
	if user.Role == models.RoleCustomer {
		query = query.Where("customer_id = ?", user.ID)
	}

	var orders []models.RestaurantOrder
	if err := query.Find(&orders).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list orders")
	}

	return s.mapOrders(user, orders, false)
}

func (s *OrderService) GetOrder(user models.User, orderID uint) (OrderResponse, error) {
	query := s.orderQuery().Where("restaurant_orders.id = ?", orderID)
	switch user.Role {
	case models.RoleCustomer:
		query = query.Where("customer_id = ?", user.ID)
	case models.RoleAdmin:
	default:
		return OrderResponse{}, newError(http.StatusForbidden, "only customers can inspect food orders")
	}

	var order models.RestaurantOrder
	if err := query.First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return OrderResponse{}, newError(http.StatusNotFound, "order not found")
		}
		return OrderResponse{}, newError(http.StatusInternalServerError, "failed to load order")
	}

	return s.mapOrder(user, order, true)
}

func (s *OrderService) PlaceOrder(customer models.User, input PlaceOrderInput) (OrderResponse, error) {
	if customer.Role != models.RoleCustomer {
		return OrderResponse{}, newError(http.StatusForbidden, "only customers can place food orders")
	}

	restaurant, ok := s.catalogService.GetRestaurant(input.RestaurantSlug)
	if !ok {
		return OrderResponse{}, newError(http.StatusNotFound, "restaurant not found")
	}

	deliveryAddress := validation.NormalizeAddress(input.DeliveryAddress)
	if len(deliveryAddress) < 5 {
		return OrderResponse{}, newError(http.StatusBadRequest, "delivery address must be at least 5 characters")
	}
	if len(input.Items) == 0 {
		return OrderResponse{}, newError(http.StatusBadRequest, "at least one menu item is required")
	}

	orderItems := make([]models.RestaurantOrderItem, 0, len(input.Items))
	var subtotalCents int64
	for _, item := range input.Items {
		if item.Quantity <= 0 {
			return OrderResponse{}, newError(http.StatusBadRequest, "item quantity must be positive")
		}

		_, section, menuItem, found := s.catalogService.FindMenuItem(restaurant.Slug, item.MenuItemID)
		if !found {
			return OrderResponse{}, newError(http.StatusBadRequest, fmt.Sprintf("menu item %q was not found", item.MenuItemID))
		}

		totalPrice := int64(item.Quantity) * menuItem.PriceCents
		subtotalCents += totalPrice
		orderItems = append(orderItems, models.RestaurantOrderItem{
			MenuItemID:      menuItem.ID,
			MenuSectionName: section.Name,
			Name:            menuItem.Name,
			Description:     menuItem.Description,
			Quantity:        item.Quantity,
			UnitPriceCents:  menuItem.PriceCents,
			TotalPriceCents: totalPrice,
		})
	}

	deliveryQuote, err := s.deliveryService.Quote(restaurant.Address, deliveryAddress)
	if err != nil {
		return OrderResponse{}, err
	}

	deliveryResponse, err := s.deliveryService.CreateDelivery(customer, CreateDeliveryInput{
		PickupAddress:  restaurant.Address,
		DropoffAddress: deliveryAddress,
	})
	if err != nil {
		return OrderResponse{}, err
	}

	order := models.RestaurantOrder{
		CustomerID:        customer.ID,
		DeliveryID:        deliveryResponse.ID,
		RestaurantSlug:    restaurant.Slug,
		RestaurantName:    restaurant.Name,
		RestaurantCuisine: restaurant.Cuisine,
		RestaurantImage:   restaurant.HeroImage,
		RestaurantAddress: restaurant.Address,
		DeliveryAddress:   deliveryAddress,
		DeliveryNotes:     strings.TrimSpace(input.DeliveryNotes),
		SubtotalCents:     subtotalCents,
		DeliveryFeeCents:  deliveryQuote.BaseFeeCents + deliveryQuote.DistanceFeeCents,
		ServiceFeeCents:   deliveryQuote.ServiceFeeCents,
		TotalCents:        subtotalCents + deliveryQuote.PriceCents,
		Items:             orderItems,
	}

	if err := s.db.Create(&order).Error; err != nil {
		_ = s.db.Delete(&models.Delivery{}, deliveryResponse.ID).Error
		return OrderResponse{}, newError(http.StatusInternalServerError, "failed to place order")
	}

	return s.GetOrder(customer, order.ID)
}

func (s *OrderService) orderQuery() *gorm.DB {
	return s.db.
		Preload("Items").
		Preload("Delivery").
		Preload("Delivery.Customer").
		Preload("Delivery.Driver")
}

func (s *OrderService) mapOrders(user models.User, orders []models.RestaurantOrder, includeDetails bool) ([]OrderResponse, error) {
	response := make([]OrderResponse, 0, len(orders))
	for _, order := range orders {
		mapped, err := s.mapOrder(user, order, includeDetails)
		if err != nil {
			return nil, err
		}
		response = append(response, mapped)
	}

	return response, nil
}

func (s *OrderService) mapOrder(user models.User, order models.RestaurantOrder, includeDetails bool) (OrderResponse, error) {
	status := mapDeliveryStatusToOrderStatus(order.Delivery)
	response := OrderResponse{
		ID:                 order.ID,
		RestaurantSlug:     order.RestaurantSlug,
		RestaurantName:     order.RestaurantName,
		RestaurantCuisine:  order.RestaurantCuisine,
		RestaurantImage:    order.RestaurantImage,
		RestaurantAddress:  order.RestaurantAddress,
		DeliveryAddress:    order.DeliveryAddress,
		DeliveryNotes:      order.DeliveryNotes,
		SubtotalCents:      order.SubtotalCents,
		SubtotalDisplay:    models.FormatPriceCents(order.SubtotalCents),
		DeliveryFeeCents:   order.DeliveryFeeCents,
		DeliveryFeeDisplay: models.FormatPriceCents(order.DeliveryFeeCents),
		ServiceFeeCents:    order.ServiceFeeCents,
		ServiceFeeDisplay:  models.FormatPriceCents(order.ServiceFeeCents),
		TotalCents:         order.TotalCents,
		TotalDisplay:       models.FormatPriceCents(order.TotalCents),
		Status:             status,
		StatusLabel:        orderStatusLabel(status),
		Items:              mapOrderItems(order.Items),
		CreatedAt:          order.CreatedAt.Format(time.RFC3339),
		UpdatedAt:          order.UpdatedAt.Format(time.RFC3339),
	}

	if order.Delivery != nil {
		delivery := order.Delivery.Response()
		response.Delivery = &delivery
	}

	if includeDetails && order.Delivery != nil {
		tracking, err := s.deliveryService.TrackingSnapshot(user, order.Delivery.ID)
		if err == nil {
			response.Tracking = &tracking
		}

		history, err := s.deliveryService.StatusHistory(user, order.Delivery.ID)
		if err == nil {
			response.History = history
		}
	}

	return response, nil
}

func mapOrderItems(items []models.RestaurantOrderItem) []OrderItemResponse {
	response := make([]OrderItemResponse, 0, len(items))
	for _, item := range items {
		response = append(response, OrderItemResponse{
			ID:                item.ID,
			MenuItemID:        item.MenuItemID,
			MenuSectionName:   item.MenuSectionName,
			Name:              item.Name,
			Description:       item.Description,
			Quantity:          item.Quantity,
			UnitPriceCents:    item.UnitPriceCents,
			UnitPriceDisplay:  models.FormatPriceCents(item.UnitPriceCents),
			TotalPriceCents:   item.TotalPriceCents,
			TotalPriceDisplay: models.FormatPriceCents(item.TotalPriceCents),
		})
	}

	return response
}

func mapDeliveryStatusToOrderStatus(delivery *models.Delivery) string {
	if delivery == nil {
		return "confirmed"
	}

	switch delivery.Status {
	case models.DeliveryStatusPending:
		return "confirmed"
	case models.DeliveryStatusAccepted:
		return "courier_assigned"
	case models.DeliveryStatusPickedUp:
		return "on_the_way"
	case models.DeliveryStatusDelivered:
		return "delivered"
	default:
		return "confirmed"
	}
}

func orderStatusLabel(status string) string {
	switch status {
	case "confirmed":
		return "Order confirmed"
	case "courier_assigned":
		return "Courier assigned"
	case "on_the_way":
		return "On the way"
	case "delivered":
		return "Delivered"
	default:
		return "Processing"
	}
}
