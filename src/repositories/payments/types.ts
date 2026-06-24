export type PaymentProps = {
  id: number;
  payment_id: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
};
