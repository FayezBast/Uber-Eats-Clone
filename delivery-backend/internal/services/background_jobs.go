package services

import (
	"context"
	"time"
)

type BackgroundJobs struct {
	tracking *TrackingService
	interval time.Duration
}

func NewBackgroundJobs(tracking *TrackingService, interval time.Duration) *BackgroundJobs {
	if interval <= 0 {
		interval = 8 * time.Second
	}

	return &BackgroundJobs{
		tracking: tracking,
		interval: interval,
	}
}

func (j *BackgroundJobs) Start(ctx context.Context) {
	ticker := time.NewTicker(j.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			_ = j.tracking.UpdateActiveDeliveries()
		case <-ctx.Done():
			return
		}
	}
}
