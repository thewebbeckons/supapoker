#!/usr/bin/env node

/**
 * Script to create a test user via the Supabase Auth API
 * This uses the normal signup flow so the profile trigger fires correctly
 * 
 * Usage: node scripts/seed-user.mjs
 * Required env vars:
 *   - SEED_USER_EMAIL
 *   - SEED_USER_PASSWORD
 * Optional env vars:
 *   - SEED_USER_NAME
 */

const SUPABASE_URL =
  process.env.NUXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY =
  process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

const TEST_USER_EMAIL = process.env.SEED_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.SEED_USER_PASSWORD;
const TEST_USER_NAME = process.env.SEED_USER_NAME || 'Test User';

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('❌ Missing seed user credentials.');
  console.error('Set SEED_USER_EMAIL and SEED_USER_PASSWORD before running db:seed.');
  process.exit(1);
}

async function seedUser() {
  console.log('🌱 Seeding test user...');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Email: ${TEST_USER_EMAIL}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        data: {
          name: TEST_USER_NAME
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.msg?.includes('already registered') || data.error?.includes('already registered')) {
        console.log('ℹ️  User already exists, skipping creation');
        return;
      }
      throw new Error(data.msg || data.error || JSON.stringify(data));
    }

    console.log('✅ Test user created successfully!');
    console.log(`   User ID: ${data.user?.id || data.id}`);
    console.log(`   Email: ${data.user?.email || data.email}`);
    console.log('   Password: [from SEED_USER_PASSWORD]');
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }
}

seedUser();
