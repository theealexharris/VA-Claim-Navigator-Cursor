import { storage } from './storage';
import { getUncachableStripeClient } from './stripeClient';

export class StripeService {
  // Verify a promotion code exists and is active
  async verifyPromotionCode(promotionCodeId: string): Promise<{ valid: boolean; code?: string; percentOff?: number; amountOff?: number; error?: string }> {
    const stripe = await getUncachableStripeClient();
    try {
      const promotionCode = await stripe.promotionCodes.retrieve(promotionCodeId, { expand: ['coupon'] }) as any;
      
      if (!promotionCode.active) {
        return { valid: false, error: 'Promotion code is not active' };
      }
      
      const coupon = promotionCode.coupon;
      return {
        valid: true,
        code: promotionCode.code,
        percentOff: coupon?.percent_off ?? undefined,
        amountOff: coupon?.amount_off ?? undefined,
      };
    } catch (error: any) {
      console.error('Error verifying promotion code:', error.message);
      return { valid: false, error: error.message };
    }
  }

  // List all active promotion codes
  async listPromotionCodes(): Promise<any[]> {
    const stripe = await getUncachableStripeClient();
    try {
      const promotionCodes = await stripe.promotionCodes.list({ active: true, limit: 100, expand: ['data.coupon'] }) as any;
      return promotionCodes.data.map((pc: any) => {
        const coupon = pc.coupon;
        return {
          id: pc.id,
          code: pc.code,
          active: pc.active,
          couponId: coupon?.id,
          percentOff: coupon?.percent_off,
          amountOff: coupon?.amount_off,
          restrictions: pc.restrictions,
        };
      });
    } catch (error: any) {
      console.error('Error listing promotion codes:', error.message);
      return [];
    }
  }
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  async customerExists(customerId: string): Promise<boolean> {
    const stripe = await getUncachableStripeClient();
    try {
      await stripe.customers.retrieve(customerId);
      return true;
    } catch (error: any) {
      if (error?.code === 'resource_missing' || error?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string, promotionCode?: string) {
    const stripe = await getUncachableStripeClient();
    
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
    
    // If a specific promotion code is provided, apply it directly
    // Otherwise, allow users to enter any valid promotion code
    if (promotionCode) {
      sessionConfig.discounts = [{ promotion_code: promotionCode }];
    } else {
      sessionConfig.allow_promotion_codes = true;
    }
    
    return await stripe.checkout.sessions.create(sessionConfig);
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}

export const stripeService = new StripeService();
