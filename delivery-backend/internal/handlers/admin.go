package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"delivery-backend/internal/middleware"
	"delivery-backend/internal/services"
)

type AdminHandler struct {
	deliveryService *services.DeliveryService
}

type assignDeliveryRequest struct {
	DriverID uint   `json:"driver_id" binding:"required"`
	Note     string `json:"note"`
}

func NewAdminHandler(deliveryService *services.DeliveryService) *AdminHandler {
	return &AdminHandler{deliveryService: deliveryService}
}

func (h *AdminHandler) Dashboard(c *gin.Context) {
	dashboard, err := h.deliveryService.AdminDashboard()
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, dashboard)
}

func (h *AdminHandler) ListDeliveries(c *gin.Context) {
	deliveries, err := h.deliveryService.AdminListDeliveries()
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(deliveries),
		"deliveries": deliveries,
	})
}

func (h *AdminHandler) Logs(c *gin.Context) {
	logs, err := h.deliveryService.AdminActivityLog()
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count": len(logs),
		"logs":  logs,
	})
}

func (h *AdminHandler) ListDrivers(c *gin.Context) {
	drivers, err := h.deliveryService.AdminListDrivers()
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(drivers),
		"drivers": drivers,
	})
}

func (h *AdminHandler) AssignDelivery(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}

	deliveryID, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req assignDeliveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	delivery, err := h.deliveryService.AssignDeliveryToDriver(user, deliveryID, req.DriverID, req.Note)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "delivery assigned successfully",
		"delivery": delivery,
	})
}
