package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"delivery-backend/internal/services"
)

type CatalogHandler struct {
	service *services.CatalogService
}

func NewCatalogHandler(service *services.CatalogService) *CatalogHandler {
	return &CatalogHandler{service: service}
}

func (h *CatalogHandler) ListRestaurants(c *gin.Context) {
	restaurants := h.service.ListRestaurants(c.Query("search"), c.Query("category"))

	c.JSON(http.StatusOK, gin.H{
		"count":       len(restaurants),
		"restaurants": restaurants,
	})
}

func (h *CatalogHandler) GetRestaurant(c *gin.Context) {
	restaurant, ok := h.service.GetRestaurant(c.Param("slug"))
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "restaurant not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"restaurant": restaurant})
}
