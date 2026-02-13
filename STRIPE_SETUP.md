# Connect the app to your Stripe account for payment

The payment prompt does not send users to Stripe until the **Price IDs** are set in your `.env` file. Your Stripe **keys** (publishable and secret) are already set; you only need to add the **Price IDs** for each plan.

## Why users aren’t sent to Stripe

- The app uses **Price IDs** (e.g. `price_xxxx`) from *your* Stripe account to create checkout sessions.
- In `.env`, `STRIPE_PRICE_ID_DELUXE` (and optionally `STRIPE_PRICE_ID_PRO`) are empty.
- When they’re empty, the app does not create a checkout link, so users never get to the Stripe payment page.

## Fix: add your Stripe Price IDs to `.env`

### 1. Open Stripe Dashboard

- Go to: **https://dashboard.stripe.com/products**
- Use **Live** mode if your keys start with `pk_live_` / `sk_live_` (or **Test** mode for test keys).

### 2. Create or open a product for Deluxe ($499)

- If you don’t have one: click **+ Add product**.
- Name it (e.g. “Deluxe”) and set the price to **$499** (one-time or recurring, as you want).
- Save the product.

### 3. Copy the Price ID

- Open the product.
- In **Pricing**, find the price (e.g. $499).
- Click it and copy the **API ID** (it looks like `price_1ABC...`).

### 4. Put the Price ID in `.env`

In your project root, edit `.env` and set:

```env
STRIPE_PRICE_ID_DELUXE=price_1ABC...your_id_here
```

(Optional) For Pro:

```env
STRIPE_PRICE_ID_PRO=price_1XYZ...your_pro_price_id
```

Save the file. Do **not** add quotes or spaces around the value.

### 5. Restart the server

- Stop the dev server (Ctrl+C).
- Run `npm run dev` again so it reloads `.env`.

After this, when a user completes their profile and clicks **Save Personal Information** (with Deluxe selected), the app will create a Stripe checkout session and send them to your linked Stripe payment page.
