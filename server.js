const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ============ MySQL CONNECTION ============
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'fincollect_db',
    port: 3306
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ MySQL Connection Failed!');
        console.error('Error:', err.message);
        console.log('\n💡 SOLUTIONS:');
        console.log('1. MySQL installed? Run: mysql -u root -p');
        console.log('2. MySQL service running? Run: net start MySQL80');
        console.log('3. Password correct? (root123)');
        console.log('\n⚠️ Press Ctrl+C to stop, then fix MySQL first!');
        return;
    }
    console.log('✅ MySQL Connected Successfully!');
    createTables();
});

// Keep connection alive
setInterval(() => {
    db.query('SELECT 1', (err) => {
        if (err) console.log('⚠️ MySQL ping failed');
        else console.log('✅ MySQL alive');
    });
}, 30000);

// ============ CREATE TABLES ============
function createTables() {
    // Users table
    db.query(`CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL,
        full_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Customers table
    db.query(`CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        cnic VARCHAR(20),
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        city VARCHAR(50) NOT NULL,
        due_amount DECIMAL(12,2) DEFAULT 0,
        total_paid DECIMAL(12,2) DEFAULT 0,
        remaining_due DECIMAL(12,2) DEFAULT 0,
        address TEXT,
        reference_name VARCHAR(100),
        reference_contact VARCHAR(20),
        promise_date DATE,
        business_co VARCHAR(100),
        colony VARCHAR(100),
        reason TEXT,
        photo_data LONGTEXT,
        bill_photo_data LONGTEXT,
        entry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_city (city),
        INDEX idx_phone (phone)
    )`);

    // Payments table
    db.query(`CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        reference_no VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )`);

    // Activity logs table
    db.query(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50),
        action VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default users (hardcoded)
    db.query(`INSERT IGNORE INTO users (username, password, role, full_name) VALUES 
        ('admin', 'admin123', 'admin', 'Administrator'),
        ('user', 'user123', 'user', 'Staff User')`);

    // Insert sample customers
    db.query(`INSERT IGNORE INTO customers (customer_id, name, phone, city, due_amount, remaining_due, entry_date) VALUES 
        ('CUST1001', 'Zara Traders', '03001234567', 'Karachi', 25000, 25000, CURDATE()),
        ('CUST1002', 'Kamran Associates', '03009998888', 'Rawalpindi', 47000, 47000, CURDATE()),
        ('CUST1003', 'Al-Madina Store', '03111223344', 'Lahore', 15000, 15000, CURDATE()),
        ('CUST1004', 'Shaheen Traders', '03331234567', 'Islamabad', 35000, 35000, CURDATE()),
        ('CUST1005', 'Modern Furniture', '03451234567', 'Karachi', 50000, 50000, CURDATE())`);

    console.log('✅ All tables created!');
    console.log('📊 Sample customers added!');
}

// ============ API ROUTES ============

// Hardcoded Login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Hardcoded check first
    if ((username === 'admin' && password === 'admin123') || 
        (username === 'user' && password === 'user123')) {
        
        const role = username === 'admin' ? 'admin' : 'user';
        const fullName = username === 'admin' ? 'Administrator' : 'Staff User';
        
        res.json({
            success: true,
            token: 'mysql-token-' + Date.now(),
            user: { id: 1, username: username, fullName: fullName, role: role }
        });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

// Get all customers
app.get('/api/customers', (req, res) => {
    const { search, filter } = req.query;
    let sql = `SELECT * FROM customers WHERE 1=1`;
    let params = [];

    if (search && search.trim()) {
        sql += ` AND (name LIKE ? OR cnic LIKE ? OR phone LIKE ? OR city LIKE ? OR reference_name LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s, s, s);
    }
    if (filter === 'due') sql += ` AND remaining_due > 0`;
    if (filter === 'cleared') sql += ` AND remaining_due <= 0`;
    sql += ` ORDER BY id DESC`;

    db.query(sql, params, (err, rows) => {
        if (err) {
            console.error('DB Error:', err);
            res.json({ success: false, data: [] });
        } else {
            res.json({ success: true, data: rows });
        }
    });
});

// Get single customer
app.get('/api/customers/:id', (req, res) => {
    db.query(`SELECT * FROM customers WHERE id = ?`, [req.params.id], (err, rows) => {
        if (err) res.json({ success: false });
        else res.json({ success: true, data: rows[0] });
    });
});

// Add customer
app.post('/api/customers', (req, res) => {
    const c = req.body;
    const customer_id = 'CUST' + Date.now();
    const remaining_due = (c.due_amount || 0) - (c.total_paid || 0);

    db.query(`INSERT INTO customers (customer_id, name, cnic, phone, email, city, due_amount, total_paid, remaining_due, 
              address, reference_name, reference_contact, promise_date, business_co, colony, reason, photo_data, bill_photo_data, entry_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, c.name, c.cnic || '', c.phone || '', c.email || '', c.city,
         c.due_amount || 0, c.total_paid || 0, remaining_due, c.address || '',
         c.reference_name || '', c.reference_contact || '', c.promise_date || null,
         c.business_co || '', c.colony || '', c.reason || '', c.photo_data || null,
         c.bill_photo_data || null, c.entry_date || new Date().toISOString().split('T')[0]],
        (err, result) => {
            if (err) {
                console.error('Insert Error:', err);
                res.json({ success: false, message: err.message });
            } else {
                res.json({ success: true, id: result.insertId });
            }
        });
});

// Update customer (Edit)
app.put('/api/customers/:id', (req, res) => {
    const c = req.body;
    const remaining_due = (c.due_amount || 0) - (c.total_paid || 0);

    db.query(`UPDATE customers SET 
        name=?, cnic=?, phone=?, email=?, city=?, due_amount=?, total_paid=?, remaining_due=?,
        address=?, reference_name=?, reference_contact=?, promise_date=?, business_co=?, colony=?, reason=?,
        photo_data=?, bill_photo_data=?
        WHERE id = ?`,
        [c.name, c.cnic, c.phone, c.email, c.city, c.due_amount, c.total_paid, remaining_due,
         c.address, c.reference_name, c.reference_contact, c.promise_date, c.business_co, c.colony, c.reason,
         c.photo_data, c.bill_photo_data, req.params.id],
        (err) => {
            if (err) res.json({ success: false });
            else res.json({ success: true });
        });
});

// Add payment
app.post('/api/payments', (req, res) => {
    const { customerId, amount, paymentDate, paymentMethod, referenceNo, notes } = req.body;
    
    db.beginTransaction((err) => {
        if (err) return res.json({ success: false });
        
        db.query(`INSERT INTO payments (customer_id, amount, payment_date, payment_method, reference_no, notes) 
                  VALUES (?, ?, ?, ?, ?, ?)`, 
                  [customerId, amount, paymentDate, paymentMethod, referenceNo || '', notes || '']);
        
        db.query(`UPDATE customers SET 
                  total_paid = total_paid + ?, 
                  remaining_due = due_amount - (total_paid + ?)
                  WHERE id = ?`, [amount, amount, customerId]);
        
        db.commit((err) => {
            if (err) {
                db.rollback();
                res.json({ success: false });
            } else {
                res.json({ success: true });
            }
        });
    });
});

// Get statistics
app.get('/api/stats', (req, res) => {
    db.query(`SELECT 
        COUNT(*) as totalCustomers, 
        COALESCE(SUM(due_amount), 0) as totalAmount, 
        COALESCE(SUM(remaining_due), 0) as totalDue 
        FROM customers`, (err, rows) => {
        res.json({ success: true, data: rows[0] });
    });
});

// Get today's collections
app.get('/api/today-collections', (req, res) => {
    db.query(`SELECT p.*, c.name as customer_name 
              FROM payments p 
              JOIN customers c ON p.customer_id = c.id 
              WHERE DATE(p.payment_date) = CURDATE() 
              ORDER BY p.created_at DESC`, (err, rows) => {
        const total = (rows || []).reduce((s, r) => s + (r.amount || 0), 0);
        res.json({ success: true, data: rows || [], total: total });
    });
});

// Get reminders (promise date passed)
app.get('/api/reminders/today', (req, res) => {
    db.query(`SELECT c.id, c.name as customer_name, c.phone, c.remaining_due 
              FROM customers c 
              WHERE c.promise_date <= CURDATE() AND c.remaining_due > 0`, (err, rows) => {
        res.json({ success: true, data: rows || [] });
    });
});

// Update reminder sent (activity log)
app.put('/api/reminders/:id/sent', (req, res) => {
    // Just log the activity
    res.json({ success: true });
});

// Delete customer
app.delete('/api/customers/:id', (req, res) => {
    db.query(`DELETE FROM customers WHERE id = ?`, [req.params.id], (err) => {
        if (err) res.json({ success: false });
        else res.json({ success: true });
    });
});

// Export data
app.get('/api/export', (req, res) => {
    db.query(`SELECT * FROM customers ORDER BY id DESC`, (err, rows) => {
        res.json({ success: true, data: rows || [] });
    });
});

// Serve HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ═══════════════════════════════════════════════════════════
    🚀 MYSQL DATABASE SERVER STARTED!
    ═══════════════════════════════════════════════════════════
    📱 Open: http://localhost:${PORT}
    💾 Database: MySQL (fincollect_db)
    
    🔑 LOGIN CREDENTIALS:
    ───────────────────────────────────────────────────────────
    👑 Admin:  admin / admin123
    👤 Staff:  user / user123
    ───────────────────────────────────────────────────────────
    
    ✅ MySQL Status: ${db.state === 'authenticated' ? 'CONNECTED' : 'CHECKING...'}
    ═══════════════════════════════════════════════════════════
    `);
});