# Tutorial: Building a Paid AI API with x402 on Stacks

## What You'll Build

A complete paid AI API that:
- Accepts automatic payments in STX or sBTC
- Provides three AI services (sentiment, summarization, key extraction)
- Handles payments at the HTTP level
- Works with any HTTP client

**Time to complete**: 30-45 minutes

## Prerequisites

- Basic knowledge of TypeScript/Node.js
- Understanding of REST APIs
- A Stacks wallet with testnet STX ([get from faucet](https://explorer.hiro.so/sandbox/faucet))

## Why x402?

Traditional API monetization requires:
- API key management
- Subscription billing systems
- Payment provider integrations
- Account management

**x402 eliminates all of this**. Clients pay automatically when accessing endpoints - like HTTP Basic Auth, but for payments.

## Part 1: Understanding x402

### The HTTP 402 Status Code

HTTP defines a `402 Payment Required` status code that was reserved for future use. x402 brings it to life.

### How It Works

```
Client                Server              Facilitator         Blockchain
  |                     |                      |                   |
  |--GET /api/paid----->|                      |                   |
  |<--402 + details-----|                      |                   |
  |                     |                      |                   |
  | (sign transaction)  |                      |                   |
  |                     |                      |                   |
  |--GET + signature--->|                      |                   |
  |                     |--settle tx---------->|                   |
  |                     |                      |--broadcast------->|
  |                     |                      |<--confirmed-------|
  |                     |<--confirmed----------|                   |
  |<--200 + content-----|                      |                   |
```

### Key Benefits

1. **No intermediaries** - Direct payments between client and server
2. **Pay-per-use** - Only pay for what you consume
3. **Automatic** - Client library handles payment flow
4. **Bitcoin-secured** - Leverages Stacks' Bitcoin anchoring

## Part 2: Project Setup

### Initialize Project

```bash
mkdir x402-ai-api
cd x402-ai-api
npm init -y
```

### Install Dependencies

```bash
# Core dependencies
npm install express x402-stacks cors dotenv

# TypeScript
npm install --save-dev typescript @types/node @types/express ts-node
```

### Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### Add Scripts to package.json

```json
"scripts": {
  "dev": "ts-node src/server.ts",
  "client": "ts-node src/client.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

## Part 3: Building the Server

Create `src/server.ts`:

### Step 1: Basic Setup

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware, STXtoMicroSTX } from 'x402-stacks';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
```

### Step 2: Configure Payment

```typescript
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS!;
const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402-relay.aibtc.com';
```

### Step 3: Add a Free Endpoint

```typescript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'x402 AI API is running',
    network: NETWORK
  });
});
```

### Step 4: Add a Paid Endpoint

```typescript
app.post(
  '/api/sentiment',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.001), // 0.001 STX
    address: PAYMENT_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req, res) => {
    const { text } = req.body;

    // Your AI logic here
    const result = analyzeSentiment(text);

    res.json({
      text,
      result,
      cost: '0.001 STX'
    });
  }
);
```

### Step 5: Start the Server

```typescript
app.listen(PORT, () => {
  console.log(`🚀 x402 AI API running on port ${PORT}`);
  console.log(`💰 Payment address: ${PAYMENT_ADDRESS}`);
});
```

## Part 4: Building the Client

Create `src/client.ts`:

### Step 1: Setup

```typescript
import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';
import dotenv from 'dotenv';

dotenv.config();
```

### Step 2: Create Account

```typescript
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const NETWORK = 'testnet';

const account = privateKeyToAccount(PRIVATE_KEY, NETWORK);
console.log(`Account: ${account.address}`);
```

### Step 3: Wrap Axios with Payment

```typescript
const api = wrapAxiosWithPayment(
  axios.create({ baseURL: 'http://localhost:3000' }),
  account
);
```

### Step 4: Make Paid Request

```typescript
// Automatically handles payment!
const response = await api.post('/api/sentiment', {
  text: 'Bitcoin is amazing!'
});

console.log(response.data);
```

## Part 5: Environment Configuration

Create `.env`:

```bash
# Server
PORT=3000
NETWORK=testnet
PAYMENT_ADDRESS=SP3QVGQG4SFHP0C983N1Y49V27CA70D2Y46E5Q4ZT
FACILITATOR_URL=https://x402-relay.aibtc.com

# Client
PRIVATE_KEY=your_private_key_here
API_BASE_URL=http://localhost:3000
```

**⚠️ Security**: Never commit `.env` or expose private keys!

## Part 6: Testing

### Run the Server

Terminal 1:
```bash
npm run dev
```

### Run the Client

Terminal 2:
```bash
npm run client
```

You should see:
1. Free health check succeeds
2. Paid endpoints automatically deduct STX
3. Response includes API data

## Part 7: Pricing Strategies

### Fixed Pricing (Shown Above)

```typescript
paymentMiddleware({
  amount: STXtoMicroSTX(0.001), // Always 0.001 STX
  // ...
})
```

### Tiered Pricing

```typescript
const tier = req.body.tier || 'standard';
const prices = {
  basic: STXtoMicroSTX(0.001),
  standard: STXtoMicroSTX(0.002),
  premium: STXtoMicroSTX(0.005)
};

paymentMiddleware({
  amount: prices[tier],
  // ...
})
```

### Dynamic Pricing

```typescript
paymentMiddleware({
  amount: (req) => {
    const textLength = req.body.text?.length || 0;
    const basePrice = 0.001;
    const perCharPrice = 0.00001;
    return STXtoMicroSTX(basePrice + (textLength * perCharPrice));
  },
  // ...
})
```

## Part 8: Production Deployment

### Build

```bash
npm run build
```

### Deploy to Railway/Render

1. Create account on Railway or Render
2. Connect GitHub repository
3. Set environment variables:
   - `PAYMENT_ADDRESS`
   - `NETWORK`
   - `FACILITATOR_URL`
4. Deploy

### Health Check

```bash
curl https://your-api.railway.app/api/health
```

## Part 9: Advanced Patterns

### Error Handling

```typescript
app.post('/api/sentiment',
  paymentMiddleware({ /* ... */ }),
  async (req, res) => {
    try {
      const result = await analyzeSentiment(req.body.text);
      res.json({ result });
    } catch (error) {
      // Payment already succeeded - must return valid response
      res.status(500).json({
        error: 'Processing failed',
        message: 'Payment received, please retry with same txid for refund'
      });
    }
  }
);
```

### Rate Limiting

```typescript
const userLimits = new Map<string, number>();

app.post('/api/sentiment',
  (req, res, next) => {
    const user = req.headers['x-user-id'];
    const count = userLimits.get(user) || 0;

    if (count >= 10) {
      // Exceeded free tier - require payment
      next();
    } else {
      // Free tier
      userLimits.set(user, count + 1);
      res.json({ /* free response */ });
    }
  },
  paymentMiddleware({ /* ... */ }),
  // ... paid handler
);
```

### Webhooks

```typescript
app.post('/api/sentiment',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.001),
    onPayment: async (txid, amount, sender) => {
      // Log payment
      await db.payments.create({
        txid,
        amount,
        sender,
        timestamp: Date.now()
      });
    }
  }),
  // ...
);
```

## Common Issues

### "Payment failed" error

**Cause**: Insufficient STX balance
**Fix**: Add testnet STX from faucet

### "Facilitator timeout"

**Cause**: Network congestion or facilitator down
**Fix**: Retry request or use different facilitator

### "Invalid signature"

**Cause**: Wrong private key or network mismatch
**Fix**: Verify NETWORK matches between client and server

## Next Steps

1. **Add Real AI**: Integrate OpenAI, Anthropic, or local models
2. **Database**: Track usage and revenue
3. **Analytics**: Monitor endpoint performance
4. **Authentication**: Add optional API keys for power users
5. **sBTC Support**: Accept Bitcoin-backed stablecoin

## Why This Matters

Traditional API monetization is complex:
- Payment processors take 2-3% fees
- Subscription management overhead
- International payment issues
- Account management complexity

**x402 solves all of this**:
- Direct payments (no middleman)
- Pay-per-use (no subscriptions)
- Global by default (Bitcoin network)
- Zero account management

This is particularly powerful for **AI agent economies** where agents pay other agents for services - no human-managed accounts needed.

## Resources

- [x402 Specification](https://github.com/coinbase/x402)
- [x402-stacks Library](https://github.com/tony1908/x402Stacks)
- [Stacks Documentation](https://docs.stacks.co)
- [AIBTC Facilitator](https://aibtc.com)

## Conclusion

You've built a complete paid AI API using x402! This pattern enables:
- Monetizing APIs without intermediaries
- Building agent-to-agent payment systems
- Creating pay-per-use AI services
- Leveraging Bitcoin security for payments

The future of API monetization is here - secured by Bitcoin, powered by Stacks.
