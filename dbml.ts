import { sqliteGenerate } from "drizzle-dbml-generator";

import * as schema from "./src/db/schema";

const out = "./src/db/schema.dbml";
const relational = true;

sqliteGenerate({ schema, out, relational });
