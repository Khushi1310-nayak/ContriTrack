import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * ContriTrack Enterprise k6 Load & Stress Testing Suite
 * Simulates concurrent virtual users (VUs) accessing key platform API routes & pages.
 */
export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp-up to 10 VUs
    { duration: '20s', target: 50 }, // Ramp-up to 50 VUs (stress test phase)
    { duration: '10s', target: 0 },  // Graceful ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete under 500ms
    http_req_failed: ['rate<0.01'],                 // Less than 1% request failures
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // 1. Audit Landing Page Latency
  const resHome = http.get(`${BASE_URL}/`);
  check(resHome, {
    'Home page status is 200': (r) => r.status === 200,
    'Home page latency < 500ms': (r) => r.timings.duration < 500,
  });

  // 2. Audit Academic Hubs Catalog Page Latency
  const resHubs = http.get(`${BASE_URL}/hubs`);
  check(resHubs, {
    'Hubs catalog status is 200': (r) => r.status === 200,
    'Hubs catalog latency < 500ms': (r) => r.timings.duration < 500,
  });

  // 3. Audit Auth Login Gateway Page Latency
  const resAuth = http.get(`${BASE_URL}/auth`);
  check(resAuth, {
    'Auth portal status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
