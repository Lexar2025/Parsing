import { createClient } from 'redis';

const client = createClient({
  url: 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Error:', err));

await client.connect();

console.log('✅ Connected to Redis');

const version = await client.info('server');
const match = version.match(/redis_version:(\d+\.\d+\.\d+)/);
console.log(`📊 Redis version: ${match ? match[1] : 'Unknown'}`);

await client.set('test', 'Hello Redis!');
const value = await client.get('test');
console.log(`✅ Test value: ${value}`);

await client.disconnect();
console.log('✅ Disconnected');