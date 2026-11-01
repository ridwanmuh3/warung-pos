-- Normalise the Indonesian enum values written before the English API rename.
--
-- Run once, after backing up the database, in the same maintenance window as
-- the matching application deploy:
--
--   sqlite3 ... < drizzle/phase9-english-domain-values.sql
--
-- Idempotent: running it again changes nothing.

UPDATE products
SET category = CASE category
  WHEN 'makanan' THEN 'food'
  WHEN 'minuman' THEN 'drink'
  ELSE category
END
WHERE category IN ('makanan', 'minuman');

UPDATE orders
SET payment_method = CASE payment_method
  WHEN 'tunai' THEN 'cash'
  ELSE payment_method
END
WHERE payment_method = 'tunai';

UPDATE orders
SET channel = CASE channel
  WHEN 'bungkus' THEN 'takeaway'
  WHEN 'ojol' THEN 'delivery'
  ELSE channel
END
WHERE channel IN ('bungkus', 'ojol');
