-- Switch billing provider from Stripe to Paddle.
-- Rename the customer-id column; the value space is provider-specific so any
-- existing Stripe ids should be cleared on cutover (handled out of band).

ALTER TABLE profiles RENAME COLUMN stripe_customer_id TO paddle_customer_id;
