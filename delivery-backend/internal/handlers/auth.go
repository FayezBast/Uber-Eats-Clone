package handlers

import (
	"crypto/rand"
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"delivery-backend/internal/cache"
	"delivery-backend/internal/config"
	"delivery-backend/internal/middleware"
	"delivery-backend/internal/models"
	"delivery-backend/internal/utils"
	"delivery-backend/internal/validation"
)

const registrationVerificationCacheKeyPrefix = "auth:registration:verification:"

type AuthHandler struct {
	db         *gorm.DB
	jwtManager *utils.JWTManager
	cache      *cache.Store
	cfg        config.Config
}

type registerRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}

type requestRegistrationCodeRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=100"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Role     string `json:"role"`
}

type pendingRegistration struct {
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	Role         string    `json:"role"`
	Code         string    `json:"code"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func NewAuthHandler(db *gorm.DB, jwtManager *utils.JWTManager, cacheStore *cache.Store, cfg config.Config) *AuthHandler {
	return &AuthHandler{
		db:         db,
		jwtManager: jwtManager,
		cache:      cacheStore,
		cfg:        cfg,
	}
}

func (h *AuthHandler) RequestRegistrationCode(c *gin.Context) {
	var req requestRegistrationCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	pending, err := h.buildPendingRegistration(req)
	if err != nil {
		status, message := resolveRegistrationError(err)
		c.JSON(status, gin.H{"error": message})
		return
	}

	ttl := time.Duration(h.cfg.EmailVerificationCodeTTLMinutes) * time.Minute
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}

	code, err := generateVerificationCode()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate verification code"})
		return
	}

	pending.Code = code
	pending.ExpiresAt = time.Now().Add(ttl)

	if err := h.cache.SetJSON(registrationVerificationCacheKey(pending.Email), pending, ttl); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to store verification code"})
		return
	}

	log.Printf("signup verification code for %s: %s", pending.Email, code)

	response := gin.H{
		"message":    "verification code sent",
		"expires_at": pending.ExpiresAt,
	}
	if h.cfg.ExposeEmailVerificationCode {
		response["verification_code"] = code
	}

	c.JSON(http.StatusAccepted, response)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := validation.NormalizeEmail(req.Email)

	var existingUser models.User
	err := h.db.Where("email = ?", email).First(&existingUser).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify user"})
		return
	}

	var pending pendingRegistration
	if ok := h.cache.GetJSON(registrationVerificationCacheKey(email), &pending); !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "verification code expired or was not requested"})
		return
	}

	if pending.Email != email {
		h.cache.Delete(registrationVerificationCacheKey(email))
		c.JSON(http.StatusBadRequest, gin.H{"error": "verification request is invalid"})
		return
	}

	if pending.ExpiresAt.Before(time.Now()) {
		h.cache.Delete(registrationVerificationCacheKey(email))
		c.JSON(http.StatusBadRequest, gin.H{"error": "verification code expired or was not requested"})
		return
	}

	code := strings.TrimSpace(req.Code)
	if subtle.ConstantTimeCompare([]byte(code), []byte(pending.Code)) != 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid verification code"})
		return
	}

	user := models.User{
		Name:     pending.Name,
		Email:    pending.Email,
		Password: pending.PasswordHash,
		Role:     pending.Role,
	}

	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to register user"})
		return
	}

	token, expiresAt, err := h.jwtManager.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "user registered successfully",
		"token":      token,
		"expires_at": expiresAt,
		"user":       user.Response(),
	})

	h.cache.Delete(registrationVerificationCacheKey(email))
	safeInvalidateAdminDashboardCache(h.cache)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := validation.NormalizeEmail(req.Email)

	var user models.User
	if err := h.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
		return
	}

	if err := utils.CheckPassword(req.Password, user.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	token, expiresAt, err := h.jwtManager.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "login successful",
		"token":      token,
		"expires_at": expiresAt,
		"user":       user.Response(),
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user.Response()})
}

func safeInvalidateAdminDashboardCache(cacheStore *cache.Store) {
	if cacheStore == nil {
		return
	}

	cacheStore.Delete("admin:dashboard")
}

func (h *AuthHandler) buildPendingRegistration(req requestRegistrationCodeRequest) (pendingRegistration, error) {
	email := validation.NormalizeEmail(req.Email)
	role := validation.NormalizeRole(req.Role)
	name := validation.NormalizeName(req.Name)

	if err := validation.ValidateRole(role); err != nil {
		return pendingRegistration{}, err
	}

	var existingUser models.User
	err := h.db.Where("email = ?", email).First(&existingUser).Error
	if err == nil {
		return pendingRegistration{}, fmt.Errorf("email already registered")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return pendingRegistration{}, fmt.Errorf("failed to verify user")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return pendingRegistration{}, fmt.Errorf("failed to secure password")
	}

	return pendingRegistration{
		Name:         name,
		Email:        email,
		PasswordHash: hashedPassword,
		Role:         role,
	}, nil
}

func resolveRegistrationError(err error) (int, string) {
	if err == nil {
		return http.StatusInternalServerError, "registration failed"
	}

	switch err.Error() {
	case "email already registered":
		return http.StatusConflict, err.Error()
	case "failed to verify user", "failed to secure password":
		return http.StatusInternalServerError, err.Error()
	default:
		return http.StatusBadRequest, err.Error()
	}
}

func registrationVerificationCacheKey(email string) string {
	return registrationVerificationCacheKeyPrefix + email
}

func generateVerificationCode() (string, error) {
	value, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%06d", value.Int64()), nil
}
