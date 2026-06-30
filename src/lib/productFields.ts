// Safe columns to SELECT on the public.products table.
// Excludes `delivery_code` which is restricted at the database level.
// Use this constant instead of `*` so the queries do not fail with permission denied.
export const PRODUCT_SAFE_COLUMNS =
  'id,title,description,product_type,created_by,quantity,image_url,priority,location,reference_url,status,collective_use,upvotes,downvotes,created_at,updated_at';

// Safe columns to SELECT on the public.product_participants table.
// Excludes `delivery_code_input` which is restricted at the database level
// (only writable via the confirm_product_delivery RPC).
export const PRODUCT_PARTICIPANT_SAFE_COLUMNS =
  'id,product_id,user_id,role,quantity,status,delivery_confirmed,delivery_proof_url,delivery_proof_type,created_at';
