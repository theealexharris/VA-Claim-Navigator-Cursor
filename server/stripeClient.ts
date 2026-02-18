import Stripe from 'stripe';

function isPlaceholderKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes('your-') ||
    k.includes('placeholder') ||
    k === 'xxx' ||
    /^pk_(test_)?xxx$/i.test(k) ||
    /^sk_(test_|live_)?xxx$/i.test(k)
  );
}

async function getCredentials() {
  const rawPk = process.env.STRIPE_PUBLISHABLE_KEY?.trim() ?? '';
  const rawSk = process.env.STRIPE_SECRET_KEY?.trim() ?? '';

  if (!rawPk || !rawSk) {
    throw new Error('STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must be set in .env (get keys from https://dashboard.stripe.com/apikeys)');
  }
  if (!rawPk.startsWith('pk_') || (!rawSk.startsWith('sk_live_') && !rawSk.startsWith('sk_test_'))) {
    throw new Error('Invalid Stripe API keys: publishable key must start with pk_, secret key with sk_live_ or sk_test_. Update .env with keys from https://dashboard.stripe.com/apikeys');
  }
  if (isPlaceholderKey(rawPk) || isPlaceholderKey(rawSk)) {
    throw new Error('Stripe keys in .env look like placeholders. Replace with your real keys from https://dashboard.stripe.com/apikeys');
  }

  return {
    publishableKey: rawPk,
    secretKey: rawSk,
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
