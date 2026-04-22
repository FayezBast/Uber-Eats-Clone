package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type RateLimiter struct {
	limit          int
	window         time.Duration
	mu             sync.Mutex
	entries        map[string]*rateLimitEntry
	cleanupCounter int
}

type rateLimitEntry struct {
	count     int
	expiresAt time.Time
}

func NewRateLimiter(limit, windowSeconds int) *RateLimiter {
	if limit <= 0 {
		limit = 120
	}
	if windowSeconds <= 0 {
		windowSeconds = 60
	}

	return &RateLimiter{
		limit:   limit,
		window:  time.Duration(windowSeconds) * time.Second,
		entries: make(map[string]*rateLimitEntry),
	}
}

func (r *RateLimiter) Middleware(c *gin.Context) {
	clientKey := c.ClientIP()
	now := time.Now()

	r.mu.Lock()
	r.cleanupCounter++
	if r.cleanupCounter%100 == 0 {
		r.cleanupExpiredEntriesLocked(now)
	}

	entry, ok := r.entries[clientKey]
	if !ok || now.After(entry.expiresAt) {
		entry = &rateLimitEntry{
			count:     0,
			expiresAt: now.Add(r.window),
		}
		r.entries[clientKey] = entry
	}

	if entry.count >= r.limit {
		retryAfter := int(time.Until(entry.expiresAt).Seconds())
		if retryAfter < 1 {
			retryAfter = 1
		}
		r.mu.Unlock()

		c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
			"error": "rate limit exceeded",
		})
		return
	}

	entry.count++
	remaining := r.limit - entry.count
	resetAt := entry.expiresAt
	r.mu.Unlock()

	c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", r.limit))
	c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
	c.Header("X-RateLimit-Reset", resetAt.Format(time.RFC3339))
	c.Next()
}

func (r *RateLimiter) cleanupExpiredEntriesLocked(now time.Time) {
	for key, entry := range r.entries {
		if now.After(entry.expiresAt) {
			delete(r.entries, key)
		}
	}
}
