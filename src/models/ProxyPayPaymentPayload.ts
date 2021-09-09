interface ProxyPayPaymentPayload {
  transaction_id: number;
  terminal_type: string;
  terminal_transaction_id: number;
  terminal_location: null;
  terminal_id: string;
  reference_id: number;
  product_id: null;
  period_start_datetime: string;
  period_id: number;
  period_end_datetime: string;
  parameter_id: number;
  id: number;
  fee: string;
  entity_id: number;
  datetime: string;
  custom_fields: {
    user_id: string;
  };
  amount: string;
}

export default ProxyPayPaymentPayload;
