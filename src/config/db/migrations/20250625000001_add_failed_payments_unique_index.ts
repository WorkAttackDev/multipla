import { Knex } from "knex";
import { tablesName } from "../utils";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DELETE fp1 FROM ${tablesName.failed_payments} fp1
    JOIN ${tablesName.failed_payments} fp2
      ON fp1.payment_id = fp2.payment_id
      AND fp1.id < fp2.id
  `);

  await knex.schema.alterTable(tablesName.failed_payments, (table) => {
    table.unique("payment_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tablesName.failed_payments, (table) => {
    table.dropUnique(["payment_id"]);
  });
}
