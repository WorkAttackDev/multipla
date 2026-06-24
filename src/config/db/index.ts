import knexConfig from "./knexfile";
import Knex from "knex";

export const knex = Knex(knexConfig);

knex.on("query-error", (error) => {
  console.error("[db] query error", error);
});
