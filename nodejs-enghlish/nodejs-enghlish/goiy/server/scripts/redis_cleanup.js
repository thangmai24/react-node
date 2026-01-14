require('dotenv').config();
const redis = require('../src/config/redis');

// Usage examples:
// node scripts/redis_cleanup.js --action=set-expire --seconds=3600 --pattern="*"
// node scripts/redis_cleanup.js --action=delete --pattern="rt:*"
// node scripts/redis_cleanup.js --action=report --pattern="*"

const argv = require('minimist')(process.argv.slice(2));
const ACTION = argv.action || 'report';
const PATTERN = argv.pattern || '*';
const EXPIRE_SECONDS = Number(argv.seconds) || 3600;
const COUNT = Number(argv.count) || 100;

async function scanAndAct() {
  console.log(`Starting scan: pattern=${PATTERN}, action=${ACTION}`);
  let cursor = '0';
  let total = 0;
  let changed = 0;

  do {
    // Upstash scan returns [cursor, keys]
    const res = await redis.scan(cursor, { MATCH: PATTERN, COUNT });
    cursor = res[0];
    const keys = res[1] || [];

    for (const key of keys) {
      total++;
      const ttl = await redis.ttl(key);

      if (ACTION === 'report') {
        if (ttl === -1) console.log(`No TTL: ${key}`);
      } else if (ACTION === 'set-expire') {
        if (ttl === -1) {
          await redis.expire(key, EXPIRE_SECONDS);
          console.log(`Set TTL ${EXPIRE_SECONDS}s on ${key}`);
          changed++;
        }
      } else if (ACTION === 'delete') {
        // Optionally only delete keys with no TTL
        if (ttl === -1) {
          await redis.del(key);
          console.log(`Deleted ${key}`);
          changed++;
        }
      }
    }
  } while (cursor !== '0');

  console.log(`Scan finished. Total keys inspected: ${total}. Changes: ${changed}`);
}

scanAndAct().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});