package services

import (
	"hash/fnv"
	"math"
	"strings"

	"delivery-backend/internal/models"
)

const (
	baseFeeCents    int64   = 450
	serviceFeeCents int64   = 125
	perKMCents      float64 = 175
	etaSpeedKMH     float64 = 28
)

type geoPoint struct {
	Lat float64
	Lng float64
}

func QuoteAddresses(pickupAddress, dropoffAddress string) models.DeliveryQuote {
	pickupPoint := addressToPoint(pickupAddress)
	dropoffPoint := addressToPoint(dropoffAddress)

	distance := haversineDistanceKM(pickupPoint, dropoffPoint)
	if distance < 1.2 {
		distance = 1.2
	}
	if distance > 28 {
		distance = 28
	}

	distance = roundFloat(distance, 2)
	distanceFee := int64(math.Round(distance * perKMCents))
	price := baseFeeCents + serviceFeeCents + distanceFee

	return models.DeliveryQuote{
		EstimatedDistanceKM: distance,
		BaseFeeCents:        baseFeeCents,
		DistanceFeeCents:    distanceFee,
		ServiceFeeCents:     serviceFeeCents,
		PriceCents:          price,
		PriceDisplay:        models.FormatPriceCents(price),
	}
}

func ETASeconds(distanceKM, progress float64) int {
	if progress >= 1 || distanceKM <= 0 {
		return 0
	}

	remainingDistance := distanceKM * (1 - progress)
	if remainingDistance < 0 {
		remainingDistance = 0
	}

	return int((remainingDistance / etaSpeedKMH) * 3600)
}

func interpolatePoint(origin, destination geoPoint, progress float64, seed float64) geoPoint {
	progress = clamp(progress, 0, 1)

	lat := origin.Lat + (destination.Lat-origin.Lat)*progress
	lng := origin.Lng + (destination.Lng-origin.Lng)*progress

	if progress > 0 && progress < 1 {
		lat += 0.0009 * math.Sin(seed) * (1 - progress)
		lng += 0.0007 * math.Cos(seed*1.2) * (1 - progress)
	}

	return geoPoint{
		Lat: roundFloat(lat, 6),
		Lng: roundFloat(lng, 6),
	}
}

func addressToPoint(address string) geoPoint {
	normalized := strings.ToLower(strings.TrimSpace(address))
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(normalized))
	sum := hasher.Sum32()

	latOffset := float64(int(sum%1200)-600) / 10000
	lngOffset := float64(int((sum/1200)%1200)-600) / 10000

	return geoPoint{
		Lat: roundFloat(33.89+latOffset, 6),
		Lng: roundFloat(35.50+lngOffset, 6),
	}
}

func haversineDistanceKM(origin, destination geoPoint) float64 {
	const earthRadiusKM = 6371

	lat1 := degreesToRadians(origin.Lat)
	lat2 := degreesToRadians(destination.Lat)
	deltaLat := degreesToRadians(destination.Lat - origin.Lat)
	deltaLng := degreesToRadians(destination.Lng - origin.Lng)

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*math.Sin(deltaLng/2)*math.Sin(deltaLng/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKM * c
}

func degreesToRadians(degrees float64) float64 {
	return degrees * math.Pi / 180
}

func roundFloat(value float64, places int) float64 {
	factor := math.Pow(10, float64(places))
	return math.Round(value*factor) / factor
}

func clamp(value, minimum, maximum float64) float64 {
	if value < minimum {
		return minimum
	}
	if value > maximum {
		return maximum
	}
	return value
}
