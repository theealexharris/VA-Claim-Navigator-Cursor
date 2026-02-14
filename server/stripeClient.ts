import Stripe from 'stripe';

async function getCredentials() {
  // Use environment variables directly
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must be set in environment variables');
  }

  return {
    publishableKey,
    secretKey,
  };
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

// Stripe sync functionality removed - use Insforge database SDK instead
// If you need Stripe product/price sync, implement it using Insforge database SDK
export async function getStripeSync() {
  throw new Error('Stripe sync has been removed. Use Insforge database SDK for data operations.');
}
