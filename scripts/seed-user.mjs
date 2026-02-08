#!/usr/bin/env node

/**
 * Script to create a test user via the Supabase Auth API
 * This uses the normal signup flow so the profile trigger fires correctly
 * 
 * Usage: node scripts/seed-user.mjs
 */

const SUPABASE_URL = process.env.NUXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const TEST_USER = {
  email: 'jesse@thewebbeckons.ca',
  password: 'SupapokerBest%1234',
  name: 'Jesse'
};

async function seedUser() {
  console.log('🌱 Seeding test user...');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Email: ${TEST_USER.email}`);

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        data: {
          name: TEST_USER.name
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
    console.log('   Password: SupapokerBest%1234');
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    process.exit(1);
  }
}

seedUser();
