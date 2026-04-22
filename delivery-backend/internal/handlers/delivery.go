package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"delivery-backend/internal/middleware"
	"delivery-backend/internal/services"
)

type DeliveryHandler struct {
	service *services.DeliveryService
}

type createDeliveryRequest struct {
	PickupAddress  string `json:"pickup_address" binding:"required,min=5,max=255"`
	DropoffAddress string `json:"dropoff_address" binding:"required,min=5,max=255"`
}

type quoteDeliveryRequest struct {
	PickupAddress  string `json:"pickup_address" binding:"required,min=5,max=255"`
	DropoffAddress string `json:"dropoff_address" binding:"required,min=5,max=255"`
}

type updateDeliveryStatusRequest struct {
	Status string `json:"status" binding:"required"`
	Note   string `json:"note"`
}

func NewDeliveryHandler(service *services.DeliveryService) *DeliveryHandler {
	return &DeliveryHandler{service: service}
}

func (h *DeliveryHandler) Quote(c *gin.Context) {
	var req quoteDeliveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	quote, err := h.service.Quote(req.PickupAddress, req.DropoffAddress)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"quote": quote})
}

func (h *DeliveryHandler) Create(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}

	var req createDeliveryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	delivery, err := h.service.CreateDelivery(user, services.CreateDeliveryInput{
		PickupAddress:  req.PickupAddress,
		DropoffAddress: req.DropoffAddress,
	})
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "delivery created successfully",
		"delivery": delivery,
	})
}

func (h *DeliveryHandler) List(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}

	deliveries, err := h.service.ListDeliveries(user)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(deliveries),
		"deliveries": deliveries,
	})
}

func (h *DeliveryHandler) History(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}

	history, err := h.service.ListHistory(user)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(history),
		"deliveries": history,
	})
}

func (h *DeliveryHandler) Available(c *gin.Context) {
	deliveries, err := h.service.ListAvailableDeliveries()
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(deliveries),
		"deliveries": deliveries,
	})
}

func (h *DeliveryHandler) Assigned(c *gin.Context) {
	user, ok := middleware.CurrentUser(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found in context"})
		return
	}

	deliveries, err := h.service.ListAssignedDeliveries(user)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":      len(deliveries),
		"deliveries": deliveries,
	})
}

func (h *DeliveryHandler) Accept(c *gin.Context) {
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

	delivery, err := h.service.AcceptDelivery(user, deliveryID)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "delivery accepted successfully",
		"delivery": delivery,
	})
}

func (h *DeliveryHandler) UpdateStatus(c *gin.Context) {
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

	var req updateDeliveryStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	delivery, err := h.service.UpdateStatus(
		user,
		deliveryID,
		strings.ToLower(strings.TrimSpace(req.Status)),
		req.Note,
	)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "delivery status updated successfully",
		"delivery": delivery,
	})
}

func (h *DeliveryHandler) StatusHistory(c *gin.Context) {
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

	history, err := h.service.StatusHistory(user, deliveryID)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"count":   len(history),
		"history": history,
	})
}

func (h *DeliveryHandler) Tracking(c *gin.Context) {
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

	snapshot, err := h.service.TrackingSnapshot(user, deliveryID)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"tracking": snapshot})
}

func respondWithServiceError(c *gin.Context, err error) {
	var serviceError *services.Error
	if errors.As(err, &serviceError) {
		c.JSON(serviceError.Status, gin.H{"error": serviceError.Message})
		return
	}

	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func parseUintParam(c *gin.Context, name string) (uint, error) {
	value, err := strconv.ParseUint(c.Param(name), 10, 64)
	if err != nil {
		return 0, errors.New(name + " must be a valid integer")
	}

	return uint(value), nil
}
