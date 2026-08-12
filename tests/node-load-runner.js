/**
 * ContriTrack Real Load & Stress Test Runner
 * Measures real latency (p50, p95, p99), throughput (RPS), and error rates.
 */
const TARGET_URL = process.env.TARGET_URL || 'https://contri-track.vercel.app';
const CONCURRENT_USERS = 5;
const DURATION_SECONDS = 10;

console.log(`\n===============================================================`);
console.log(`🚀 STARTING CONTRITRACK LOAD & STRESS TEST`);
console.log(`Target Host: ${TARGET_URL}`);
console.log(`Virtual Users: ${CONCURRENT_USERS} Concurrent Connections`);
console.log(`Duration: ${DURATION_SECONDS} seconds`);
console.log(`===============================================================\n`);

const endpoints = ['/', '/hubs', '/auth'];
const latencies = [];
let totalRequests = 0;
let successRequests = 0;
let failedRequests = 0;

const startTime = Date.now();
const endTime = startTime + DURATION_SECONDS * 1000;

async function makeRequest(url) {
  const reqStart = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    await res.text();
    const duration = Date.now() - reqStart;
    totalRequests++;
    if (res.status >= 200 && res.status < 400) {
      successRequests++;
      latencies.push(duration);
    } else {
      failedRequests++;
    }
  } catch (_err) {
    totalRequests++;
    failedRequests++;
  }
}

async function worker() {
  while (Date.now() < endTime) {
    const ep = endpoints[Math.floor(Math.random() * endpoints.length)];
    await makeRequest(`${TARGET_URL}${ep}`);
    await new Promise((r) => setTimeout(r, 200));
  }
}

async function run() {
  const workers = Array.from({ length: CONCURRENT_USERS }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : 0;
  const p99 = latencies.length ? latencies[Math.floor(latencies.length * 0.99)] : 0;
  const rps = (totalRequests / totalTimeSec).toFixed(1);
  const failureRate = ((failedRequests / (totalRequests || 1)) * 100).toFixed(2);

  console.log(`\n===============================================================`);
  console.log(`📊 CONTRITRACK LOAD TEST RESULTS SUMMARY`);
  console.log(`===============================================================`);
  console.log(`Total Requests Completed:   ${totalRequests}`);
  console.log(`Successful Responses:       ${successRequests} (${((successRequests / (totalRequests || 1)) * 100).toFixed(1)}%)`);
  console.log(`Failed Responses:           ${failedRequests} (${failureRate}%)`);
  console.log(`Throughput (RPS):           ${rps} req/sec`);
  console.log(`---------------------------------------------------------------`);
  console.log(`Average Latency:            ${avg} ms`);
  console.log(`p50 Latency (Median):       ${p50} ms`);
  console.log(`p95 Latency (95th %ile):    ${p95} ms`);
  console.log(`p99 Latency (99th %ile):    ${p99} ms`);
  console.log(`===============================================================\n`);
}

run().catch(console.error);
