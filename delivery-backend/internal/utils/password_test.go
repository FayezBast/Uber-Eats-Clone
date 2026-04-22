package utils

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hashedPassword, err := HashPassword("super-secret-password")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if hashedPassword == "super-secret-password" {
		t.Fatal("HashPassword() returned the plaintext password")
	}

	if err := CheckPassword("super-secret-password", hashedPassword); err != nil {
		t.Fatalf("CheckPassword() error = %v", err)
	}

	if err := CheckPassword("wrong-password", hashedPassword); err == nil {
		t.Fatal("CheckPassword() expected an error for the wrong password")
	}
}
