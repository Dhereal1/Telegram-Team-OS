import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripe() {
  if (stripe) return stripe;
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  stripe = new Stripe(key);
  return stripe;
}
