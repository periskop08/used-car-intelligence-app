const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface UrgentProductConfig {
  enabled: boolean;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  taxIncluded: boolean;
  taxRate: number;
  pricingVersion: string;
  termsVersion: string;
  quoteTtlMinutes: number;
  durationPolicy: string;
}

export interface UrgentQuoteResponse {
  quoteId: string;
  listingId: string;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  pricingVersion: string;
  taxIncluded: boolean;
  taxRate?: number;
  termsVersion: string;
  expiresAt: string;
}

export interface UrgentCheckoutResponse {
  purchaseId: string;
  listingId: string;
  lifecycleStatus: string;
  paymentStatus: string;
  priceAmount: number;
  amountMinor: number;
  currency: string;
  paymentProviderUrl?: string;
  checkoutExpiresAt: string;
}

export async function fetchUrgentProductConfig(): Promise<UrgentProductConfig | null> {
  try {
    const res = await fetch(`${API_URL}/listing-promotions/urgent/product`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function requestUrgentQuote(listingId: string): Promise<UrgentQuoteResponse> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };

  const res = await fetch(`${API_URL}/listing-promotions/urgent/quotes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ listingId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Quote alma başarısız.' }));
    throw new Error(err.message || 'Quote alma başarısız.');
  }

  return await res.json();
}

export async function createUrgentCheckout(
  listingId: string, 
  quoteId: string, 
  termsVersion: string,
  idempotencyKey: string
): Promise<UrgentCheckoutResponse> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
  };

  const res = await fetch(`${API_URL}/listing-promotions/urgent/checkout/${listingId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      quoteId,
      idempotencyKey,
      termsAccepted: true,
      termsVersion,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Checkout başlatılamadı.' }));
    throw new Error(err.message || 'Checkout başlatılamadı.');
  }

  return await res.json();
}

export async function fetchUrgentPromotionStatus(listingId: string): Promise<any> {
  try {
    const res = await fetch(`${API_URL}/listing-promotions/urgent/status/${listingId}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}
