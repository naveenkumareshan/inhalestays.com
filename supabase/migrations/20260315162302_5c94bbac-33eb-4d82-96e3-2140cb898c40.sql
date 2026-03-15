-- Add Razorpay columns to mess_subscriptions
ALTER TABLE public.mess_subscriptions 
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
  ADD COLUMN IF NOT EXISTS razorpay_signature text;

-- Add INSERT policy on mess_receipts for authenticated users
CREATE POLICY "Users can insert own mess receipts"
  ON public.mess_receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also ensure students can insert their own mess_subscriptions
CREATE POLICY "Users can insert own mess subscriptions"
  ON public.mess_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());