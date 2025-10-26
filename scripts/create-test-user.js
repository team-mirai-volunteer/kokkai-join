#!/usr/bin/env node

/**
 * テストユーザー作成スクリプト
 *
 * ローカルSupabase環境にテストユーザーを作成します。
 *
 * 使用方法:
 *   bun scripts/create-test-user.js [email] [password]
 *   bun scripts/create-test-user.js myuser@example.com mypassword
 */

import { createClient } from '@supabase/supabase-js';

// コマンドライン引数を取得
const args = process.argv.slice(2);

// Supabase接続情報
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

// テストユーザー情報（コマンドライン引数またはデフォルト値）
const TEST_USER_EMAIL = args[0] || 'test@example.com';
const TEST_USER_PASSWORD = args[1] || 'test123456';

// ヘルプ表示
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
テストユーザー作成スクリプト

使用方法:
  bun scripts/create-test-user.js [email] [password]

例:
  bun scripts/create-test-user.js                        # デフォルト値で作成
  bun scripts/create-test-user.js user@example.com pass # カスタムユーザーで作成

オプション:
  -h, --help    このヘルプを表示

デフォルト値:
  Email:    test@example.com
  Password: test123456
  `);
  process.exit(0);
}

async function createTestUser() {
  console.log('🚀 Creating test user...\n');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Test User Email: ${TEST_USER_EMAIL}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        console.log('⚠️  User already exists\n');
        console.log('Test User Credentials:');
        console.log(`  Email: ${TEST_USER_EMAIL}`);
        console.log(`  Password: ${TEST_USER_PASSWORD}\n`);
        console.log('✅ You can log in with these credentials!');
        process.exit(0);
      }
      throw error;
    }

    console.log('✅ Test user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID: ${data.user.id}`);
    console.log(`  Email: ${data.user.email}`);
    console.log(`  Created at: ${data.user.created_at}\n`);
    console.log('Test User Credentials:');
    console.log(`  Email: ${TEST_USER_EMAIL}`);
    console.log(`  Password: ${TEST_USER_PASSWORD}\n`);
    console.log('🎉 You can now log in with these credentials!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test user:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Supabase is running: supabase status');
    console.error('  2. Check your SUPABASE_SERVICE_ROLE_KEY in backend/.env');
    console.error('  3. Verify the Supabase URL is correct\n');
    process.exit(1);
  }
}

createTestUser();
