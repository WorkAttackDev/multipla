import knexConfig from "./knexfile";
import Knex from "knex";
import { isProduction } from "../utils";

export const knex = Knex(
  isProduction ? knexConfig.production : knexConfig.development
);
