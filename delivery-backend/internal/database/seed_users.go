package database

import (
	"errors"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/gorm"

	"delivery-backend/internal/models"
	"delivery-backend/internal/utils"
)

const seedAccountsFileName = ".seed-accounts.local"

type seedUserDefinition struct {
	Name        string
	Role        string
	EmailEnvKey string
	PassEnvKey  string
}

var defaultSeedUsers = []seedUserDefinition{
	{
		Name:        "Local Admin",
		Role:        models.RoleAdmin,
		EmailEnvKey: "ADMIN_EMAIL",
		PassEnvKey:  "ADMIN_PASSWORD",
	},
	{
		Name:        "Local Customer",
		Role:        models.RoleCustomer,
		EmailEnvKey: "USER_EMAIL",
		PassEnvKey:  "USER_PASSWORD",
	},
	{
		Name:        "Local Restaurant Owner",
		Role:        models.RoleOwner,
		EmailEnvKey: "RESTAURANT_EMAIL",
		PassEnvKey:  "RESTAURANT_PASSWORD",
	},
	{
		Name:        "Local Driver",
		Role:        models.RoleDriver,
		EmailEnvKey: "DRIVER_EMAIL",
		PassEnvKey:  "DRIVER_PASSWORD",
	},
}

func SeedLocalUsers(db *gorm.DB) error {
	envValues, filePath, err := loadSeedAccountEnv()
	if err != nil {
		return err
	}

	if len(envValues) == 0 {
		log.Printf("seed users: skipped because %s was not found", seedAccountsFileName)
		return nil
	}

	for _, definition := range defaultSeedUsers {
		email := envValues[definition.EmailEnvKey]
		password := envValues[definition.PassEnvKey]
		if email == "" || password == "" {
			return fmt.Errorf(
				"seed users: %s must define both %s and %s",
				filePath,
				definition.EmailEnvKey,
				definition.PassEnvKey,
			)
		}

		var existingUser models.User
		err := db.Where("email = ?", email).First(&existingUser).Error
		if err == nil {
			continue
		}
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("seed users: lookup %s: %w", email, err)
		}

		passwordHash, err := utils.HashPassword(password)
		if err != nil {
			return fmt.Errorf("seed users: hash password for %s: %w", email, err)
		}

		user := models.User{
			Name:     definition.Name,
			Email:    email,
			Password: passwordHash,
			Role:     definition.Role,
		}

		if err := db.Create(&user).Error; err != nil {
			return fmt.Errorf("seed users: create %s: %w", email, err)
		}
	}

	log.Printf("seed users: loaded local accounts from %s", filePath)
	return nil
}

func loadSeedAccountEnv() (map[string]string, string, error) {
	for _, candidate := range []string{
		seedAccountsFileName,
		filePathFromRepoRoot("delivery-backend", seedAccountsFileName),
	} {
		if _, err := os.Stat(candidate); err == nil {
			values, readErr := godotenv.Read(candidate)
			if readErr != nil {
				return nil, "", fmt.Errorf("seed users: read %s: %w", candidate, readErr)
			}

			return values, candidate, nil
		} else if err != nil && !errors.Is(err, os.ErrNotExist) {
			return nil, "", fmt.Errorf("seed users: stat %s: %w", candidate, err)
		}
	}

	return nil, "", nil
}

func filePathFromRepoRoot(parts ...string) string {
	path := ""
	for index, part := range parts {
		if index == 0 {
			path = part
			continue
		}

		path = path + string(os.PathSeparator) + part
	}

	return path
}
