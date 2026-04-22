package handlers

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"

	"delivery-backend/internal/models"
	"delivery-backend/internal/utils"
	"delivery-backend/internal/validation"
)

const (
	socialProviderGoogle = "google"
	socialProviderApple  = "apple"
)

type oauthStateClaims struct {
	Provider string `json:"provider"`
	Nonce    string `json:"nonce,omitempty"`
	jwt.RegisteredClaims
}

type oauthTokenResponse struct {
	IDToken string `json:"id_token"`
}

type socialIDTokenClaims struct {
	Email         string      `json:"email"`
	EmailVerified interface{} `json:"email_verified"`
	Name          string      `json:"name"`
	GivenName     string      `json:"given_name"`
	FamilyName    string      `json:"family_name"`
	Nonce         string      `json:"nonce"`
	Subject       string      `json:"sub"`
	jwt.RegisteredClaims
}

type jwksResponse struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type socialProfile struct {
	Email         string
	Name          string
	EmailVerified bool
}

type appleUserPayload struct {
	Email string `json:"email"`
	Name  struct {
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
	} `json:"name"`
}

func (h *AuthHandler) SocialStart(c *gin.Context) {
	provider := strings.ToLower(strings.TrimSpace(c.Param("provider")))

	switch provider {
	case socialProviderGoogle:
		if h.cfg.GoogleClientID == "" || h.cfg.GoogleClientSecret == "" || h.cfg.GoogleRedirectURL == "" {
			h.redirectSocialError(c, "Google sign in is not configured.")
			return
		}
	case socialProviderApple:
		if h.cfg.AppleClientID == "" || h.cfg.AppleRedirectURL == "" || h.cfg.AppleTeamID == "" || h.cfg.AppleKeyID == "" || h.cfg.ApplePrivateKey == "" {
			h.redirectSocialError(c, "Apple sign in is not configured.")
			return
		}
	default:
		h.redirectSocialError(c, "Unsupported social sign in provider.")
		return
	}

	nonce := ""
	if provider == socialProviderApple {
		value, err := randomHex(16)
		if err != nil {
			h.redirectSocialError(c, "Unable to start Apple sign in.")
			return
		}
		nonce = value
	}

	state, err := h.issueOAuthState(provider, nonce)
	if err != nil {
		h.redirectSocialError(c, "Unable to start social sign in.")
		return
	}

	var redirectURL string
	switch provider {
	case socialProviderGoogle:
		params := url.Values{}
		params.Set("client_id", h.cfg.GoogleClientID)
		params.Set("redirect_uri", h.cfg.GoogleRedirectURL)
		params.Set("response_type", "code")
		params.Set("scope", "openid email profile")
		params.Set("state", state)
		params.Set("prompt", "select_account")

		redirectURL = "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
	case socialProviderApple:
		params := url.Values{}
		params.Set("client_id", h.cfg.AppleClientID)
		params.Set("redirect_uri", h.cfg.AppleRedirectURL)
		params.Set("response_type", "code")
		params.Set("response_mode", "form_post")
		params.Set("scope", "name email")
		params.Set("state", state)
		params.Set("nonce", nonce)

		redirectURL = "https://appleid.apple.com/auth/authorize?" + params.Encode()
	}

	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (h *AuthHandler) SocialCallback(c *gin.Context) {
	provider := strings.ToLower(strings.TrimSpace(c.Param("provider")))
	code := callbackParam(c, "code")
	state := callbackParam(c, "state")
	errorCode := callbackParam(c, "error")
	appleUser := callbackParam(c, "user")

	if errorCode != "" {
		h.redirectSocialError(c, "Social sign in was canceled or failed.")
		return
	}

	if code == "" || state == "" {
		h.redirectSocialError(c, "Social sign in response was incomplete.")
		return
	}

	stateClaims, err := h.parseOAuthState(state)
	if err != nil || stateClaims.Provider != provider {
		h.redirectSocialError(c, "Invalid social sign in state.")
		return
	}

	var profile socialProfile
	switch provider {
	case socialProviderGoogle:
		profile, err = h.exchangeGoogleCode(code)
	case socialProviderApple:
		profile, err = h.exchangeAppleCode(code, stateClaims.Nonce, parseAppleUserProfile(appleUser))
	default:
		h.redirectSocialError(c, "Unsupported social sign in provider.")
		return
	}
	if err != nil {
		h.redirectSocialError(c, err.Error())
		return
	}

	if !profile.EmailVerified || profile.Email == "" {
		h.redirectSocialError(c, "Social account email could not be verified.")
		return
	}

	user, err := h.findOrCreateSocialUser(profile)
	if err != nil {
		h.redirectSocialError(c, "Unable to complete social sign in.")
		return
	}

	token, expiresAt, err := h.jwtManager.GenerateToken(user)
	if err != nil {
		h.redirectSocialError(c, "Unable to create a session for this account.")
		return
	}

	values := url.Values{}
	values.Set("token", token)
	values.Set("expires_at", expiresAt.Format(time.RFC3339))
	values.Set("user_id", strconv.FormatUint(uint64(user.ID), 10))
	values.Set("name", user.Name)
	values.Set("email", user.Email)
	values.Set("role", user.Role)

	redirectURL := strings.TrimRight(h.cfg.FrontendURL, "/") + "/auth/social/callback#" + values.Encode()
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func (h *AuthHandler) exchangeGoogleCode(code string) (socialProfile, error) {
	tokenResponse, err := exchangeOAuthCode(
		"https://oauth2.googleapis.com/token",
		url.Values{
			"client_id":     []string{h.cfg.GoogleClientID},
			"client_secret": []string{h.cfg.GoogleClientSecret},
			"code":          []string{code},
			"grant_type":    []string{"authorization_code"},
			"redirect_uri":  []string{h.cfg.GoogleRedirectURL},
		},
	)
	if err != nil {
		return socialProfile{}, fmt.Errorf("Google sign in failed.")
	}

	claims, err := verifyIDToken(
		tokenResponse.IDToken,
		"https://www.googleapis.com/oauth2/v3/certs",
		[]string{"https://accounts.google.com", "accounts.google.com"},
		h.cfg.GoogleClientID,
		"",
	)
	if err != nil {
		return socialProfile{}, fmt.Errorf("Google identity token could not be verified.")
	}

	return socialProfile{
		Email:         validation.NormalizeEmail(claims.Email),
		Name:          normalizeSocialName(claims),
		EmailVerified: claimBool(claims.EmailVerified),
	}, nil
}

func (h *AuthHandler) exchangeAppleCode(code string, expectedNonce string, fallbackProfile socialProfile) (socialProfile, error) {
	clientSecret, err := h.generateAppleClientSecret()
	if err != nil {
		return socialProfile{}, fmt.Errorf("Apple sign in is not configured correctly.")
	}

	tokenResponse, err := exchangeOAuthCode(
		"https://appleid.apple.com/auth/token",
		url.Values{
			"client_id":     []string{h.cfg.AppleClientID},
			"client_secret": []string{clientSecret},
			"code":          []string{code},
			"grant_type":    []string{"authorization_code"},
			"redirect_uri":  []string{h.cfg.AppleRedirectURL},
		},
	)
	if err != nil {
		return socialProfile{}, fmt.Errorf("Apple sign in failed.")
	}

	claims, err := verifyIDToken(
		tokenResponse.IDToken,
		"https://appleid.apple.com/auth/keys",
		[]string{"https://appleid.apple.com"},
		h.cfg.AppleClientID,
		expectedNonce,
	)
	if err != nil {
		return socialProfile{}, fmt.Errorf("Apple identity token could not be verified.")
	}

	profile := socialProfile{
		Email:         validation.NormalizeEmail(claims.Email),
		Name:          normalizeSocialName(claims),
		EmailVerified: claimBool(claims.EmailVerified),
	}

	if profile.Email == "" {
		profile.Email = validation.NormalizeEmail(fallbackProfile.Email)
	}
	if profile.Name == "" {
		profile.Name = validation.NormalizeName(fallbackProfile.Name)
	}

	return profile, nil
}

func (h *AuthHandler) findOrCreateSocialUser(profile socialProfile) (models.User, error) {
	var user models.User
	err := h.db.Where("email = ?", profile.Email).First(&user).Error
	if err == nil {
		return user, nil
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return models.User{}, err
	}

	randomPassword, err := randomHex(24)
	if err != nil {
		return models.User{}, err
	}

	hashedPassword, err := utils.HashPassword(randomPassword)
	if err != nil {
		return models.User{}, err
	}

	name := validation.NormalizeName(profile.Name)
	if name == "" {
		emailPrefix := strings.Split(profile.Email, "@")[0]
		name = validation.NormalizeName(strings.ReplaceAll(emailPrefix, ".", " "))
	}

	user = models.User{
		Name:     name,
		Email:    profile.Email,
		Password: hashedPassword,
		Role:     models.RoleCustomer,
	}

	if err := h.db.Create(&user).Error; err != nil {
		return models.User{}, err
	}

	safeInvalidateAdminDashboardCache(h.cache)
	return user, nil
}

func (h *AuthHandler) issueOAuthState(provider, nonce string) (string, error) {
	claims := oauthStateClaims{
		Provider: provider,
		Nonce:    nonce,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(10 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.cfg.JWTSecret))
}

func (h *AuthHandler) parseOAuthState(raw string) (*oauthStateClaims, error) {
	parsedToken, err := jwt.ParseWithClaims(raw, &oauthStateClaims{}, func(parsedToken *jwt.Token) (interface{}, error) {
		if _, ok := parsedToken.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", parsedToken.Header["alg"])
		}

		return []byte(h.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsedToken.Claims.(*oauthStateClaims)
	if !ok || !parsedToken.Valid {
		return nil, fmt.Errorf("invalid state token")
	}

	return claims, nil
}

func (h *AuthHandler) generateAppleClientSecret() (string, error) {
	privateKeyPEM := strings.ReplaceAll(h.cfg.ApplePrivateKey, `\n`, "\n")
	privateKey, err := jwt.ParseECPrivateKeyFromPEM([]byte(privateKeyPEM))
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    h.cfg.AppleTeamID,
		Subject:   h.cfg.AppleClientID,
		Audience:  []string{"https://appleid.apple.com"},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(10 * time.Minute)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = h.cfg.AppleKeyID

	return token.SignedString(privateKey)
}

func (h *AuthHandler) redirectSocialError(c *gin.Context, message string) {
	values := url.Values{}
	values.Set("error", message)
	redirectURL := strings.TrimRight(h.cfg.FrontendURL, "/") + "/auth/social/callback#" + values.Encode()
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}

func callbackParam(c *gin.Context, key string) string {
	value := strings.TrimSpace(c.Query(key))
	if value != "" {
		return value
	}

	return strings.TrimSpace(c.PostForm(key))
}

func parseAppleUserProfile(raw string) socialProfile {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return socialProfile{}
	}

	var payload appleUserPayload
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		return socialProfile{}
	}

	name := strings.TrimSpace(strings.Join([]string{payload.Name.FirstName, payload.Name.LastName}, " "))

	return socialProfile{
		Email: validation.NormalizeEmail(payload.Email),
		Name:  validation.NormalizeName(name),
	}
}

func exchangeOAuthCode(endpoint string, values url.Values) (oauthTokenResponse, error) {
	request, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(values.Encode()))
	if err != nil {
		return oauthTokenResponse{}, err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return oauthTokenResponse{}, err
	}
	defer response.Body.Close()

	var payload oauthTokenResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return oauthTokenResponse{}, err
	}

	if response.StatusCode >= http.StatusBadRequest || payload.IDToken == "" {
		return oauthTokenResponse{}, fmt.Errorf("token exchange failed")
	}

	return payload, nil
}

func verifyIDToken(rawToken, keysURL string, allowedIssuers []string, audience string, expectedNonce string) (*socialIDTokenClaims, error) {
	keys, err := fetchJWKs(keysURL)
	if err != nil {
		return nil, err
	}

	parser := jwt.NewParser(jwt.WithValidMethods([]string{"RS256"}))
	token, err := parser.ParseWithClaims(rawToken, &socialIDTokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		kid, _ := token.Header["kid"].(string)
		for _, key := range keys.Keys {
			if key.Kid == kid {
				return key.rsaPublicKey()
			}
		}
		return nil, fmt.Errorf("matching key not found")
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*socialIDTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	if !stringInSlice(claims.Issuer, allowedIssuers) {
		return nil, fmt.Errorf("unexpected issuer")
	}

	if !audienceMatches(claims.Audience, audience) {
		return nil, fmt.Errorf("unexpected audience")
	}

	if expectedNonce != "" && claims.Nonce != expectedNonce {
		return nil, fmt.Errorf("unexpected nonce")
	}

	return claims, nil
}

func fetchJWKs(endpoint string) (jwksResponse, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Get(endpoint)
	if err != nil {
		return jwksResponse{}, err
	}
	defer response.Body.Close()

	var payload jwksResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return jwksResponse{}, err
	}

	if len(payload.Keys) == 0 {
		return jwksResponse{}, fmt.Errorf("no keys returned")
	}

	return payload, nil
}

func (key jwk) rsaPublicKey() (*rsa.PublicKey, error) {
	if key.Kty != "RSA" || key.N == "" || key.E == "" {
		return nil, fmt.Errorf("unsupported key type")
	}

	modulusBytes, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, err
	}
	exponentBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, err
	}

	exponent := 0
	for _, value := range exponentBytes {
		exponent = exponent<<8 + int(value)
	}
	if exponent == 0 {
		return nil, fmt.Errorf("invalid exponent")
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(modulusBytes),
		E: exponent,
	}, nil
}

func randomHex(size int) (string, error) {
	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return hex.EncodeToString(buffer), nil
}

func normalizeSocialName(claims *socialIDTokenClaims) string {
	name := strings.TrimSpace(claims.Name)
	if name != "" {
		return validation.NormalizeName(name)
	}

	parts := strings.Fields(strings.TrimSpace(strings.Join([]string{claims.GivenName, claims.FamilyName}, " ")))
	return validation.NormalizeName(strings.Join(parts, " "))
}

func claimBool(value interface{}) bool {
	switch current := value.(type) {
	case bool:
		return current
	case string:
		return strings.EqualFold(current, "true")
	default:
		return false
	}
}

func stringInSlice(value string, allowed []string) bool {
	for _, item := range allowed {
		if item == value {
			return true
		}
	}

	return false
}

func audienceMatches(audience jwt.ClaimStrings, expected string) bool {
	for _, value := range audience {
		if value == expected {
			return true
		}
	}

	return false
}
