package models

import "testing"

func TestValidDeliveryStatus(t *testing.T) {
	validStatuses := []string{
		DeliveryStatusPending,
		DeliveryStatusAccepted,
		DeliveryStatusPickedUp,
		DeliveryStatusDelivered,
	}

	for _, status := range validStatuses {
		if !ValidDeliveryStatus(status) {
			t.Fatalf("ValidDeliveryStatus(%q) = false, want true", status)
		}
	}

	if ValidDeliveryStatus("cancelled") {
		t.Fatal(`ValidDeliveryStatus("cancelled") = true, want false`)
	}
}

func TestCanTransitionDeliveryStatus(t *testing.T) {
	testCases := []struct {
		name          string
		currentStatus string
		nextStatus    string
		want          bool
	}{
		{
			name:          "pending to accepted",
			currentStatus: DeliveryStatusPending,
			nextStatus:    DeliveryStatusAccepted,
			want:          true,
		},
		{
			name:          "accepted to picked up",
			currentStatus: DeliveryStatusAccepted,
			nextStatus:    DeliveryStatusPickedUp,
			want:          true,
		},
		{
			name:          "picked up to delivered",
			currentStatus: DeliveryStatusPickedUp,
			nextStatus:    DeliveryStatusDelivered,
			want:          true,
		},
		{
			name:          "same status is allowed",
			currentStatus: DeliveryStatusPending,
			nextStatus:    DeliveryStatusPending,
			want:          true,
		},
		{
			name:          "pending to delivered is rejected",
			currentStatus: DeliveryStatusPending,
			nextStatus:    DeliveryStatusDelivered,
			want:          false,
		},
		{
			name:          "delivered to pending is rejected",
			currentStatus: DeliveryStatusDelivered,
			nextStatus:    DeliveryStatusPending,
			want:          false,
		},
	}

	for _, testCase := range testCases {
		if got := CanTransitionDeliveryStatus(testCase.currentStatus, testCase.nextStatus); got != testCase.want {
			t.Fatalf("%s: CanTransitionDeliveryStatus(%q, %q) = %t, want %t", testCase.name, testCase.currentStatus, testCase.nextStatus, got, testCase.want)
		}
	}
}
