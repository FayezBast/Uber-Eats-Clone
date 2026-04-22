package models

import "testing"

func TestValidUserRole(t *testing.T) {
	validRoles := []string{RoleCustomer, RoleDriver, RoleOwner, RoleAdmin}

	for _, role := range validRoles {
		if !ValidUserRole(role) {
			t.Fatalf("ValidUserRole(%q) = false, want true", role)
		}
	}

	if ValidUserRole("ops") {
		t.Fatal(`ValidUserRole("ops") = true, want false`)
	}
}
