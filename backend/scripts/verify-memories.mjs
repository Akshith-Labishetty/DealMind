import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Deal } from '../src/models/Deal.js';
import { Interaction } from '../src/models/Interaction.js';
import { listMemories } from '../src/services/hindsight.js';

async function verify() {
  await mongoose.connect(config.mongoUri);
  const deals = await Deal.find().lean();
  console.log(`Found ${deals.length} deals in database:\n`);

  for (const deal of deals) {
    const interactionsCount = await Interaction.countDocuments({ dealId: deal._id });
    const memoryRes = await listMemories(deal.bankId);
    const memCount = memoryRes.items?.length ?? memoryRes.total ?? 0;
    
    console.log(`🏢 ${deal.company}`);
    console.log(`   Bank ID: ${deal.bankId}`);
    console.log(`   Interactions in DB : ${interactionsCount}`);
    console.log(`   Memories in Hindsight : ${memCount}`);
    if (memoryRes.items && memoryRes.items.length > 0) {
      const sample = memoryRes.items[0].text || memoryRes.items[0].content || '';
      console.log(`   Sample Memory Fact    : "${sample.slice(0, 90).replace(/\n/g, ' ')}..."`);
    } else {
      console.log(`   Notice                : ${memoryRes.error || memoryRes.warning || '0 facts'}`);
    }
    console.log('');
  }

  await mongoose.disconnect();
}

verify().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
