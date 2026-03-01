# x402 AI API Example

A complete example of building a paid AI API using the x402 payment protocol on Stacks.

## What is x402?

x402 enables **automatic HTTP-level payments** for APIs using STX or sBTC tokens. Clients pay automatically when accessing paid endpoints - no subscriptions, no API keys, no intermediaries.

## Features

This example demonstrates:
- ✅ Multiple paid AI endpoints (sentiment, summarization, key extraction)
- ✅ Automatic payment handling via x402-stacks library
- ✅ Flexible pricing (different costs per endpoint)
- ✅ Free tier endpoints (health check)
- ✅ Complete client example with automatic payments

## Prerequisites

- Node.js 18+ and npm
- A Stacks wallet with testnet STX (get from [faucet](https://explorer.hiro.so/sandbox/faucet))
- Private key for testing

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:
```
# Server
PORT=3000
NETWORK=testnet
PAYMENT_ADDRESS=your_stacks_address_here
FACILITATOR_URL=https://x402-relay.aibtc.com

# Client (for testing)
PRIVATE_KEY=your_private_key_here
API_BASE_URL=http://localhost:3000
```

### 3. Run the Server

```bash
npm run dev
```

Server will start on http://localhost:3000

### 4. Test with Client

In a new terminal:

```bash
npm run client
```

## API Endpoints

### Free Endpoints

- `GET /api/health` - Health check and endpoint listing

### Paid Endpoints

- `POST /api/sentiment` - Sentiment analysis (0.001 STX)
  ```json
  {
    "text": "Bitcoin is amazing!"
  }
  ```

- `POST /api/summarize` - Text summarization (0.002 STX)
  ```json
  {
    "text": "Long text here...",
    "maxSentences": 3
  }
  ```

- `POST /api/extract` - Key point extraction (0.001 STX)
  ```json
  {
    "text": "Document with important points..."
  }
  ```

## How It Works

### 1. Server-Side (Express.js)

The server uses `paymentMiddleware` to protect endpoints:

```typescript
app.post(
  '/api/sentiment',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.001),
    address: PAYMENT_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req, res) => {
    // Your API logic here
  }
);
```

### 2. Client-Side (Automatic Payment)

The client wraps axios with payment handling:

```typescript
const account = privateKeyToAccount(PRIVATE_KEY, NETWORK);
const api = wrapAxiosWithPayment(
  axios.create({ baseURL: API_BASE_URL }),
  account
);

// Automatically pays when accessing paid endpoints
const response = await api.post('/api/sentiment', { text: 'Hello' });
```

### 3. Payment Flow

1. Client requests paid endpoint
2. Server responds `402 Payment Required` with payment details
3. Client signs STX transaction (via x402-stacks)
4. Client retries request with signed transaction
5. Server sends transaction to facilitator for settlement
6. Facilitator broadcasts and confirms transaction
7. Server grants access to endpoint
8. Client receives API response

## Pricing Strategies

This example shows three pricing tiers:

- **Low cost** (0.001 STX) - Simple operations (sentiment, extraction)
- **Medium cost** (0.002 STX) - Complex operations (summarization)
- **Free** - Public endpoints (health check)

You can implement:
- Fixed pricing (shown above)
- Tiered pricing (pay more for faster service)
- Dynamic pricing (based on input size, complexity)
- Rate limits with pay-when-exceeded

## Production Considerations

### Security

- Never commit `.env` file or private keys
- Use environment variables for sensitive configuration
- Implement rate limiting to prevent abuse
- Add request validation and sanitization

### Scalability

- Use a load balancer for multiple server instances
- Consider caching for expensive operations
- Monitor facilitator reliability
- Implement retry logic for payment failures

### Monitoring

- Track payment success/failure rates
- Monitor endpoint usage and revenue
- Set up alerts for payment issues
- Log all transactions for auditing

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Cloud

Deploy to any Node.js hosting:
- Railway
- Render
- Digital Ocean
- AWS/GCP/Azure

Set environment variables in your hosting platform.

## Next Steps

1. **Add Real AI**: Replace simple logic with actual AI models (OpenAI, Anthropic, local models)
2. **Database**: Store usage analytics and payment history
3. **Authentication**: Add optional API keys for power users
4. **Webhooks**: Notify on successful payments
5. **Admin Dashboard**: Track revenue and usage

## Resources

- [x402-stacks npm package](https://www.npmjs.com/package/x402-stacks)
- [x402-stacks GitHub](https://github.com/tony1908/x402Stacks)
- [Stacks Documentation](https://docs.stacks.co)
- [AIBTC x402 Relay](https://aibtc.com)

## License

MIT
