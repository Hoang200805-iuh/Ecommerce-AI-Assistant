// Simple Express + SQLite3 Backend
import express from 'express';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import axios from 'axios';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const SYSTEM_USERS = [
  { name: 'Nguyễn Văn Khách', email: 'customer@smartmobile.vn', role: 'customer', status: 'active', phone: '0900000001' },
  { name: 'Nguyễn Văn Admin', email: 'admin@smartmobile.vn', role: 'admin', status: 'active', phone: '0900000002' },
  { name: 'Lê Minh Kho', email: 'kho@smartmobile.vn', role: 'warehouse', status: 'active', phone: '0900000003' },
];

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database
const dbPath = path.join(__dirname, 'prisma', 'phones.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('✅ Connected to SQLite');
  }
});

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  const ensureColumn = (sql, onSuccess) => {
    db.run(sql, (err) => {
      if (err) {
        if (err.code === 'SQLITE_ERROR' && /duplicate column name/i.test(err.message || '')) {
          if (typeof onSuccess === 'function') {
            onSuccess();
          }
          return;
        }

        console.error('Schema initialization error:', err.message || err);
        return;
      }

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    });
  };

  ensureColumn('ALTER TABLE phones ADD COLUMN stock INTEGER DEFAULT 10', () => {
    db.run('UPDATE phones SET stock = COALESCE(stock, 10)')
  });
  ensureColumn('ALTER TABLE phones ADD COLUMN min_stock INTEGER DEFAULT 10', () => {
    db.run('UPDATE phones SET min_stock = COALESCE(min_stock, 10)')
  });
  ensureColumn('ALTER TABLE phones ADD COLUMN category TEXT');
  ensureColumn('ALTER TABLE phones ADD COLUMN ram TEXT');
  ensureColumn('ALTER TABLE phones ADD COLUMN rom TEXT');
  ensureColumn('ALTER TABLE phones ADD COLUMN battery TEXT');
  ensureColumn('ALTER TABLE phones ADD COLUMN review_count INTEGER DEFAULT 0');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'customer',
      phone TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL DEFAULT 'customer',
      shipping_name TEXT NOT NULL,
      shipping_email TEXT NOT NULL,
      shipping_phone TEXT NOT NULL,
      shipping_address TEXT NOT NULL,
      shipping_city TEXT,
      note TEXT,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_price INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      order_item_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      brand TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL,
      image_url TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_date TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
    )
  `);
  ensureColumn('ALTER TABLE users ADD COLUMN phone TEXT');
  ensureColumn('ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT "active"');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)');
  SYSTEM_USERS.forEach((user) => {
    db.run(
      `INSERT INTO users (user_id, name, email, role, phone, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO NOTHING`,
      [randomUUID(), user.name, user.email, user.role, user.phone, user.status]
    );
  });
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function formatInventoryItem(row) {
  const stock = Number(row?.stock ?? 0);
  const minStock = Math.max(0, Number(row?.min_stock ?? 10));

  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    sku: row.sku || `SKU-${String(row.id).padStart(4, '0')}`,
    stock,
    minStock,
    price: Number(row.price ?? 0),
    status: stock === 0 ? 'out_stock' : stock <= minStock ? 'low_stock' : 'in_stock',
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running on port ' + PORT });
});

// GET /api/products - List all phones
app.get('/api/products', (req, res) => {
  const { search, brand, limit = 20 } = req.query;
  
  let query = 'SELECT * FROM phones';
  const params = [];
  
  if (search) {
    query += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }
  if (brand) {
    if (params.length > 0) {
      query += ' AND brand = ?';
    } else {
      query += ' WHERE brand = ?';
    }
    params.push(brand);
  }
  
  query += ` LIMIT ${Math.min(parseInt(limit) || 20, 100)}`;
  
  db.all(query, params, (err, phones) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!phones || phones.length === 0) {
      return res.json({ success: true, data: [] });
    }
    
    // Fetch specs for each phone
    let completed = 0;
    const phonesWithSpecs = phones.map(p => ({ ...p, specs: {} }));
    
    phones.forEach((phone, idx) => {
      db.all('SELECT spec_key, spec_value FROM specs WHERE phone_id = ?', [phone.id], (err, specs) => {
        if (!err && specs) {
          const specsObj = {};
          specs.forEach(s => {
            specsObj[s.spec_key] = s.spec_value;
          });
          phonesWithSpecs[idx].specs = specsObj;
        }
        
        completed++;
        if (completed === phones.length) {
          res.json({ success: true, data: phonesWithSpecs });
        }
      });
    });
  });
});

// GET /api/products/:id - Get phone details with specs and reviews
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM phones WHERE id = ?', [id], (err, phone) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!phone) {
      return res.status(404).json({ message: 'Phone not found' });
    }
    
    // Parse specs and reviews from phone object (they're stored as text strings)
    const specsObj = {};
    const reviews = [];
    
    if (phone.specs && phone.specs !== 'N/A') {
      try {
        // Specs are stored as "Key: Value | Key2: Value2"
        phone.specs.split(' | ').forEach(spec => {
          const [key, value] = spec.split(': ');
          if (key) specsObj[key.trim()] = (value || 'N/A').trim();
        });
      } catch (e) {
        // Fallback if format is different
      }
    }
    
    if (phone.reviews && phone.reviews !== 'N/A') {
      try {
        // Reviews are stored as "Name (5⭐): Comment | Name2..."
        phone.reviews.split(' | ').filter(r => r.trim()).forEach(review => {
          reviews.push(review.trim());
        });
      } catch (e) {
        // Fallback
      }
    }
    
    res.json({
      success: true,
      data: {
        ...phone,
        specs: specsObj,
        reviews: reviews
      }
    });
  });
});

// GET /api/phones - Alternative endpoint
app.get('/api/phones', (req, res) => {
  db.all('SELECT * FROM phones', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, data: rows || [] });
  });
});

// GET /api/brands - Get available brands
app.get('/api/brands', (req, res) => {
  db.all('SELECT DISTINCT brand FROM phones', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const brands = rows ? rows.map(r => r.brand) : [];
    res.json({ success: true, data: brands });
  });
});

app.get('/api/warehouse/inventory', async (req, res) => {
  try {
    const { search = '', brand = '' } = req.query;
    const params = [];
    let query = 'SELECT id, name, brand, price, stock, COALESCE(min_stock, 10) AS min_stock FROM phones';

    const filters = [];
    if (search) {
      filters.push('(name LIKE ? OR brand LIKE ? OR CAST(id AS TEXT) LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (brand) {
      filters.push('brand = ?');
      params.push(brand);
    }

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(' AND ')}`;
    }

    query += ' ORDER BY brand ASC, name ASC';

    const rows = await all(query, params);
    const inventory = rows.map(formatInventoryItem);
    const summary = inventory.reduce((accumulator, item) => {
      accumulator.totalProducts += 1;
      accumulator.totalStock += item.stock;
      if (item.status === 'in_stock') accumulator.inStock += 1;
      if (item.status === 'low_stock') accumulator.lowStock += 1;
      if (item.status === 'out_stock') accumulator.outStock += 1;
      return accumulator;
    }, { totalProducts: 0, totalStock: 0, inStock: 0, lowStock: 0, outStock: 0 });

    res.json({ success: true, data: inventory, summary });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load inventory' });
  }
});

app.patch('/api/warehouse/inventory/:id', async (req, res) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isFinite(productId)) {
      return res.status(400).json({ message: 'Invalid product id' });
    }

    const payload = req.body || {};
    const product = await get('SELECT id, name, brand, price, stock, COALESCE(min_stock, 10) AS min_stock FROM phones WHERE id = ?', [productId]);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const nextStock = payload.stock === undefined || payload.stock === null || payload.stock === ''
      ? Number(product.stock ?? 0)
      : Math.max(0, Number(payload.stock));

    const nextMinStock = payload.minStock === undefined || payload.minStock === null || payload.minStock === ''
      ? Math.max(0, Number(product.min_stock ?? 10))
      : Math.max(0, Number(payload.minStock));

    if (!Number.isFinite(nextStock) || !Number.isFinite(nextMinStock)) {
      return res.status(400).json({ message: 'Invalid inventory values' });
    }

    await run('UPDATE phones SET stock = ?, min_stock = ? WHERE id = ?', [nextStock, nextMinStock, productId]);

    const updated = await get('SELECT id, name, brand, price, stock, COALESCE(min_stock, 10) AS min_stock FROM phones WHERE id = ?', [productId]);
    return res.json({ success: true, data: formatInventoryItem(updated) });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to update inventory' });
  }
});

app.post('/api/orders', async (req, res) => {
  const payload = req.body || {};
  const customer = payload.customer || {};
  const user = payload.user || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const paymentMethod = String(payload.paymentMethod || '').trim();

  if (!customer.name || !customer.email || !customer.phone || !customer.address || !items.length || !paymentMethod) {
    return res.status(400).json({ message: 'Missing required order data' });
  }

  let totalPrice = 0;
  const normalizedItems = [];

  try {
    await run('BEGIN TRANSACTION');

    const userEmail = String(user.email || customer.email).trim().toLowerCase();
    const userName = String(user.name || customer.name).trim();
    const userRole = String(user.role || 'customer').trim();

    await run(
      `INSERT INTO users (user_id, name, email, role)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = excluded.role`,
      [randomUUID(), userName, userEmail, userRole]
    );

    for (const item of items) {
      const productId = Number(item.id ?? item.product_id ?? item.productId);
      const quantity = Math.max(1, Number(item.quantity ?? 1));

      if (!Number.isFinite(productId)) {
        throw new Error('Invalid product in cart');
      }

      const product = await get('SELECT * FROM phones WHERE id = ?', [productId]);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      const stock = Number(product.stock ?? 0);
      if (stock < quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }

      const price = Number(product.price ?? 0);
      totalPrice += price * quantity;

      normalizedItems.push({
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        quantity,
        price,
        imageUrl: product.image_url || null,
      });

      await run('UPDATE phones SET stock = COALESCE(stock, 0) - ? WHERE id = ?', [quantity, product.id]);
    }

    const orderId = randomUUID();
    await run(
      `INSERT INTO orders (
        order_id, user_email, user_name, user_role,
        shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, note,
        payment_method, status, total_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        userEmail,
        userName,
        userRole,
        String(customer.name).trim(),
        String(customer.email).trim(),
        String(customer.phone).trim(),
        String(customer.address).trim(),
        String(customer.city || '').trim(),
        String(customer.note || '').trim(),
        paymentMethod,
        'pending',
        totalPrice,
      ]
    );

    for (const item of normalizedItems) {
      await run(
        `INSERT INTO order_items (
          order_item_id, order_id, product_id, product_name, brand, quantity, price, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), orderId, item.productId, item.productName, item.brand, item.quantity, item.price, item.imageUrl]
      );
    }

    await run(
      `INSERT INTO payments (payment_id, order_id, payment_method, payment_status, payment_date)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [randomUUID(), orderId, paymentMethod, paymentMethod === 'cod' ? 'pending' : 'completed']
    );

    await run('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        orderId,
        totalPrice,
        items: normalizedItems,
        status: 'pending',
      },
    });
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    return res.status(400).json({ message: error.message || 'Failed to create order' });
  }
});

app.get('/api/orders/user/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email || '').trim().toLowerCase();
    const orders = await all(
      `SELECT * FROM orders WHERE LOWER(user_email) = ? ORDER BY datetime(created_at) DESC`,
      [email]
    );

    const ordersWithItems = [];
    for (const order of orders) {
      const items = await all(
        `SELECT * FROM order_items WHERE order_id = ? ORDER BY product_name ASC`,
        [order.order_id]
      );
      ordersWithItems.push({
        ...order,
        items,
      });
    }

    res.json({ success: true, data: ordersWithItems });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load orders' });
  }
});

app.patch('/api/orders/:id/cancel', async (req, res) => {
  const orderId = String(req.params.id || '').trim();
  const userEmail = String(req.body?.userEmail || '').trim().toLowerCase();

  if (!orderId || !userEmail) {
    return res.status(400).json({ message: 'Missing order information' });
  }

  try {
    const existing = await get('SELECT * FROM orders WHERE order_id = ?', [orderId]);

    if (!existing) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (String(existing.user_email || '').trim().toLowerCase() !== userEmail) {
      return res.status(403).json({ message: 'You can only cancel your own orders' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ message: 'Chỉ có thể huỷ đơn khi quản lý kho chưa duyệt' });
    }

    const items = await all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);

    await run('BEGIN TRANSACTION');

    for (const item of items) {
      await run('UPDATE phones SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await run('UPDATE orders SET status = ? WHERE order_id = ?', ['cancelled', orderId]);
    await run('UPDATE payments SET payment_status = ? WHERE order_id = ?', ['cancelled', orderId]);
    await run('COMMIT');

    const updatedOrder = await get(
      `SELECT
        order_id,
        user_name AS customer,
        user_email AS email,
        shipping_name,
        shipping_email,
        shipping_phone AS phone,
        shipping_address AS address,
        shipping_city AS city,
        note,
        payment_method AS payment,
        status,
        total_price AS total,
        created_at AS date
       FROM orders
       WHERE order_id = ?`,
      [orderId]
    );

    const orderItems = await all(
      `SELECT order_item_id, product_id, product_name, brand, quantity, price, image_url
       FROM order_items
       WHERE order_id = ?
       ORDER BY product_name ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        ...updatedOrder,
        items: orderItems,
      },
    });
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    res.status(500).json({ message: error.message || 'Failed to cancel order' });
  }
});

app.get('/api/warehouse/orders', async (req, res) => {
  try {
    const { status = '' } = req.query;
    const params = [];
    let whereClause = '';

    if (status && status !== 'Tất cả') {
      whereClause = 'WHERE status = ?';
      params.push(status);
    }

    const summary = await get(
      `SELECT
        COUNT(*) AS totalOrders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) AS shipped,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
       FROM orders`
    );

    const orders = await all(
      `SELECT
        order_id,
        user_name AS customer,
        user_email AS email,
        shipping_name,
        shipping_email,
        shipping_phone AS phone,
        shipping_address AS address,
        shipping_city AS city,
        note,
        payment_method AS payment,
        status,
        total_price AS total,
        created_at AS date
       FROM orders
       ${whereClause}
       ORDER BY datetime(created_at) DESC`,
      params
    );

    const ordersWithItems = [];
    for (const order of orders) {
      const items = await all(
        `SELECT order_item_id, product_id, product_name, brand, quantity, price, image_url
         FROM order_items
         WHERE order_id = ?
         ORDER BY product_name ASC`,
        [order.order_id]
      );
      ordersWithItems.push({
        ...order,
        items,
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: Number(summary?.totalOrders || 0),
          pending: Number(summary?.pending || 0),
          processing: Number(summary?.processing || 0),
          shipped: Number(summary?.shipped || 0),
          delivered: Number(summary?.delivered || 0),
          cancelled: Number(summary?.cancelled || 0),
        },
        orders: ordersWithItems,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load warehouse orders' });
  }
});

app.patch('/api/warehouse/orders/:id/status', async (req, res) => {
  const orderId = String(req.params.id || '').trim();
  const nextStatus = String(req.body?.status || '').trim();
  const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

  if (!orderId || !allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ message: 'Invalid order status update' });
  }

  try {
    const existing = await get('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (!existing) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (existing.status === 'delivered' && nextStatus !== 'delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be changed' });
    }

    if (existing.status === 'cancelled' && nextStatus !== 'cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be reopened' });
    }

    if (nextStatus === 'cancelled' && ['shipped', 'delivered'].includes(existing.status)) {
      return res.status(400).json({ message: 'Shipped or delivered orders cannot be cancelled' });
    }

    const shouldRestock = nextStatus === 'cancelled' && ['pending', 'processing'].includes(existing.status);

    await run('BEGIN TRANSACTION');

    if (shouldRestock) {
      const items = await all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
      for (const item of items) {
        await run('UPDATE phones SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }

    await run('UPDATE orders SET status = ? WHERE order_id = ?', [nextStatus, orderId]);

    const paymentStatus = nextStatus === 'delivered'
      ? 'completed'
      : nextStatus === 'cancelled'
        ? 'cancelled'
        : 'pending';

    await run('UPDATE payments SET payment_status = ? WHERE order_id = ?', [paymentStatus, orderId]);
    await run('COMMIT');

    const updatedOrder = await get(
      `SELECT
        order_id,
        user_name AS customer,
        user_email AS email,
        shipping_name,
        shipping_email,
        shipping_phone AS phone,
        shipping_address AS address,
        shipping_city AS city,
        note,
        payment_method AS payment,
        status,
        total_price AS total,
        created_at AS date
       FROM orders
       WHERE order_id = ?`,
      [orderId]
    );

    const items = await all(
      `SELECT order_item_id, product_id, product_name, brand, quantity, price, image_url
       FROM order_items
       WHERE order_id = ?
       ORDER BY product_name ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        ...updatedOrder,
        items,
      },
    });
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    res.status(500).json({ message: error.message || 'Failed to update order status' });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await all(
      `SELECT
        u.user_id AS id,
        u.name,
        u.email,
        u.role,
        COALESCE(u.phone, '') AS phone,
        COALESCE(u.status, 'active') AS status,
        u.created_at AS created_at,
        COUNT(o.order_id) AS orders
       FROM users u
       LEFT JOIN orders o ON LOWER(o.user_email) = LOWER(u.email)
       GROUP BY u.user_id, u.name, u.email, u.role, u.phone, u.status, u.created_at
       ORDER BY datetime(u.created_at) DESC, u.name ASC`
    );

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load users' });
  }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();

    if (!name || !email) {
      return res.status(400).json({ message: 'Missing required user data' });
    }

    const existing = await get('SELECT user_id FROM users WHERE LOWER(email) = ?', [email]);
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được sử dụng' });
    }

    const userId = randomUUID();
    await run(
      `INSERT INTO users (user_id, name, email, role, phone, status)
       VALUES (?, ?, ?, 'customer', ?, 'active')`,
      [userId, name, email, phone]
    );

    const createdUser = await get(
      `SELECT user_id AS id, name, email, role, COALESCE(phone, '') AS phone, COALESCE(status, 'active') AS status, created_at
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    res.status(201).json({ success: true, data: createdUser });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to register user' });
  }
});

app.post('/api/admin/users', async (req, res) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const role = String(payload.role || 'customer').trim();
    const phone = String(payload.phone || '').trim();
    const status = String(payload.status || 'active').trim();

    if (!name || !email) {
      return res.status(400).json({ message: 'Missing required user data' });
    }

    const existing = await get('SELECT user_id FROM users WHERE LOWER(email) = ?', [email]);
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được sử dụng' });
    }

    const userId = randomUUID();
    await run(
      `INSERT INTO users (user_id, name, email, role, phone, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, email, role, phone, status]
    );

    const createdUser = await get(
      `SELECT user_id AS id, name, email, role, COALESCE(phone, '') AS phone, COALESCE(status, 'active') AS status, created_at
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    res.status(201).json({ success: true, data: createdUser });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create user' });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const payload = req.body || {};
    const existing = await get('SELECT * FROM users WHERE user_id = ?', [userId]);

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    const name = String(payload.name ?? existing.name).trim();
    const email = String(payload.email ?? existing.email).trim().toLowerCase();
    const role = String(payload.role ?? existing.role).trim();
    const phone = String(payload.phone ?? existing.phone ?? '').trim();
    const status = String(payload.status ?? existing.status ?? 'active').trim();

    const duplicate = await get('SELECT user_id FROM users WHERE LOWER(email) = ? AND user_id <> ?', [email, userId]);
    if (duplicate) {
      return res.status(409).json({ message: 'Email này đã được sử dụng' });
    }

    await run(
      `UPDATE users
       SET name = ?, email = ?, role = ?, phone = ?, status = ?
       WHERE user_id = ?`,
      [name, email, role, phone, status, userId]
    );

    const updatedUser = await get(
      `SELECT user_id AS id, name, email, role, COALESCE(phone, '') AS phone, COALESCE(status, 'active') AS status, created_at
       FROM users
       WHERE user_id = ?`,
      [userId]
    );

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update user' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const existing = await get('SELECT user_id FROM users WHERE user_id = ?', [userId]);

    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    await run('DELETE FROM users WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete user' });
  }
});

app.get('/api/admin/reports', async (req, res) => {
  try {
    const summary = await get(
      `SELECT
        COUNT(*) AS totalOrders,
        COALESCE(SUM(total_price), 0) AS totalRevenue
       FROM orders`
    );

    const totalUsers = await get('SELECT COUNT(*) AS totalUsers FROM users');

    const monthSummary = await get(
      `SELECT
        COUNT(*) AS monthOrders,
        COALESCE(SUM(total_price), 0) AS monthRevenue
       FROM orders
       WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
    );

    const inventorySummary = await get('SELECT COALESCE(SUM(stock), 0) AS totalStock FROM phones');

    const recentOrders = await all(
      `SELECT
        o.order_id,
        o.user_name AS customer,
        o.user_email AS email,
        o.status,
        o.total_price AS amount,
        o.payment_method AS payment,
        o.created_at AS date,
        GROUP_CONCAT(oi.product_name, ', ') AS products
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       GROUP BY o.order_id
       ORDER BY datetime(o.created_at) DESC
       LIMIT 10`
    );

    const topProductsRaw = await all(
      `SELECT
        oi.product_name AS name,
        SUM(oi.quantity) AS sold,
        SUM(oi.quantity * oi.price) AS revenue
       FROM order_items oi
       GROUP BY oi.product_id, oi.product_name
       ORDER BY sold DESC, revenue DESC
       LIMIT 5`
    );

    const topRevenue = topProductsRaw.map((product, index) => ({
      name: product.name,
      sold: Number(product.sold || 0),
      revenue: Number(product.revenue || 0),
      pct: Math.max(20, 95 - index * 13),
    }));

    const monthlyRaw = await all(
      `SELECT
        strftime('%m', created_at) AS month,
        COALESCE(SUM(total_price), 0) AS revenue,
        COUNT(*) AS orders
       FROM orders
       WHERE created_at >= datetime('now', '-6 months')
       GROUP BY strftime('%Y-%m', created_at)
       ORDER BY strftime('%Y-%m', created_at) ASC`
    );

    const monthLabels = ['T8', 'T9', 'T10', 'T11', 'T12', 'T1', 'T2', 'T3'];
    const monthlyData = monthlyRaw.slice(-8).map((row, index) => ({
      month: monthLabels[index] || `T${index + 1}`,
      revenue: Number(row.revenue || 0) / 1000000000,
      orders: Number(row.orders || 0),
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: Number(summary?.totalOrders || 0),
          totalRevenue: Number(summary?.totalRevenue || 0),
          totalUsers: Number(totalUsers?.totalUsers || 0),
          totalStock: Number(inventorySummary?.totalStock || 0),
          monthOrders: Number(monthSummary?.monthOrders || 0),
          monthRevenue: Number(monthSummary?.monthRevenue || 0),
        },
        recentOrders,
        topProducts: topRevenue,
        monthlyData,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to load admin reports' });
  }
});

// GET /api/proxy-image - Image proxy to bypass CORS
app.get('/api/proxy-image', (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  const imageUrl = decodeURIComponent(String(url));
  if (!/^https?:\/\//i.test(imageUrl)) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  axios.get(imageUrl, {
    responseType: 'stream',
    timeout: 15000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': 'https://www.google.com/'
    },
    validateStatus: (status) => status >= 200 && status < 400
  }).then((response) => {
    const contentType = response.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      response.data.destroy();
      return res.status(415).json({ error: 'Target URL did not return an image' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    response.data.on('error', (err) => {
      console.error('Image stream error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream image' });
      }
    });

    response.data.pipe(res);
  }).catch((error) => {
    console.error('Proxy fetch error:', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to fetch image from source URL' });
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend listening on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 API: http://localhost:${PORT}/api/products`);
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.log(`⚠️ Port ${PORT} is already in use. Backend is likely already running.`);
    process.exit(0);
  }

  console.error('❌ Server failed to start:', error);
  process.exit(1);
});
