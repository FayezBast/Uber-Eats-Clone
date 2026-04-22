package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                            string
	DatabaseURL                     string
	FrontendURL                     string
	JWTSecret                       string
	JWTExpirationHours              int
	EmailVerificationCodeTTLMinutes int
	ExposeEmailVerificationCode     bool
	GoogleClientID                  string
	GoogleClientSecret              string
	GoogleRedirectURL               string
	AppleClientID                   string
	AppleTeamID                     string
	AppleKeyID                      string
	ApplePrivateKey                 string
	AppleRedirectURL                string
	RedisAddr                       string
	RedisPassword                   string
	RedisDB                         int
	CacheTTLSeconds                 int
	TrackingTickSeconds             int
	RateLimitRequests               int
	RateLimitWindowSeconds          int
}

func Load() Config {
	loadEnvFiles()

	return Config{
		Port:                            getEnv("PORT", "8080"),
		DatabaseURL:                     getDatabaseURL(),
		FrontendURL:                     getEnv("FRONTEND_URL", "http://localhost:3000"),
		JWTSecret:                       getEnv("JWT_SECRET", "change-this-in-production"),
		JWTExpirationHours:              getEnvAsInt("JWT_EXPIRATION_HOURS", 24),
		EmailVerificationCodeTTLMinutes: getEnvAsInt("EMAIL_VERIFICATION_CODE_TTL_MINUTES", 10),
		ExposeEmailVerificationCode:     getEnvAsBool("EXPOSE_EMAIL_VERIFICATION_CODE", true),
		GoogleClientID:                  os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret:              os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:               os.Getenv("GOOGLE_REDIRECT_URL"),
		AppleClientID:                   os.Getenv("APPLE_CLIENT_ID"),
		AppleTeamID:                     os.Getenv("APPLE_TEAM_ID"),
		AppleKeyID:                      os.Getenv("APPLE_KEY_ID"),
		ApplePrivateKey:                 os.Getenv("APPLE_PRIVATE_KEY"),
		AppleRedirectURL:                os.Getenv("APPLE_REDIRECT_URL"),
		RedisAddr:                       getEnv("REDIS_ADDR", ""),
		RedisPassword:                   os.Getenv("REDIS_PASSWORD"),
		RedisDB:                         getEnvAsInt("REDIS_DB", 0),
		CacheTTLSeconds:                 getEnvAsInt("CACHE_TTL_SECONDS", 20),
		TrackingTickSeconds:             getEnvAsInt("TRACKING_TICK_SECONDS", 8),
		RateLimitRequests:               getEnvAsInt("RATE_LIMIT_REQUESTS", 120),
		RateLimitWindowSeconds:          getEnvAsInt("RATE_LIMIT_WINDOW_SECONDS", 60),
	}
}

func loadEnvFiles() {
	for _, candidate := range []string{".env", "delivery-backend/.env"} {
		if _, err := os.Stat(candidate); err == nil {
			_ = godotenv.Load(candidate)
			continue
		} else if err != nil && !errors.Is(err, os.ErrNotExist) {
			continue
		}
	}
}

func getDatabaseURL() string {
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		return databaseURL
	}

	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := os.Getenv("DB_PASSWORD")
	dbName := getEnv("DB_NAME", "delivery_backend")
	sslMode := getEnv("DB_SSLMODE", "disable")
	timeZone := getEnv("DB_TIMEZONE", "UTC")

	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		host,
		user,
		password,
		dbName,
		port,
		sslMode,
		timeZone,
	)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func getEnvAsInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getEnvAsBool(key string, fallback bool) bool {
	value := strings.TrimSpace(strings.ToLower(os.Getenv(key)))
	if value == "" {
		return fallback
	}

	switch value {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return fallback
	}
}
