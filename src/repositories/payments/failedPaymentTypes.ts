export type FailedPaymentProps = {
  id: number;
  payment_id: string;
  customer_id: string;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
};
