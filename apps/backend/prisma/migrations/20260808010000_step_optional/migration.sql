-- step nullable: NULL = default per-unit (FE fallback: kg/liter -> 0.5, lainnya -> 1).
ALTER TABLE "products" ALTER COLUMN "step" DROP DEFAULT;
UPDATE "products" SET "step" = NULL WHERE "step" = 1;
