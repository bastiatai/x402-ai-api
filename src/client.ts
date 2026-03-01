import axios from 'axios';
import { wrapAxiosWithPayment, privateKeyToAccount } from 'x402-stacks';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';

  if (!PRIVATE_KEY) {
    console.error('❌ PRIVATE_KEY environment variable is required');
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(PRIVATE_KEY, NETWORK);
  console.log(`✅ Account created: ${account.address}`);

  // Wrap axios with automatic payment handling
  const api = wrapAxiosWithPayment(
    axios.create({ baseURL: API_BASE_URL }),
    account
  );

  console.log(`\n🔗 Connecting to API: ${API_BASE_URL}`);
  console.log(`📡 Network: ${NETWORK}\n`);

  try {
    // Test 1: Free health check (no payment required)
    console.log('1️⃣ Testing free health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Health:', healthResponse.data);

    // Test 2: Paid sentiment analysis
    console.log('\n2️⃣ Testing paid sentiment analysis...');
    const sentimentResponse = await api.post('/api/sentiment', {
      text: 'Bitcoin is amazing! Stacks makes it even better with smart contracts.'
    });
    console.log('✅ Sentiment:', sentimentResponse.data);

    // Test 3: Paid summarization
    console.log('\n3️⃣ Testing paid summarization...');
    const summarizeResponse = await api.post('/api/summarize', {
      text: 'Stacks is a Bitcoin layer that brings smart contracts to Bitcoin without modifying Bitcoin itself. It uses Proof of Transfer (PoX) to anchor to Bitcoin security. Developers can build decentralized apps secured by Bitcoin.',
      maxSentences: 2
    });
    console.log('✅ Summary:', summarizeResponse.data);

    // Test 4: Paid key point extraction
    console.log('\n4️⃣ Testing paid key point extraction...');
    const extractResponse = await api.post('/api/extract', {
      text: 'The key feature of Stacks is Bitcoin security. It is important to note that sBTC enables DeFi on Bitcoin. Developers must understand the Clarity smart contract language. Users will benefit from Bitcoin-secured apps.'
    });
    console.log('✅ Key points:', extractResponse.data);

    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

main();
