package validation

import (
	"fmt"
	"strings"

	"delivery-backend/internal/models"
)

func NormalizeName(name string) string {
	return strings.TrimSpace(name)
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func NormalizeRole(role string) string {
	role = strings.ToLower(strings.TrimSpace(role))
	if role == "" {
		return models.RoleCustomer
	}

	return role
}

func NormalizeAddress(address string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(address)), " ")
}

func ValidateRole(role string) error {
	if !models.ValidUserRole(role) {
		return fmt.Errorf("invalid role %q", role)
	}

	return nil
}

func ValidateAddresses(pickupAddress, dropoffAddress string) error {
	if pickupAddress == "" || dropoffAddress == "" {
		return fmt.Errorf("pickup and dropoff addresses are required")
	}

	if len(pickupAddress) < 5 || len(dropoffAddress) < 5 {
		return fmt.Errorf("pickup and dropoff addresses must be at least 5 characters")
	}

	if strings.EqualFold(pickupAddress, dropoffAddress) {
		return fmt.Errorf("pickup and dropoff addresses must be different")
	}

	return nil
}
