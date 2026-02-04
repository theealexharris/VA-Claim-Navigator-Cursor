import { getUncachableStripeClient } from './stripeClient';

interface PricingTier {
  name: string;
  description: string;
  price: number;
  features: string[];
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Pro',
    description: 'VA Claim Navigator Pro - Full AI-powered claim building and memorandum generation',
    price: 9700,
    features: [
      'Everything in Starter',
      'Full Claim Building Access',
      'AI Memorandum Generation',
      'Priority Support'
    ]
  },
  {
    name: 'Premium',
    description: 'VA Claim Navigator Premium - Complete claim support with expedited processing tips',
    price: 49900,
    features: [
      'Everything in Pro',
      'Appeals Tracking',
      'TDIU Eligibility Assessment',
      'Expedited Processing Tips',
      'Document Management'
    ]
  },
  {
    name: 'Deluxe',
    description: 'VA Claim Navigator Deluxe - Ultimate veteran support package with 1-on-1 coaching',
    price: 99900,
    features: [
      'Everything in Pro and Premium',
      'Warrior AI Coach Access',
      'Buddy Statement Coordination',
      '1-on-1 Support Sessions',
      'Priority Evidence Review'
    ]
  }
];

async function setupStripeProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Connected to Stripe. Setting up products...\n');

    for (const tier of pricingTiers) {
      console.log(`Creating product: ${tier.name}...`);
      
      const product = await stripe.products.create({
        name: `VA Claim Navigator - ${tier.name}`,
        description: tier.description,
        metadata: {
          tier: tier.name.toLowerCase(),
          features: tier.features.join('|')
        }
      });
      
      console.log(`  Product created: ${product.id}`);

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price,
        currency: 'usd',
        metadata: {
          tier: tier.name.toLowerCase()
        }
      });
      
      console.log(`  Price created: ${price.id} ($${tier.price / 100})\n`);
    }

    console.log('All products and prices created successfully!');
    console.log('\nRestart the application to sync with Stripe data.');
    
  } catch (error) {
    console.error('Error setting up Stripe products:', error);
    process.exit(1);
  }
}

setupStripeProducts();
