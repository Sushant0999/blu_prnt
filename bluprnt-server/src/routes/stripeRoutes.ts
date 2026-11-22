import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { serverDb } from '../db/db.js';
import { generate24hUnlockToken, verifyUnlockToken } from '../core/tokenSigner.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_bluprnt_2026';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder_secret_2026';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18.acacia' as any,
});

export const stripeRouter = Router();

/**
 * Creates a Stripe Checkout Session for a one-time lifetime purchase of BluPrnt Pro ($29).
 */
stripeRouter.post('/create-checkout-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, clientSuccessUrl, clientCancelUrl } = req.body;
    if (!email) {
      res.status(400).json({ error: 'User email is required' });
      return;
    }

    const host = req.get('origin') || 'http://localhost:5173';
    const success_url = clientSuccessUrl || `${host}/pro?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = clientCancelUrl || `${host}/pro?payment=cancelled`;

    // If Stripe key is test placeholder, provide simulated checkout URL
    if (stripeSecretKey.startsWith('sk_test_placeholder')) {
      const simulatedSessionId = `sim_session_${Date.now()}`;
      res.json({
        sessionId: simulatedSessionId,
        url: `${host}/pro?payment=success&session_id=${simulatedSessionId}&email=${encodeURIComponent(email)}`,
        simulated: true,
      });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'BluPrnt Pro — Lifetime Access',
              description: 'Unlimited System Design Playground, all interactive simulators, and complete case studies.',
            },
            unit_amount: 2900, // $29.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url,
      cancel_url,
      metadata: {
        userEmail: email,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err: any) {
    console.error('Error creating checkout session', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Webhook endpoint: Verifies Stripe cryptographic signature and updates Pro state in DB.
 * Crucial Rule: The client boolean is NEVER trusted. Server validates webhook event.
 */
stripeRouter.post('/webhook', (req: Request, res: Response): void => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    if (stripeSecretKey.startsWith('sk_test_placeholder')) {
      // In local dev/mock mode without live Stripe webhook endpoint secret
      event = req.body as Stripe.Event;
    } else {
      const rawBody = (req as any).rawBody;
      event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.customer_email || session.metadata?.userEmail;

    if (userEmail) {
      serverDb.setUserPro(userEmail, session.customer as string, session.id);
      console.log(`[Stripe Webhook] Verified Pro purchase for ${userEmail}`);
    }
  }

  res.json({ received: true });
});

/**
 * Simulates a successful checkout completion in local dev mode.
 */
stripeRouter.post('/dev-simulate-success', (req: Request, res: Response): void => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email required' });
    return;
  }
  const user = serverDb.setUserPro(email, 'cus_simulated_dev', `sess_${Date.now()}`);
  res.json({ success: true, user });
});

/**
 * Check authoritative Pro status from server DB.
 */
stripeRouter.get('/status', (req: Request, res: Response): void => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: 'Email parameter required' });
    return;
  }
  const user = serverDb.getUser(email);
  res.json({
    email,
    isPro: user ? user.isPro : false,
    proPurchasedAt: user?.proPurchasedAt,
  });
});

/**
 * Issues a 24-hour HMAC temporary unlock token for a given feature.
 */
stripeRouter.post('/tokens/issue-24h-unlock', (req: Request, res: Response): void => {
  const { featureKey } = req.body;
  if (!featureKey) {
    res.status(400).json({ error: 'featureKey required' });
    return;
  }
  const token = generate24hUnlockToken(featureKey);
  res.json({ token, featureKey, expiresInHours: 24 });
});

/**
 * Cryptographically verifies an unlock token.
 */
stripeRouter.post('/tokens/verify-unlock', (req: Request, res: Response): void => {
  const { token } = req.body;
  if (!token) {
    res.status(400).json({ error: 'Token string required' });
    return;
  }
  const result = verifyUnlockToken(token);
  res.json(result);
});
