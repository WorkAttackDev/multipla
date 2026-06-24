import { Knex } from "knex";
import { tablesName } from "../utils";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tablesName.payments, (table) => {
    table
      .enum("status", ["pending", "completed", "failed"])
      .notNullable()
      .defaultTo("pending");
  });

  await knex.schema.createTable(tablesName.failed_payments, (table) => {
    table.increments("id").primary();
    table.string("payment_id").notNullable();
    table.string("customer_id").notNullable();
    table.text("error_message");
    table.integer("retry_count").notNullable().defaultTo(0);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tablesName.failed_payments);
  await knex.schema.alterTable(tablesName.payments, (table) => {
    table.dropColumn("status");
  });
}
