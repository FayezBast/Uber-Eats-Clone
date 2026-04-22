package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"delivery-backend/internal/models"
	"delivery-backend/internal/utils"
)

const userContextKey = "authUser"

type AuthMiddleware struct {
	db         *gorm.DB
	jwtManager *utils.JWTManager
}

func NewAuthMiddleware(db *gorm.DB, jwtManager *utils.JWTManager) *AuthMiddleware {
	return &AuthMiddleware{
		db:         db,
		jwtManager: jwtManager,
	}
}

func (m *AuthMiddleware) RequireAuth(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header is required"})
		return
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header must use Bearer token"})
		return
	}

	claims, err := m.jwtManager.ValidateToken(parts[1])
	if err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
		return
	}

	var user models.User
	if err := m.db.First(&user, claims.UserID).Error; err != nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user associated with token was not found"})
		return
	}

	c.Set(userContextKey, user)
	c.Next()
}

func (m *AuthMiddleware) RequireRoles(roles ...string) gin.HandlerFunc {
	allowedRoles := make(map[string]struct{}, len(roles))
	for _, role := range roles {
		allowedRoles[role] = struct{}{}
	}

	return func(c *gin.Context) {
		user, ok := CurrentUser(c)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
			return
		}

		if _, ok := allowedRoles[user.Role]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "you do not have permission to access this resource"})
			return
		}

		c.Next()
	}
}

func CurrentUser(c *gin.Context) (models.User, bool) {
	value, ok := c.Get(userContextKey)
	if !ok {
		return models.User{}, false
	}

	user, ok := value.(models.User)
	return user, ok
}
