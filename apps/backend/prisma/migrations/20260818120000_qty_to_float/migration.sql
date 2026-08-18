-- products
ALTER TABLE "products" ALTER COLUMN "stock" TYPE DOUBLE PRECISION USING "stock"::double precision;
ALTER TABLE "products" ALTER COLUMN "minStock" TYPE DOUBLE PRECISION USING "minStock"::double precision;
ALTER TABLE "products" ALTER COLUMN "step" TYPE DOUBLE PRECISION USING "step"::double precision;

-- transaction_items
ALTER TABLE "transaction_items" ALTER COLUMN "qty" TYPE DOUBLE PRECISION USING "qty"::double precision;

-- inventory_adjustments
ALTER TABLE "inventory_adjustments" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::double precision;
