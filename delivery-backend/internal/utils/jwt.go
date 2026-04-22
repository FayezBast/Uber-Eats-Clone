package utils

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"delivery-backend/internal/models"
)

type JWTManager struct {
	secret []byte
	ttl    time.Duration
}

type UserClaims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func NewJWTManager(secret string, expirationHours int) *JWTManager {
	if expirationHours <= 0 {
		expirationHours = 24
	}

	return &JWTManager{
		secret: []byte(secret),
		ttl:    time.Duration(expirationHours) * time.Hour,
	}
}

func (m *JWTManager) GenerateToken(user models.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(m.ttl)
	claims := UserClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", user.ID),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, err
	}

	return signedToken, expiresAt, nil
}

func (m *JWTManager) ValidateToken(token string) (*UserClaims, error) {
	parsedToken, err := jwt.ParseWithClaims(token, &UserClaims{}, func(parsedToken *jwt.Token) (interface{}, error) {
		if _, ok := parsedToken.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", parsedToken.Header["alg"])
		}

		return m.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsedToken.Claims.(*UserClaims)
	if !ok || !parsedToken.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
