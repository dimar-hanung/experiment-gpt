import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const port = process.env.PORT || 3000;
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
  });
  app.use(compression());
  await app.listen(port);
}
bootstrap();
