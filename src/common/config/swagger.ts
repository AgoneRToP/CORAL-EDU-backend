import { DocumentBuilder } from '@nestjs/swagger';

export const config = new DocumentBuilder()
  .setTitle('TECH edu')
  .setDescription('Документация API с доступом уровня Super admin')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Использование токена JWT Super admin',
    },
    'accessToken',
  )
  .build();
