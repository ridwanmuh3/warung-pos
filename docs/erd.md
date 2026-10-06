# ERD

Entity Relationship Diagram untuk database Warung POS. Sumber kebenaran: `src/db/schema.ts` (SQLite / libSQL, lewat Drizzle ORM).

## 1. Diagram

```mermaid
erDiagram
  users ||--o{ memberships : "punya"
  tenants ||--o{ memberships : "berisi"
  users ||--o{ orders : "membuat"
  users ||--o{ shifts : "menjalankan"
  users ||--o{ carts : "memiliki"

  tenants ||--o{ products : "memiliki katalog"
  tenants ||--o{ orders : "memiliki"
  tenants ||--o{ shifts : "memiliki"
  tenants ||--o{ counters : "menomori"
  tenants ||--o{ stock_movements : "mencatat"
  tenants ||--o{ carts : "memiliki"

  products ||--o{ stock_movements : "berubah"
  products |..o{ cart_items : "masuk"
  products |..o{ order_items : "dijual"

  orders ||--o{ order_items : "berisi"
  shifts |..o{ orders : "menaungi"
  carts ||--o{ cart_items : "berisi"
  carts |..o| orders : "menjadi"

  users {
    text id PK
    text name
    text email UK
    text password_hash
    text salt
    text created_at
  }

  tenants {
    text id PK
    text name
    text created_at
  }

  memberships {
    text id PK
    text tenant_id FK
    text user_id FK
    text role
    text created_at
  }

  products {
    text id PK
    text tenant_id FK
    text name
    integer price
    integer cost
    text category
    text emoji
    integer stock
    integer low_stock_threshold
    text sku
    text barcode
    text import_batch_id
    text created_at
    text updated_at
  }

  orders {
    text id PK
    text tenant_id FK
    text order_number
    text created_at
    integer subtotal
    integer discount
    integer total
    integer cost_total
    integer profit
    text payment_method
    integer amount_paid
    integer change
    text status
    text channel
    text cashier
    text shift_id
    text voided_at
    text void_reason
    text refunded_at
    text refund_reason
    text refunded_in_shift_id
    text user_id FK
    text cart_id
    text import_batch_id
  }

  order_items {
    text id PK
    text order_id FK
    text product_id
    text name
    text emoji
    integer price
    integer cost
    integer qty
  }

  shifts {
    text id PK
    text tenant_id FK
    text opened_at
    text closed_at
    integer opening_cash
    integer closing_cash
    integer expected_cash
    integer variance
    text note
    text user_id FK
    text import_batch_id
  }

  counters {
    text tenant_id PK
    text key PK
    integer value
  }

  stock_movements {
    text id PK
    text tenant_id FK
    text product_id FK
    integer delta
    text reason
    text at
    text order_id
    text import_batch_id
  }

  carts {
    text id PK
    text tenant_id FK
    text user_id FK
    text status
    text label
    text checked_out_at
    text created_at
    text updated_at
  }

  cart_items {
    text id PK
    text cart_id FK
    text product_id
    text name
    text emoji
    integer price
    integer cost
    integer qty
    text updated_at
  }
```

## 2. Tabel

| Tabel | Isi |
| ----- | --- |
| `users` | Identitas login global. Email unik. Menyimpan hash + salt PBKDF2, bukan password. |
| `tenants` | Satu toko. Semua baris bisnis milik tepat satu tenant. |
| `memberships` | Gabungan user dan tenant, plus role (`owner` / `manager` / `cashier`). Unik per (tenant, user). |
| `products` | Katalog: harga, HPP, stok, SKU, barcode. SKU/barcode unik per tenant. |
| `orders` | Satu penjualan: total, diskon, HPP, laba, status, kanal, kasir, shift, user, cart. |
| `order_items` | Baris pesanan. Menyimpan snapshot nama/harga/HPP saat penjualan. |
| `shifts` | Shift kas: modal awal, kas dihitung, kas seharusnya, selisih. |
| `counters` | Nomor pesanan monotonik per tenant. Kunci gabungan (tenant, key). |
| `stock_movements` | Jejak audit perubahan stok (`sale` / `restock` / `adjust` / `void` / `refund`). |
| `carts` | Keranjang sisi server. Status `open` / `parked` / `checked_out`. |
| `cart_items` | Baris keranjang, juga snapshot harga/HPP. |

## 3. Aturan

- **Uang = integer Rupiah.** Tidak pernah float.
- **Waktu = string ISO-8601.** Urut secara leksikografis, sama seperti kode laporan.
- **Snapshot baris.** `order_items` dan `cart_items` menyimpan nama/harga/HPP saat itu, sehingga edit katalog tidak mengubah riwayat.
- **Nomor pesanan dari `counters`.** Void atau hapus tidak pernah memakai ulang nomor.
- **Unik per tenant.** `products(tenant_id, sku)`, `products(tenant_id, barcode)`, dan `orders(tenant_id, order_number)`.
- **Cart sekali pakai.** `orders.cart_id` unik: satu keranjang menghasilkan paling banyak satu order, jadi retry checkout bisa menemukan order aslinya.

## 4. Catatan integritas

- `order_items.product_id`, `stock_movements.order_id`, dan `orders.shift_id` adalah referensi lunak (kolom teks tanpa foreign key). Nilainya tetap mengacu ke id terkait, tetapi tidak dijaga constraint database. Ini disengaja agar void/hapus tidak memblokir riwayat.
- `order_items` sengaja tidak memakai FK ke `products`: baris lama harus tetap ada walau produk dihapus.
- `products.tenant_id` dan `orders.tenant_id` nullable hanya untuk backfill migrasi; setiap penulisan lewat `data.server.ts` selalu mengisinya.
