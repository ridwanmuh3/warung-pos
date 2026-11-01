-- Phase 9: normalise pre-rename Indonesian enum domain values to English.
-- Idempoten (running again changes nothing). Must run on production in
-- the same maintenance window as the deploy that adopts the English routes/API.
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
