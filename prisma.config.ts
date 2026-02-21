import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        // For schema operations (db push, migrate), try transaction pooler (6543)
        // if session pooler (5432) doesn't work
        url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
    },
});
