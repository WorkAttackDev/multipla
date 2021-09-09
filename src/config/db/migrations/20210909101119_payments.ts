import { Knex } from "knex";
import { tablesName } from "../utils";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tablesName.payments, (table) => {
    table.increments();
    table.string("payment_id").notNullable().unique();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tablesName.payments);
}
