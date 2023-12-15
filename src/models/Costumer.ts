import { z } from "zod";

export const simpleCostumerSchema = z.object({
  id: z.string(),
  login: z.string(),
});

export type SimpleCostumerType = z.infer<typeof simpleCostumerSchema>;

export type CostumerType = {
  id: string;
  billing_type: string;
  partner_id: string;
  location_id: string;
  added_by: string;
  added_by_id: string;
  login: string;
  category: string;
  name: string;
  email: string;
  billing_email: string;
  phone: string;
  street_1: string;
  zip_code: string;
  city: string;
  status: string;
  date_add: string;
  last_online: string;
  last_update: string;
  daily_prepaid_cost: string | null;
  gps: string | null;
  conversion_date: string;
  street_2: string;
  additional_attributes: {
    bank_account: string;
    connected_by: string;
    contract_id: string;
    custom_status: string;
    end_contract: string;
    management_ip: string;
    own_router: string;
  };
};
