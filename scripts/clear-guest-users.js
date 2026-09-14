#!/usr/bin/env node

/**
 * Script to remove all guest users / guest sessions from the Sabiochess D1 database.
 *
 * Usage:
 *   node scripts/clear-guest-users.js [--local | --remote | --prod] [--dry-run]
 *
 * Examples:
 *   node scripts/clear-guest-users.js           # Clears local D1 guest_sessions
 *   node scripts/clear-guest-users.js --remote  # Clears production remote D1 guest_sessions
 *   node scripts/clear-guest-users.js --dry-run # Shows count of guest sessions without deleting
 */

const { execSync } = require('child_process');
const path = require('path');

const DB_NAME = 'sabiochess-db';

const args = process.argv.slice(2);
const isHelp = args.includes('--help') || args.includes('-h');
const isRemote = args.includes('--remote') || args.includes('--prod');
const isDryRun = args.includes('--dry-run');
const targetFlag = isRemote ? '--remote' : '--local';
const envName = isRemote ? 'PRODUCTION (remote)' : 'LOCAL';

if (isHelp) {
  console.log(`
Sabiochess Guest Users Cleanup Utility
======================================

Removes all guest sessions from the Cloudflare D1 database table \`guest_sessions\`.

Options:
  --local     Target local D1 database (default)
  --remote    Target remote production D1 database
  --prod      Alias for --remote
  --dry-run   Show count of guest records without deleting
  -h, --help  Show this help message

Examples:
  npm run db:clear:guests
  npm run db:clear:guests:prod
  node scripts/clear-guest-users.js --dry-run
`);
  process.exit(0);
}

function runWranglerSql(query) {
  const command = `npx wrangler d1 execute ${DB_NAME} ${targetFlag} --command="${query.replace(/"/g, '\\"')}" --json`;
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const jsonStart = output.indexOf('[');
    if (jsonStart === -1) {
      return null;
    }
    const jsonStr = output.slice(jsonStart);
    const parsed = JSON.parse(jsonStr);
    return parsed;
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : error.message;
    throw new Error(`Failed to execute query on ${envName} D1 database: ${stderr}`);
  }
}

async function main() {
  console.log(`\n🧹 Sabiochess Guest Users Cleanup Tool`);
  console.log(`Target Environment: \x1b[36m${envName}\x1b[0m`);
  console.log(`Database: \x1b[33m${DB_NAME}\x1b[0m\n`);

  try {
    // 1. Check if table exists and count guest records
    console.log('🔍 Checking existing guest sessions...');
    const countResult = runWranglerSql('SELECT COUNT(*) as total FROM guest_sessions;');
    
    let totalGuests = 0;
    if (countResult && countResult[0] && countResult[0].results && countResult[0].results[0]) {
      totalGuests = countResult[0].results[0].total ?? 0;
    }

    console.log(`📊 Found \x1b[32m${totalGuests}\x1b[0m guest session(s) in \`guest_sessions\` table.`);

    if (totalGuests === 0) {
      console.log('✅ No guest users to remove. Database is already clean!\n');
      return;
    }

    if (isDryRun) {
      console.log(`\n⚠️  [DRY RUN] Dry run mode enabled. ${totalGuests} record(s) would be deleted. No changes were made.\n`);
      return;
    }

    // 2. Delete all records from guest_sessions
    console.log(`\n🗑️  Deleting ${totalGuests} guest user session(s)...`);
    const deleteResult = runWranglerSql('DELETE FROM guest_sessions;');

    // 3. Verify deletion
    const verifyResult = runWranglerSql('SELECT COUNT(*) as remaining FROM guest_sessions;');
    let remaining = 0;
    if (verifyResult && verifyResult[0] && verifyResult[0].results && verifyResult[0].results[0]) {
      remaining = verifyResult[0].results[0].remaining ?? 0;
    }

    if (remaining === 0) {
      console.log(`\x1b[32m✨ Successfully removed all ${totalGuests} guest user(s) from ${envName} database!\x1b[0m\n`);
    } else {
      console.warn(`\x1b[33m⚠️  Warning: ${remaining} guest session(s) remaining after cleanup.\x1b[0m\n`);
    }
  } catch (error) {
    console.error(`\x1b[31m❌ Error:\x1b[0m`, error.message);
    process.exit(1);
  }
}

main();
