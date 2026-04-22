package utils

import (
	"testing"
	"time"

	"delivery-backend/internal/models"
)

func TestJWTManagerGenerateAndValidateToken(t *testing.T) {
	manager := NewJWTManager("test-secret", 2)

	token, expiresAt, err := manager.GenerateToken(models.User{
		ID:    7,
		Email: "driver@example.com",
		Role:  models.RoleDriver,
	})
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	if token == "" {
		t.Fatal("GenerateToken() returned an empty token")
	}

	if time.Until(expiresAt) <= 0 {
		t.Fatal("GenerateToken() returned an expired timestamp")
	}

	claims, err := manager.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}

	if claims.UserID != 7 {
		t.Fatalf("ValidateToken() user id = %d, want 7", claims.UserID)
	}

	if claims.Email != "driver@example.com" {
		t.Fatalf("ValidateToken() email = %q, want driver@example.com", claims.Email)
	}

	if claims.Role != models.RoleDriver {
		t.Fatalf("ValidateToken() role = %q, want %q", claims.Role, models.RoleDriver)
	}
}
