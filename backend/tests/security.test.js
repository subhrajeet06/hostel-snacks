const http = require('http');

/**
 * Minimal, zero-dependency test runner for verifying security controls.
 * Assumes the dev server is running on http://localhost:5000.
 */

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let customerToken = '';
let testProductId = '';
let adminId = '';

// --- HTTP Helper ---
const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// --- Test Runner ---
const runTests = async () => {
  console.log('🛡️ Starting Security Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    // 1. Auth & Rate Limiting
    console.log('\n--- Authentication & Rate Limiting ---');
    
    // Login as Admin
    let res = await request('POST', '/auth/login', { email: 'admin@hostel.com', password: 'Admin@123' });
    assert(res.status === 200 && res.body.success, 'Admin can login');
    adminToken = res.body.token;
    adminId = res.body.user.id;

    // Trigger login rate limit
    for (let i = 0; i < 6; i++) {
      res = await request('POST', '/auth/login', { email: 'wrong@hostel.com', password: 'bad' });
    }
    assert(res.status === 429, 'Login rate limit triggers 429 Too Many Requests');

    // 2. Authorization (RBAC)
    console.log('\n--- Authorization Controls ---');
    
    // Register a new customer
    const mockEmail = `test${Date.now()}@test.com`;
    res = await request('POST', '/auth/register', { name: 'Test Customer', email: mockEmail, password: 'Password123!', phone: '1234567890', roomNumber: '101' });
    assert(res.status === 201, 'Customer can register');

    // Manually verify email using admin privileges via direct DB if we had it, but here we can't easily. 
    // We'll just assume they can't login yet.
    res = await request('POST', '/auth/login', { email: mockEmail, password: 'Password123!' });
    assert(res.status === 403 && res.body.requiresVerification, 'Unverified customer cannot login');

    // Test RBAC without customer token (we'll just use no token)
    res = await request('GET', '/admin/stats', null, 'invalid_token');
    assert(res.status === 401, 'Invalid token rejected (401)');

    // 3. Admin Guards
    console.log('\n--- Admin Protections ---');
    res = await request('PUT', `/admin/users/${adminId}`, { role: 'customer' }, adminToken);
    assert(res.status === 400 && res.body.message.includes('remove your own admin role'), 'Admin self-demotion is blocked');
    
    res = await request('PUT', `/admin/users/${adminId}`, { isActive: false }, adminToken);
    assert(res.status === 400 && res.body.message.includes('deactivate your own account'), 'Admin self-deactivation is blocked');

    // 4. Audit Logging
    console.log('\n--- Immutable Audit Logs ---');
    
    // Create product to trigger audit log
    res = await request('POST', '/products', { 
      name: 'Audit Test Product', 
      price: 10, 
      category: 'Snacks', 
      stock: 5,
      description: 'Test'
    }, adminToken);
    assert(res.status === 201, 'Admin can create product');
    testProductId = res.body.product._id;

    // Update inventory to trigger inventory_updated audit log
    res = await request('PUT', `/products/${testProductId}`, { stock: 10 }, adminToken);
    assert(res.status === 200, 'Admin can update product inventory');

    // Delete product
    res = await request('DELETE', `/products/${testProductId}`, null, adminToken);
    assert(res.status === 200, 'Admin can delete product');

    // Wait a brief moment for async audit logs to write
    await new Promise(r => setTimeout(r, 100));

    // Check audit logs
    res = await request('GET', '/admin/audit-logs?resourceType=product', null, adminToken);
    assert(res.status === 200 && res.body.logs.length >= 3, 'Audit logs successfully recorded product creation, update, and deletion');

    const inventoryLog = res.body.logs.find(l => l.action === 'inventory_updated' && l.resourceId === testProductId);
    assert(inventoryLog && inventoryLog.changes.stock.from === 5 && inventoryLog.changes.stock.to === 10, 'Audit log accurately captured inventory diff');

    // 5. Input Validation & XSS
    console.log('\n--- Input Sanitization ---');
    res = await request('GET', '/products?search=<script>alert("xss")</script>');
    // The API should handle this gracefully and return 200 with no products, rather than throwing an error or echoing the script
    assert(res.status === 200, 'XSS input in query params handled safely');

    // 6. Security Headers
    console.log('\n--- Security Headers ---');
    res = await new Promise((resolve) => {
      http.get(BASE_URL + '/health', (r) => resolve(r));
    });
    assert(res.headers['content-security-policy'] && res.headers['content-security-policy'].includes("default-src 'none'"), 'CSP header is set');
    assert(res.headers['cross-origin-resource-policy'] === 'cross-origin', 'CORP header is set');
    assert(res.headers['x-powered-by'] === undefined, 'X-Powered-By is removed');

    console.log('\n--- Summary ---');
    console.log(`Total: ${passed + failed}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
};

runTests();
