import Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';
import { InsforgeStorageService } from './insforge-storage-service';

const storage = new InsforgeStorageService();

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET not set; webhook events will not be processed.');
      throw new Error('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      const stripe = await getUncachableStripeClient();
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      throw new Error('Webhook signature verification failed');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = (session.metadata?.tier as string) || 'pro';
        if (userId) {
          try {
            await storage.updateUser(userId, {
              subscription_tier: tier as any,
              stripe_subscription_id: session.subscription as string || null,
            });
            console.log(`[STRIPE WEBHOOK] Updated user ${userId} to tier ${tier}`);
          } catch (e: any) {
            console.error('[STRIPE WEBHOOK] Failed to update user:', e.message);
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const tier = subscription.status === 'active' ? 'pro' : 'starter';
        try {
          const stripe = await getUncachableStripeClient();
          const customer = await stripe.customers.retrieve(customerId);
          if (!customer.deleted && customer.metadata?.userId) {
            await storage.updateUser(customer.metadata.userId, {
              subscription_tier: tier as any,
              stripe_subscription_id: subscription.status === 'active' ? subscription.id : null,
            });
            console.log(`[STRIPE WEBHOOK] Updated subscription for user ${customer.metadata.userId}`);
          }
        } catch (e: any) {
          console.error('[STRIPE WEBHOOK] Subscription update failed:', e.message);
        }
        break;
      }
      default:
        console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
    }
  }
}
