package services

import (
	"math"

	"gorm.io/gorm"

	"delivery-backend/internal/models"
)

type TrackingService struct {
	db *gorm.DB
}

func NewTrackingService(db *gorm.DB) *TrackingService {
	return &TrackingService{db: db}
}

func (s *TrackingService) CaptureForStatus(delivery models.Delivery) error {
	progress, err := s.nextProgress(delivery)
	if err != nil {
		return err
	}

	return s.appendPoint(delivery, progress)
}

func (s *TrackingService) UpdateActiveDeliveries() error {
	var deliveries []models.Delivery
	if err := s.db.Where("status IN ?", []string{models.DeliveryStatusAccepted, models.DeliveryStatusPickedUp}).Find(&deliveries).Error; err != nil {
		return err
	}

	for _, delivery := range deliveries {
		progress, err := s.nextProgress(delivery)
		if err != nil {
			return err
		}
		if err := s.appendPoint(delivery, progress); err != nil {
			return err
		}
	}

	return nil
}

func (s *TrackingService) Snapshot(delivery models.Delivery) (models.TrackingSnapshot, error) {
	var points []models.DeliveryTrackingPoint
	if err := s.db.Where("delivery_id = ?", delivery.ID).Order("created_at desc").Limit(12).Find(&points).Error; err != nil {
		return models.TrackingSnapshot{}, err
	}

	reverseTrackingPoints(points)

	progress := defaultProgressForStatus(delivery.Status)
	currentPoint := interpolatePoint(addressToPoint(delivery.PickupAddress), addressToPoint(delivery.DropoffAddress), progress, float64(delivery.ID))
	if len(points) > 0 {
		lastPoint := points[len(points)-1]
		progress = lastPoint.Progress
		currentPoint = geoPoint{Lat: lastPoint.Latitude, Lng: lastPoint.Longitude}
	}

	if delivery.Status == models.DeliveryStatusDelivered {
		progress = 1
		currentPoint = addressToPoint(delivery.DropoffAddress)
	}

	remainingDistance := roundFloat(delivery.EstimatedDistanceKM*(1-progress), 2)
	if remainingDistance < 0 {
		remainingDistance = 0
	}

	return models.TrackingSnapshot{
		DeliveryID:          delivery.ID,
		Status:              delivery.Status,
		CurrentLatitude:     currentPoint.Lat,
		CurrentLongitude:    currentPoint.Lng,
		Progress:            roundFloat(progress, 4),
		EstimatedETASeconds: ETASeconds(delivery.EstimatedDistanceKM, progress),
		RemainingDistanceKM: remainingDistance,
		Points:              points,
	}, nil
}

func (s *TrackingService) nextProgress(delivery models.Delivery) (float64, error) {
	var lastPoint models.DeliveryTrackingPoint
	err := s.db.Where("delivery_id = ?", delivery.ID).Order("created_at desc").First(&lastPoint).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return 0, err
	}

	if err == gorm.ErrRecordNotFound {
		return defaultProgressForStatus(delivery.Status), nil
	}

	switch delivery.Status {
	case models.DeliveryStatusAccepted:
		return clamp(math.Max(lastPoint.Progress, 0.12)+0.08, 0, 0.45), nil
	case models.DeliveryStatusPickedUp:
		return clamp(math.Max(lastPoint.Progress, 0.55)+0.18, 0, 0.96), nil
	case models.DeliveryStatusDelivered:
		return 1, nil
	default:
		return lastPoint.Progress, nil
	}
}

func (s *TrackingService) appendPoint(delivery models.Delivery, progress float64) error {
	origin := addressToPoint(delivery.PickupAddress)
	destination := addressToPoint(delivery.DropoffAddress)

	var totalPoints int64
	if err := s.db.Model(&models.DeliveryTrackingPoint{}).Where("delivery_id = ?", delivery.ID).Count(&totalPoints).Error; err != nil {
		return err
	}

	point := interpolatePoint(origin, destination, progress, float64(delivery.ID)+float64(totalPoints))

	trackingPoint := models.DeliveryTrackingPoint{
		DeliveryID: delivery.ID,
		Latitude:   point.Lat,
		Longitude:  point.Lng,
		Progress:   roundFloat(progress, 4),
	}

	return s.db.Create(&trackingPoint).Error
}

func defaultProgressForStatus(status string) float64 {
	switch status {
	case models.DeliveryStatusAccepted:
		return 0.12
	case models.DeliveryStatusPickedUp:
		return 0.55
	case models.DeliveryStatusDelivered:
		return 1
	default:
		return 0
	}
}

func reverseTrackingPoints(points []models.DeliveryTrackingPoint) {
	for left, right := 0, len(points)-1; left < right; left, right = left+1, right-1 {
		points[left], points[right] = points[right], points[left]
	}
}
