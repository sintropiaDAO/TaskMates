// Safe columns to SELECT on the public.products table.
// Excludes `delivery_code` which is restricted at the database level.
// Use this constant instead of `*` so the queries do not fail with permission denied.
export const PRODUCT_SAFE_COLUMNS =
  'id,title,description,product_type,created_by,quantity,image_url,priority,location,reference_url,status,collective_use,upvotes,downvotes,created_at,updated_at';
