const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// MySQL connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Manisha@2026",
    database: "inventory_management"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }
    console.log("MySQL connected successfully!");
});

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET all products
app.get("/api/products", (req, res) => {
    db.query("SELECT * FROM products ORDER BY product_id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ADD product
app.post("/api/products", (req, res) => {
    const { product_name, category, price, quantity, reorder_level } = req.body;

    const sql = `INSERT INTO products
        (product_name, category, price, quantity, reorder_level)
        VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [product_name, category, price, quantity, reorder_level], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product added successfully", id: result.insertId });
    });
});

// UPDATE product
app.put("/api/products/:id", (req, res) => {
    const { product_name, category, price, quantity, reorder_level } = req.body;

    const sql = `UPDATE products SET
        product_name = ?, category = ?, price = ?,
        quantity = ?, reorder_level = ?
        WHERE product_id = ?`;

    db.query(sql, [product_name, category, price, quantity, reorder_level, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product updated successfully" });
    });
});

// DELETE product
app.delete("/api/products/:id", (req, res) => {
    db.query("DELETE FROM products WHERE product_id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product deleted successfully" });
    });
});

// GET suppliers
app.get("/api/suppliers", (req, res) => {
    db.query("SELECT * FROM suppliers ORDER BY supplier_id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ADD supplier
app.post("/api/suppliers", (req, res) => {
    const { name, company, phone, email, address } = req.body;

    const sql = `INSERT INTO suppliers (name, company, phone, email, address)
                 VALUES (?, ?, ?, ?, ?)`;

    db.query(sql, [name, company, phone, email, address], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Supplier added successfully", id: result.insertId });
    });
});

// GET transactions
app.get("/api/transactions", (req, res) => {
    const sql = `
        SELECT t.*, p.product_name, s.name AS supplier_name
        FROM stock_transactions t
        JOIN products p ON t.product_id = p.product_id
        LEFT JOIN suppliers s ON t.supplier_id = s.supplier_id
        ORDER BY t.transaction_id DESC
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ADD purchase or sale transaction
app.post("/api/transactions", (req, res) => {
    const { product_id, supplier_id, transaction_type, quantity, transaction_date } = req.body;
    const qty = Number(quantity);

    if (!product_id || !["Purchase", "Sale"].includes(transaction_type) ||
        !Number.isInteger(qty) || qty <= 0 || !transaction_date) {
        return res.status(400).json({ error: "Please enter valid transaction details." });
    }

    if (transaction_type === "Purchase" && !supplier_id) {
        return res.status(400).json({ error: "Select a supplier for a purchase." });
    }

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(
            "SELECT quantity FROM products WHERE product_id = ? FOR UPDATE",
            [product_id],
            (err, results) => {
                if (err || results.length === 0) {
                    return db.rollback(() => res.status(err ? 500 : 404).json({
                        error: err ? err.message : "Product not found."
                    }));
                }

                const currentStock = Number(results[0].quantity);
                const newStock = transaction_type === "Purchase"
                    ? currentStock + qty
                    : currentStock - qty;

                if (newStock < 0) {
                    return db.rollback(() => res.status(400).json({
                        error: "Insufficient stock for this sale."
                    }));
                }

                db.query(
                    "UPDATE products SET quantity = ? WHERE product_id = ?",
                    [newStock, product_id],
                    (err) => {
                        if (err) {
                            return db.rollback(() => res.status(500).json({ error: err.message }));
                        }

                        const sql = `INSERT INTO stock_transactions
                            (product_id, supplier_id, transaction_type, quantity, transaction_date)
                            VALUES (?, ?, ?, ?, ?)`;

                        db.query(
                            sql,
                            [product_id, supplier_id || null, transaction_type, qty, transaction_date],
                            (err) => {
                                if (err) {
                                    return db.rollback(() => res.status(500).json({ error: err.message }));
                                }

                                db.commit((err) => {
                                    if (err) {
                                        return db.rollback(() => res.status(500).json({ error: err.message }));
                                    }

                                    res.json({ message: "Transaction completed successfully." });
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

// Dashboard summary
app.get("/api/dashboard", (req, res) => {
    const sql = `
        SELECT
            (SELECT COUNT(*) FROM products) AS totalProducts,
            (SELECT COUNT(*) FROM suppliers) AS totalSuppliers,
            (SELECT COALESCE(SUM(quantity), 0) FROM products) AS totalUnits,
            (SELECT COUNT(*) FROM products
             WHERE quantity <= reorder_level) AS lowStock
    `;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Inventory Management System running at http://localhost:${PORT}`);
});