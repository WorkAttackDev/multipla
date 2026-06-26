import { Knex } from "knex";
import { tablesName } from "../utils";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tablesName.failed_payments, (table) => {
    table.unique("payment_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tablesName.failed_payments, (table) => {
    table.dropUnique(["payment_id"]);
  });
}
