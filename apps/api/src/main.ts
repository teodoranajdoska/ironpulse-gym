import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { isAllowedCorsOrigin } from './config/cors-origin';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());
  const configService = app.get(AppConfigService);
  const origins = configService.get('CORS_ORIGINS').split(',').map((origin) => origin.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedCorsOrigin(origin, origins, configService.get('NODE_ENV') === 'development')) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('IronPulse API')
    .setDescription('Gym platform API documentation')
    .setVersion('1.0')
    .addCookieAuth('ip_access')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get('PORT'));
}

bootstrap();
