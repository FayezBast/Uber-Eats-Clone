import { backendAdminAdapter } from "@/services/backend-admin-adapter";
import type { PromoCampaign, PromotionFormValues } from "@/types";

export const promotionsService = {
  async listPromotions(): Promise<PromoCampaign[]> {
    return backendAdminAdapter.listPromotions();
  },

  async savePromotion(values: PromotionFormValues, promotionId?: string) {
    return backendAdminAdapter.savePromotion(values, promotionId);
  }
};
