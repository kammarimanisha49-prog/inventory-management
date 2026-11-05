const API = "/api";

// Common API function
async function apiRequest(url, options = {}) {
    const response = await fetch(API + url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
    }

    return data;
}

// Display messages
function showMessage(id, message, success = true) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = message;
    element.style.color = success ? "green" : "red";
}

// Safe HTML display
function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// DASHBOARD
async function loadDashboard() {
    try {
        const data = await apiRequest("/dashboard");

        document.getElementById("totalProducts").textContent = data.totalProducts;
        document.getElementById("totalSuppliers").textContent = data.totalSuppliers;
        document.getElementById("totalUnits").textContent = data.totalUnits;
        document.getElementById("lowStock").textContent = data.lowStock;

        const products = await apiRequest("/products");

        document.getElementById("dashboardProducts").innerHTML = products.map(p => `
            <tr>
                <td>${p.product_id}</td>
                <td>${safe(p.product_name)}</td>
                <td>${safe(p.category)}</td>
                <td>₹${Number(p.price).toFixed(2)}</td>
                <td>${p.quantity}</td>
                <td>${p.reorder_level}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error(error);
    }
}

// PRODUCTS
async function loadProducts() {
    try {
        const products = await apiRequest("/products");

        const table = document.getElementById("productsTable");

        if (!table) return;

        table.innerHTML = products.map(p => `
            <tr>
                <td>${p.product_id}</td>
                <td>${safe(p.product_name)}</td>
                <td>${safe(p.category)}</td>
                <td>₹${Number(p.price).toFixed(2)}</td>
                <td>${p.quantity}</td>
                <td>${p.reorder_level}</td>
                <td>
                    <button class="edit" onclick="editProduct(${p.product_id})">Edit</button>
                    <button class="delete" onclick="deleteProduct(${p.product_id})">Delete</button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        showMessage("productMessage", error.message, false);
    }
}

// ADD OR UPDATE PRODUCT
const productForm = document.getElementById("productForm");

if (productForm) {
    productForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const id = document.getElementById("productId").value;

        const product = {
            product_name: document.getElementById("productName").value.trim(),
            category: document.getElementById("category").value.trim(),
            price: Number(document.getElementById("price").value),
            quantity: Number(document.getElementById("quantity").value),
            reorder_level: Number(document.getElementById("reorderLevel").value)
        };

        try {
            await apiRequest(id ? `/products/${id}` : "/products", {
                method: id ? "PUT" : "POST",
                body: JSON.stringify(product)
            });

            showMessage("productMessage", id ? "Product updated successfully!" : "Product added successfully!");

            resetProductForm();
            await loadProducts();

        } catch (error) {
            showMessage("productMessage", error.message, false);
        }
    });
}

// EDIT PRODUCT
async function editProduct(id) {
    try {
        const products = await apiRequest("/products");
        const product = products.find(p => p.product_id === id);

        if (!product) return;

        document.getElementById("productId").value = product.product_id;
        document.getElementById("productName").value = product.product_name;
        document.getElementById("category").value = product.category;
        document.getElementById("price").value = product.price;
        document.getElementById("quantity").value = product.quantity;
        document.getElementById("reorderLevel").value = product.reorder_level;

        document.getElementById("productSubmit").textContent = "Update Product";
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        showMessage("productMessage", error.message, false);
    }
}

// RESET PRODUCT FORM
function resetProductForm() {
    const form = document.getElementById("productForm");
    if (!form) return;

    form.reset();
    document.getElementById("productId").value = "";
    document.getElementById("productSubmit").textContent = "Add Product";
}

// DELETE PRODUCT
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
        await apiRequest(`/products/${id}`, { method: "DELETE" });
        showMessage("productMessage", "Product deleted successfully!");
        await loadProducts();

    } catch (error) {
        showMessage("productMessage", error.message, false);
    }
}

// SUPPLIERS
async function loadSuppliers() {
    try {
        const suppliers = await apiRequest("/suppliers");
        const table = document.getElementById("suppliersTable");

        if (table) {
            table.innerHTML = suppliers.map(s => `
                <tr>
                    <td>${s.supplier_id}</td>
                    <td>${safe(s.name)}</td>
                    <td>${safe(s.company)}</td>
                    <td>${safe(s.phone)}</td>
                    <td>${safe(s.email)}</td>
                    <td>${safe(s.address)}</td>
                </tr>
            `).join("");
        }

        const select = document.getElementById("transactionSupplier");

        if (select) {
            select.innerHTML = '<option value="">Select Supplier</option>';

            suppliers.forEach(s => {
                select.innerHTML += `
                    <option value="${s.supplier_id}">${safe(s.name)} - ${safe(s.company)}</option>
                `;
            });
        }

    } catch (error) {
        showMessage("supplierMessage", error.message, false);
    }
}

// ADD SUPPLIER
const supplierForm = document.getElementById("supplierForm");

if (supplierForm) {
    supplierForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const supplier = {
            name: document.getElementById("supplierName").value.trim(),
            company: document.getElementById("company").value.trim(),
            phone: document.getElementById("phone").value.trim(),
            email: document.getElementById("email").value.trim(),
            address: document.getElementById("address").value.trim()
        };

        try {
            await apiRequest("/suppliers", {
                method: "POST",
                body: JSON.stringify(supplier)
            });

            showMessage("supplierMessage", "Supplier added successfully!");
            supplierForm.reset();
            await loadSuppliers();

        } catch (error) {
            showMessage("supplierMessage", error.message, false);
        }
    });
}

// TRANSACTION PRODUCT OPTIONS
async function loadTransactionOptions() {
    try {
        const products = await apiRequest("/products");
        const select = document.getElementById("transactionProduct");

        if (!select) return;

        select.innerHTML = '<option value="">Select Product</option>';

        products.forEach(p => {
            select.innerHTML += `
                <option value="${p.product_id}">
                    ${safe(p.product_name)} (Stock: ${p.quantity})
                </option>
            `;
        });

    } catch (error) {
        showMessage("transactionMessage", error.message, false);
    }
}

// LOAD TRANSACTIONS
async function loadTransactions() {
    try {
        const transactions = await apiRequest("/transactions");
        const table = document.getElementById("transactionsTable");

        if (!table) return;

        table.innerHTML = transactions.map(t => `
            <tr>
                <td>${t.transaction_id}</td>
                <td>${safe(t.product_name)}</td>
                <td>${safe(t.supplier_name || "-")}</td>
                <td>${safe(t.transaction_type)}</td>
                <td>${t.quantity}</td>
                <td>${safe(t.transaction_date)}</td>
            </tr>
        `).join("");

    } catch (error) {
        showMessage("transactionMessage", error.message, false);
    }
}

// ADD TRANSACTION
const transactionForm = document.getElementById("transactionForm");

if (transactionForm) {
    const dateInput = document.getElementById("transactionDate");
    dateInput.value = new Date().toLocaleDateString("en-CA");

    transactionForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const transaction = {
            product_id: document.getElementById("transactionProduct").value,
            transaction_type: document.getElementById("transactionType").value,
            supplier_id: document.getElementById("transactionSupplier").value || null,
            quantity: Number(document.getElementById("transactionQuantity").value),
            transaction_date: dateInput.value
        };

        try {
            await apiRequest("/transactions", {
                method: "POST",
                body: JSON.stringify(transaction)
            });

            showMessage("transactionMessage", "Transaction completed successfully!");
            transactionForm.reset();
            dateInput.value = new Date().toLocaleDateString("en-CA");

            await loadTransactionOptions();
            await loadTransactions();

        } catch (error) {
            showMessage("transactionMessage", error.message, false);
        }
    });
}

// LOAD DATA BASED ON CURRENT PAGE
if (document.getElementById("dashboardProducts")) {
    loadDashboard();
}

if (document.getElementById("productsTable")) {
    loadProducts();
}

if (document.getElementById("suppliersTable")) {
    loadSuppliers();
}

if (document.getElementById("transactionsTable")) {
    loadTransactionOptions();
    loadSuppliers();
    loadTransactions();
}