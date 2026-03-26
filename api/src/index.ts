import "dotenv/config";
import express from "express";
import { prisma } from "./db/prisma";
import { seed } from "./db/seed";
import usersRouter from "./routers/users";
import shoppingRouter from "./routers/shopping";
import feederRouter from "./routers/feeder";
import aiRouter from "./routers/ai";
import dashboardRouter from "./routers/dashboard";

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(express.json());

app.use("/users", usersRouter);
app.use("/shopping", shoppingRouter);
app.use("/feeder", feederRouter);
app.use("/ai", aiRouter);
app.use("/dashboard", dashboardRouter);

app.get("/", (_req, res) => res.json({ message: "API works" }));
app.get("/health", (_req, res) => res.json({ status: "oky" }));

async function main() {
  await seed();
  app.listen(PORT, () => console.log(`[server] Running on port ${PORT}`));
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
