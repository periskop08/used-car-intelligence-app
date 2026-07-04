import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load root level environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS
  app.enableCors();

  // Configure validation pipe globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Configure Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Used Car Intelligence API')
    .setDescription('Used Car Intelligence application REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  console.log(`================================================================`);
  console.log(` API Service is running at: http://localhost:${port}`);
  console.log(` Swagger documentation is available at: http://localhost:${port}/docs`);
  console.log(` Healthcheck is available at: http://localhost:${port}/health`);
  console.log(`================================================================`);
}
bootstrap();
