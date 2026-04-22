package services

import "testing"

func TestQuoteAddresses(t *testing.T) {
	quote := QuoteAddresses("Hamra, Beirut", "Achrafieh, Beirut")

	if quote.EstimatedDistanceKM <= 0 {
		t.Fatalf("EstimatedDistanceKM = %f, want positive value", quote.EstimatedDistanceKM)
	}

	if quote.PriceCents <= 0 {
		t.Fatalf("PriceCents = %d, want positive value", quote.PriceCents)
	}

	if quote.PriceDisplay == "" {
		t.Fatal("PriceDisplay is empty")
	}
}

func TestQuoteAddressesDeterministic(t *testing.T) {
	first := QuoteAddresses("Hamra, Beirut", "Achrafieh, Beirut")
	second := QuoteAddresses("Hamra, Beirut", "Achrafieh, Beirut")

	if first != second {
		t.Fatalf("QuoteAddresses() returned different results: %+v vs %+v", first, second)
	}
}
