#!/usr/bin/env tsx

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { bot } from '../bot/bot';
import { getSupabaseAdmin, updateJobStatus, type JobRecord } from '../lib/supabase';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;

interface JobProcessor {
  [key: string]: (job: JobRecord) => Promise<void>;
}

// Job processors - add your job types here
const jobProcessors: JobProcessor = {
  echo_job: async (job: JobRecord) => {
    const { message } = job.payload;
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Send message back to the chat
    await bot().api.sendMessage(
      job.chat_id,
      `🔄 Background job completed! Original message: "${message}"`
    );
    
    // Update job with result
    await updateJobStatus(job.id, 'completed', { 
      processed_message: message,
      timestamp: new Date().toISOString()
    });
  },
  
  // Add more job types here
  // example_job: async (job: JobRecord) => { ... }
};

async function processJob(job: JobRecord): Promise<void> {
  const processor = jobProcessors[job.type];
  
  if (!processor) {
    console.error(`❌ No processor found for job type: ${job.type}`);
    await updateJobStatus(job.id, 'failed', undefined, `No processor for type: ${job.type}`);
    return;
  }

  try {
    // Mark job as processing
    await updateJobStatus(job.id, 'processing');
    
    // Process the job
    await processor(job);
    
    console.log(`✅ Successfully processed job ${job.id} (${job.type})`);
  } catch (error) {
    console.error(`❌ Error processing job ${job.id}:`, error);
    await updateJobStatus(
      job.id, 
      'failed', 
      undefined, 
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

async function pollJobs(): Promise<void> {
  try {
    // Fetch queued jobs
    const { data: jobs, error } = await getSupabaseAdmin()
      .from('jobs')
      .select('*')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching jobs:', error);
      return;
    }

    if (jobs && jobs.length > 0) {
      console.log(`📋 Found ${jobs.length} jobs to process`);
      
      // Process jobs sequentially to avoid overwhelming the system
      for (const job of jobs) {
        await processJob(job);
      }
    }
  } catch (error) {
    console.error('❌ Error in pollJobs:', error);
  }
}

async function startWorker(): Promise<void> {
  console.log('🔄 Starting background worker...');
  console.log(`⏱️  Polling interval: ${POLL_INTERVAL}ms`);
  console.log('Press Ctrl+C to stop the worker');

  // Continuous polling
  const intervalId = setInterval(async () => {
    await pollJobs();
  }, POLL_INTERVAL);

  // Handle graceful shutdown
  const cleanup = () => {
    console.log('\n🛑 Stopping background worker...');
    clearInterval(intervalId);
    process.exit(0);
  };

  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
}

// Start the worker
if (require.main === module) {
  startWorker().catch((error) => {
    console.error('Failed to start worker:', error);
    process.exit(1);
  });
}

export { processJob, pollJobs, startWorker };
