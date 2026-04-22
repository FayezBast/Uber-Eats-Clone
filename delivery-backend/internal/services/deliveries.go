package services

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"delivery-backend/internal/cache"
	"delivery-backend/internal/models"
	"delivery-backend/internal/validation"
)

type DeliveryService struct {
	db       *gorm.DB
	cache    *cache.Store
	notifier *NotificationService
	tracking *TrackingService
	cacheTTL time.Duration
}

type CreateDeliveryInput struct {
	PickupAddress  string
	DropoffAddress string
}

type DashboardMetrics struct {
	TotalUsers          int64  `json:"total_users"`
	TotalCustomers      int64  `json:"total_customers"`
	TotalDrivers        int64  `json:"total_drivers"`
	TotalAdmins         int64  `json:"total_admins"`
	TotalDeliveries     int64  `json:"total_deliveries"`
	PendingDeliveries   int64  `json:"pending_deliveries"`
	ActiveDeliveries    int64  `json:"active_deliveries"`
	CompletedDeliveries int64  `json:"completed_deliveries"`
	TotalRevenueCents   int64  `json:"total_revenue_cents"`
	TotalRevenueDisplay string `json:"total_revenue_display"`
	UnreadNotifications int64  `json:"unread_notifications"`
}

type DashboardResponse struct {
	GeneratedAt      time.Time                 `json:"generated_at"`
	Metrics          DashboardMetrics          `json:"metrics"`
	RecentDeliveries []models.DeliveryResponse `json:"recent_deliveries"`
}

type AdminDriverSummary struct {
	ID                  uint   `json:"id"`
	Name                string `json:"name"`
	Email               string `json:"email"`
	ActiveDeliveries    int64  `json:"active_deliveries"`
	CompletedDeliveries int64  `json:"completed_deliveries"`
}

type AdminActivityLogItem struct {
	ID         uint                     `json:"id"`
	DeliveryID uint                     `json:"delivery_id"`
	Status     string                   `json:"status"`
	Note       string                   `json:"note"`
	CreatedAt  time.Time                `json:"created_at"`
	ChangedBy  *models.UserSummary      `json:"changed_by,omitempty"`
	Delivery   *models.DeliveryResponse `json:"delivery,omitempty"`
}

func NewDeliveryService(
	db *gorm.DB,
	cacheStore *cache.Store,
	notifier *NotificationService,
	tracking *TrackingService,
	cacheTTL time.Duration,
) *DeliveryService {
	return &DeliveryService{
		db:       db,
		cache:    cacheStore,
		notifier: notifier,
		tracking: tracking,
		cacheTTL: cacheTTL,
	}
}

func (s *DeliveryService) Quote(pickupAddress, dropoffAddress string) (models.DeliveryQuote, error) {
	pickupAddress = validation.NormalizeAddress(pickupAddress)
	dropoffAddress = validation.NormalizeAddress(dropoffAddress)

	if err := validation.ValidateAddresses(pickupAddress, dropoffAddress); err != nil {
		return models.DeliveryQuote{}, newError(http.StatusBadRequest, err.Error())
	}

	return QuoteAddresses(pickupAddress, dropoffAddress), nil
}

func (s *DeliveryService) CreateDelivery(customer models.User, input CreateDeliveryInput) (models.DeliveryResponse, error) {
	if customer.Role != models.RoleCustomer {
		return models.DeliveryResponse{}, newError(http.StatusForbidden, "only customers can create deliveries")
	}

	quote, err := s.Quote(input.PickupAddress, input.DropoffAddress)
	if err != nil {
		return models.DeliveryResponse{}, err
	}

	pickupAddress := validation.NormalizeAddress(input.PickupAddress)
	dropoffAddress := validation.NormalizeAddress(input.DropoffAddress)

	delivery := models.Delivery{
		CustomerID:          customer.ID,
		PickupAddress:       pickupAddress,
		DropoffAddress:      dropoffAddress,
		EstimatedDistanceKM: quote.EstimatedDistanceKM,
		PriceCents:          quote.PriceCents,
		Status:              models.DeliveryStatusPending,
	}

	tx := s.db.Begin()
	if err := tx.Create(&delivery).Error; err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to create delivery")
	}

	if err := s.recordStatusHistory(tx, delivery.ID, models.DeliveryStatusPending, customer.ID, "Delivery created"); err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to record delivery history")
	}

	if err := tx.Commit().Error; err != nil {
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to save delivery")
	}

	s.invalidateDeliveryCaches(delivery)
	s.notifyDriversAndAdminsAboutNewDelivery(delivery)

	loadedDelivery, err := s.findDeliveryByID(delivery.ID)
	if err != nil {
		return models.DeliveryResponse{}, err
	}

	return loadedDelivery.Response(), nil
}

func (s *DeliveryService) ListDeliveries(user models.User) ([]models.DeliveryResponse, error) {
	cacheKey := userDeliveriesCacheKey(user)

	var cached []models.DeliveryResponse
	if s.cache.GetJSON(cacheKey, &cached) {
		return cached, nil
	}

	query := s.deliveryQuery().Order("created_at desc")
	switch user.Role {
	case models.RoleCustomer:
		query = query.Where("user_id = ?", user.ID)
	case models.RoleDriver:
		query = query.Where("driver_id = ?", user.ID)
	case models.RoleAdmin:
	default:
		return nil, newError(http.StatusForbidden, "unsupported user role")
	}

	var deliveries []models.Delivery
	if err := query.Find(&deliveries).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list deliveries")
	}

	response := mapDeliveries(deliveries)
	_ = s.cache.SetJSON(cacheKey, response, s.cacheTTL)
	return response, nil
}

func (s *DeliveryService) ListHistory(user models.User) ([]models.DeliveryResponse, error) {
	cacheKey := userHistoryCacheKey(user)

	var cached []models.DeliveryResponse
	if s.cache.GetJSON(cacheKey, &cached) {
		return cached, nil
	}

	query := s.deliveryQuery().
		Where("status = ?", models.DeliveryStatusDelivered).
		Order("updated_at desc")

	switch user.Role {
	case models.RoleCustomer:
		query = query.Where("user_id = ?", user.ID)
	case models.RoleDriver:
		query = query.Where("driver_id = ?", user.ID)
	case models.RoleAdmin:
	default:
		return nil, newError(http.StatusForbidden, "unsupported user role")
	}

	var deliveries []models.Delivery
	if err := query.Find(&deliveries).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list order history")
	}

	response := mapDeliveries(deliveries)
	_ = s.cache.SetJSON(cacheKey, response, s.cacheTTL)
	return response, nil
}

func (s *DeliveryService) ListAvailableDeliveries() ([]models.DeliveryResponse, error) {
	const cacheKey = "driver:available-deliveries"

	var cached []models.DeliveryResponse
	if s.cache.GetJSON(cacheKey, &cached) {
		return cached, nil
	}

	var deliveries []models.Delivery
	if err := s.deliveryQuery().
		Where("status = ? AND driver_id IS NULL", models.DeliveryStatusPending).
		Order("created_at desc").
		Find(&deliveries).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list available deliveries")
	}

	response := mapDeliveries(deliveries)
	_ = s.cache.SetJSON(cacheKey, response, s.cacheTTL)
	return response, nil
}

func (s *DeliveryService) ListAssignedDeliveries(driver models.User) ([]models.DeliveryResponse, error) {
	if driver.Role != models.RoleDriver {
		return nil, newError(http.StatusForbidden, "only drivers can list assigned deliveries")
	}

	cacheKey := fmt.Sprintf("driver:%d:assigned", driver.ID)

	var cached []models.DeliveryResponse
	if s.cache.GetJSON(cacheKey, &cached) {
		return cached, nil
	}

	var deliveries []models.Delivery
	if err := s.deliveryQuery().
		Where("driver_id = ?", driver.ID).
		Order("updated_at desc").
		Find(&deliveries).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list assigned deliveries")
	}

	response := mapDeliveries(deliveries)
	_ = s.cache.SetJSON(cacheKey, response, s.cacheTTL)
	return response, nil
}

func (s *DeliveryService) AcceptDelivery(driver models.User, deliveryID uint) (models.DeliveryResponse, error) {
	if driver.Role != models.RoleDriver {
		return models.DeliveryResponse{}, newError(http.StatusForbidden, "only drivers can accept deliveries")
	}

	tx := s.db.Begin()

	var delivery models.Delivery
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND status = ? AND driver_id IS NULL", deliveryID, models.DeliveryStatusPending).
		First(&delivery).Error
	if err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.DeliveryResponse{}, newError(http.StatusNotFound, "delivery is no longer available")
		}
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to load delivery")
	}

	delivery.DriverID = &driver.ID
	delivery.Status = models.DeliveryStatusAccepted

	if err := tx.Save(&delivery).Error; err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to assign delivery")
	}

	if err := s.recordStatusHistory(tx, delivery.ID, models.DeliveryStatusAccepted, driver.ID, "Delivery accepted by driver"); err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to record delivery history")
	}

	if err := tx.Commit().Error; err != nil {
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to save delivery")
	}

	loadedDelivery, err := s.findDeliveryByID(delivery.ID)
	if err != nil {
		return models.DeliveryResponse{}, err
	}

	s.invalidateDeliveryCaches(loadedDelivery)
	_ = s.tracking.CaptureForStatus(loadedDelivery)
	_ = s.notifier.Create([]uint{loadedDelivery.CustomerID}, "delivery_accepted", fmt.Sprintf("Driver %s accepted delivery #%d.", driver.Name, loadedDelivery.ID), map[string]interface{}{
		"delivery_id": loadedDelivery.ID,
		"status":      loadedDelivery.Status,
	})

	return loadedDelivery.Response(), nil
}

func (s *DeliveryService) UpdateStatus(actor models.User, deliveryID uint, nextStatus, note string) (models.DeliveryResponse, error) {
	nextStatus = strings.ToLower(strings.TrimSpace(nextStatus))
	note = strings.TrimSpace(note)
	if !models.ValidDeliveryStatus(nextStatus) {
		return models.DeliveryResponse{}, newError(http.StatusBadRequest, "invalid delivery status")
	}

	tx := s.db.Begin()
	var delivery models.Delivery
	query := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", deliveryID)
	switch actor.Role {
	case models.RoleDriver:
		query = query.Where("driver_id = ?", actor.ID)
	case models.RoleAdmin:
	default:
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusForbidden, "only drivers or admins can update delivery status")
	}

	if err := query.First(&delivery).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.DeliveryResponse{}, newError(http.StatusNotFound, "delivery not found")
		}
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to load delivery")
	}

	if !models.CanTransitionDeliveryStatus(delivery.Status, nextStatus) {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusBadRequest, "invalid status transition")
	}

	if nextStatus != models.DeliveryStatusPending && delivery.DriverID == nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusBadRequest, "delivery must have an assigned driver before changing status")
	}

	delivery.Status = nextStatus
	if err := tx.Save(&delivery).Error; err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to update delivery")
	}

	if note == "" {
		note = fmt.Sprintf("Status changed to %s", nextStatus)
	}

	if err := s.recordStatusHistory(tx, delivery.ID, nextStatus, actor.ID, note); err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to record delivery history")
	}

	if err := tx.Commit().Error; err != nil {
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to update delivery")
	}

	loadedDelivery, err := s.findDeliveryByID(delivery.ID)
	if err != nil {
		return models.DeliveryResponse{}, err
	}

	s.invalidateDeliveryCaches(loadedDelivery)
	_ = s.tracking.CaptureForStatus(loadedDelivery)
	_ = s.notifier.Create([]uint{loadedDelivery.CustomerID}, "delivery_status_updated", fmt.Sprintf("Delivery #%d is now %s.", loadedDelivery.ID, loadedDelivery.Status), map[string]interface{}{
		"delivery_id": loadedDelivery.ID,
		"status":      loadedDelivery.Status,
	})

	return loadedDelivery.Response(), nil
}

func (s *DeliveryService) StatusHistory(user models.User, deliveryID uint) ([]models.DeliveryStatusHistory, error) {
	delivery, err := s.findAccessibleDelivery(user, deliveryID)
	if err != nil {
		return nil, err
	}

	var history []models.DeliveryStatusHistory
	if err := s.db.
		Preload("ChangedByUser").
		Where("delivery_id = ?", delivery.ID).
		Order("created_at asc").
		Find(&history).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to load delivery history")
	}

	return history, nil
}

func (s *DeliveryService) TrackingSnapshot(user models.User, deliveryID uint) (models.TrackingSnapshot, error) {
	delivery, err := s.findAccessibleDelivery(user, deliveryID)
	if err != nil {
		return models.TrackingSnapshot{}, err
	}

	snapshot, err := s.tracking.Snapshot(delivery)
	if err != nil {
		return models.TrackingSnapshot{}, newError(http.StatusInternalServerError, "failed to load tracking snapshot")
	}

	return snapshot, nil
}

func (s *DeliveryService) AdminDashboard() (DashboardResponse, error) {
	const cacheKey = "admin:dashboard"

	var cached DashboardResponse
	if s.cache.GetJSON(cacheKey, &cached) {
		return cached, nil
	}

	var metrics DashboardMetrics
	s.db.Model(&models.User{}).Count(&metrics.TotalUsers)
	s.db.Model(&models.User{}).Where("role = ?", models.RoleCustomer).Count(&metrics.TotalCustomers)
	s.db.Model(&models.User{}).Where("role = ?", models.RoleDriver).Count(&metrics.TotalDrivers)
	s.db.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&metrics.TotalAdmins)
	s.db.Model(&models.Delivery{}).Count(&metrics.TotalDeliveries)
	s.db.Model(&models.Delivery{}).Where("status = ?", models.DeliveryStatusPending).Count(&metrics.PendingDeliveries)
	s.db.Model(&models.Delivery{}).Where("status IN ?", []string{models.DeliveryStatusAccepted, models.DeliveryStatusPickedUp}).Count(&metrics.ActiveDeliveries)
	s.db.Model(&models.Delivery{}).Where("status = ?", models.DeliveryStatusDelivered).Count(&metrics.CompletedDeliveries)
	s.db.Model(&models.Delivery{}).Select("COALESCE(SUM(price_cents), 0)").Where("status = ?", models.DeliveryStatusDelivered).Scan(&metrics.TotalRevenueCents)
	s.db.Model(&models.Notification{}).Where("read_at IS NULL").Count(&metrics.UnreadNotifications)
	metrics.TotalRevenueDisplay = models.FormatPriceCents(metrics.TotalRevenueCents)

	var recentDeliveries []models.Delivery
	if err := s.deliveryQuery().Order("created_at desc").Limit(8).Find(&recentDeliveries).Error; err != nil {
		return DashboardResponse{}, newError(http.StatusInternalServerError, "failed to load dashboard data")
	}

	response := DashboardResponse{
		GeneratedAt:      time.Now(),
		Metrics:          metrics,
		RecentDeliveries: mapDeliveries(recentDeliveries),
	}

	_ = s.cache.SetJSON(cacheKey, response, s.cacheTTL)
	return response, nil
}

func (s *DeliveryService) AdminListDeliveries() ([]models.DeliveryResponse, error) {
	var deliveries []models.Delivery
	if err := s.deliveryQuery().Order("created_at desc").Find(&deliveries).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list deliveries")
	}

	return mapDeliveries(deliveries), nil
}

func (s *DeliveryService) AdminListDrivers() ([]AdminDriverSummary, error) {
	var drivers []models.User
	if err := s.db.
		Where("role = ?", models.RoleDriver).
		Order("name asc").
		Find(&drivers).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to list drivers")
	}

	type driverCount struct {
		DriverID uint
		Count    int64
	}

	activeCounts := make(map[uint]int64, len(drivers))
	completedCounts := make(map[uint]int64, len(drivers))

	var activeRows []driverCount
	if err := s.db.Model(&models.Delivery{}).
		Select("driver_id, COUNT(*) as count").
		Where("driver_id IS NOT NULL AND status IN ?", []string{models.DeliveryStatusAccepted, models.DeliveryStatusPickedUp}).
		Group("driver_id").
		Scan(&activeRows).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to aggregate active driver deliveries")
	}
	for _, row := range activeRows {
		activeCounts[row.DriverID] = row.Count
	}

	var completedRows []driverCount
	if err := s.db.Model(&models.Delivery{}).
		Select("driver_id, COUNT(*) as count").
		Where("driver_id IS NOT NULL AND status = ?", models.DeliveryStatusDelivered).
		Group("driver_id").
		Scan(&completedRows).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to aggregate completed driver deliveries")
	}
	for _, row := range completedRows {
		completedCounts[row.DriverID] = row.Count
	}

	summaries := make([]AdminDriverSummary, 0, len(drivers))
	for _, driver := range drivers {
		summaries = append(summaries, AdminDriverSummary{
			ID:                  driver.ID,
			Name:                driver.Name,
			Email:               driver.Email,
			ActiveDeliveries:    activeCounts[driver.ID],
			CompletedDeliveries: completedCounts[driver.ID],
		})
	}

	return summaries, nil
}

func (s *DeliveryService) AssignDeliveryToDriver(admin models.User, deliveryID, driverID uint, note string) (models.DeliveryResponse, error) {
	if admin.Role != models.RoleAdmin {
		return models.DeliveryResponse{}, newError(http.StatusForbidden, "only admins can assign deliveries")
	}

	note = strings.TrimSpace(note)
	tx := s.db.Begin()

	var delivery models.Delivery
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&delivery, deliveryID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.DeliveryResponse{}, newError(http.StatusNotFound, "delivery not found")
		}
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to load delivery")
	}

	if delivery.Status != models.DeliveryStatusPending || delivery.DriverID != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusBadRequest, "only pending unassigned deliveries can be assigned")
	}

	var driver models.User
	if err := tx.Where("id = ? AND role = ?", driverID, models.RoleDriver).First(&driver).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.DeliveryResponse{}, newError(http.StatusNotFound, "driver not found")
		}
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to load driver")
	}

	delivery.DriverID = &driver.ID
	delivery.Status = models.DeliveryStatusAccepted

	if err := tx.Save(&delivery).Error; err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to assign delivery")
	}

	if note == "" {
		note = fmt.Sprintf("Assigned to driver %s by admin", driver.Name)
	}

	if err := s.recordStatusHistory(tx, delivery.ID, models.DeliveryStatusAccepted, admin.ID, note); err != nil {
		tx.Rollback()
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to record delivery history")
	}

	if err := tx.Commit().Error; err != nil {
		return models.DeliveryResponse{}, newError(http.StatusInternalServerError, "failed to save delivery assignment")
	}

	loadedDelivery, err := s.findDeliveryByID(delivery.ID)
	if err != nil {
		return models.DeliveryResponse{}, err
	}

	s.invalidateDeliveryCaches(loadedDelivery)
	_ = s.tracking.CaptureForStatus(loadedDelivery)
	_ = s.notifier.Create(
		[]uint{loadedDelivery.CustomerID, driver.ID},
		"delivery_assigned",
		fmt.Sprintf("Delivery #%d was assigned to driver %s.", loadedDelivery.ID, driver.Name),
		map[string]interface{}{
			"delivery_id": loadedDelivery.ID,
			"driver_id":   driver.ID,
			"status":      loadedDelivery.Status,
		},
	)

	return loadedDelivery.Response(), nil
}

func (s *DeliveryService) AdminActivityLog() ([]AdminActivityLogItem, error) {
	const cacheKey = "admin:activity"

	var cached []AdminActivityLogItem
	if s.cache.GetJSON(cacheKey, &cached) {
		return cached, nil
	}

	var history []models.DeliveryStatusHistory
	if err := s.db.
		Preload("ChangedByUser").
		Order("created_at desc").
		Limit(20).
		Find(&history).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to load admin activity")
	}

	if len(history) == 0 {
		empty := []AdminActivityLogItem{}
		_ = s.cache.SetJSON(cacheKey, empty, s.cacheTTL)
		return empty, nil
	}

	deliveryIDs := make([]uint, 0, len(history))
	seenDeliveries := make(map[uint]struct{}, len(history))
	for _, entry := range history {
		if _, seen := seenDeliveries[entry.DeliveryID]; seen {
			continue
		}

		seenDeliveries[entry.DeliveryID] = struct{}{}
		deliveryIDs = append(deliveryIDs, entry.DeliveryID)
	}

	var deliveries []models.Delivery
	if err := s.deliveryQuery().
		Where("deliveries.id IN ?", deliveryIDs).
		Find(&deliveries).Error; err != nil {
		return nil, newError(http.StatusInternalServerError, "failed to load admin activity deliveries")
	}

	deliveriesByID := make(map[uint]models.DeliveryResponse, len(deliveries))
	for _, delivery := range deliveries {
		deliveriesByID[delivery.ID] = delivery.Response()
	}

	activity := make([]AdminActivityLogItem, 0, len(history))
	for _, entry := range history {
		item := AdminActivityLogItem{
			ID:         entry.ID,
			DeliveryID: entry.DeliveryID,
			Status:     entry.Status,
			Note:       entry.Note,
			CreatedAt:  entry.CreatedAt,
		}

		if entry.ChangedByUser != nil {
			summary := entry.ChangedByUser.Summary()
			item.ChangedBy = &summary
		}

		if delivery, ok := deliveriesByID[entry.DeliveryID]; ok {
			deliveryCopy := delivery
			item.Delivery = &deliveryCopy
		}

		activity = append(activity, item)
	}

	_ = s.cache.SetJSON(cacheKey, activity, s.cacheTTL)
	return activity, nil
}

func (s *DeliveryService) findDeliveryByID(deliveryID uint) (models.Delivery, error) {
	var delivery models.Delivery
	if err := s.deliveryQuery().First(&delivery, deliveryID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Delivery{}, newError(http.StatusNotFound, "delivery not found")
		}
		return models.Delivery{}, newError(http.StatusInternalServerError, "failed to load delivery")
	}

	return delivery, nil
}

func (s *DeliveryService) findAccessibleDelivery(user models.User, deliveryID uint) (models.Delivery, error) {
	query := s.deliveryQuery().Where("deliveries.id = ?", deliveryID)
	switch user.Role {
	case models.RoleCustomer:
		query = query.Where("deliveries.user_id = ?", user.ID)
	case models.RoleDriver:
		query = query.Where("(deliveries.driver_id = ?) OR (deliveries.status = ? AND deliveries.driver_id IS NULL)", user.ID, models.DeliveryStatusPending)
	case models.RoleAdmin:
	default:
		return models.Delivery{}, newError(http.StatusForbidden, "unsupported user role")
	}

	var delivery models.Delivery
	if err := query.First(&delivery).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Delivery{}, newError(http.StatusNotFound, "delivery not found")
		}
		return models.Delivery{}, newError(http.StatusInternalServerError, "failed to load delivery")
	}

	return delivery, nil
}

func (s *DeliveryService) deliveryQuery() *gorm.DB {
	return s.db.Preload("Customer").Preload("Driver")
}

func (s *DeliveryService) recordStatusHistory(db *gorm.DB, deliveryID uint, status string, changedByUserID uint, note string) error {
	history := models.DeliveryStatusHistory{
		DeliveryID:      deliveryID,
		Status:          status,
		ChangedByUserID: changedByUserID,
		Note:            note,
	}

	return db.Create(&history).Error
}

func (s *DeliveryService) notifyDriversAndAdminsAboutNewDelivery(delivery models.Delivery) {
	var userIDs []uint
	if err := s.db.Model(&models.User{}).
		Where("role IN ?", []string{models.RoleDriver, models.RoleAdmin}).
		Pluck("id", &userIDs).Error; err != nil {
		return
	}

	_ = s.notifier.Create(userIDs, "delivery_created", fmt.Sprintf("New delivery #%d is available.", delivery.ID), map[string]interface{}{
		"delivery_id": delivery.ID,
		"status":      delivery.Status,
	})
}

func (s *DeliveryService) invalidateDeliveryCaches(delivery models.Delivery) {
	keys := []string{
		fmt.Sprintf("customer:%d:deliveries", delivery.CustomerID),
		fmt.Sprintf("customer:%d:history", delivery.CustomerID),
		"driver:available-deliveries",
		"admin:dashboard",
		"admin:activity",
	}

	if delivery.DriverID != nil {
		keys = append(keys,
			fmt.Sprintf("driver:%d:deliveries", *delivery.DriverID),
			fmt.Sprintf("driver:%d:history", *delivery.DriverID),
			fmt.Sprintf("driver:%d:assigned", *delivery.DriverID),
		)
	}

	s.cache.Delete(keys...)
}

func userDeliveriesCacheKey(user models.User) string {
	return fmt.Sprintf("%s:%d:deliveries", user.Role, user.ID)
}

func userHistoryCacheKey(user models.User) string {
	return fmt.Sprintf("%s:%d:history", user.Role, user.ID)
}

func mapDeliveries(deliveries []models.Delivery) []models.DeliveryResponse {
	response := make([]models.DeliveryResponse, 0, len(deliveries))
	for _, delivery := range deliveries {
		response = append(response, delivery.Response())
	}

	return response
}
