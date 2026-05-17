import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadLocalEnv } from "./services/load-local-env";

async function bootstrap() {
  loadLocalEnv();

  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env.OPS_API_PORT || 4010);

  await app.listen(port);
  console.log(`ops-api listening on http://localhost:${port}`);
}

void bootstrap();
