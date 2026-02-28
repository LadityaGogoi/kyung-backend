import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import expressBasicAuth from 'express-basic-auth';
import { version } from '../package.json';

/**
 * Configures the NestJS application with CORS, logging, and Swagger documentation.
 *
 * - CORS origins and credentials are set from environment variables.
 * - Swagger docs are protected with basic auth (credentials from env vars).
 * - Swagger is only enabled outside production.
 *
 * @param app The NestJS application instance
 */
export function configureApp(app: INestApplication) {
  const configService = app.get(ConfigService);

  // Configure CORS - allow all origins for local development, restrict for other environments
  app.enableCors({
    origin: (origin, callback) => {
      const environment = configService.get<string>('ENVIRONMENT');
      // Allow all origins in local development (or when ENVIRONMENT is not set)
      if (
        !environment ||
        environment === 'development' ||
        environment === 'staging' ||
        environment === 'local'
      ) {
        return callback(null, true);
      }
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Check if origin matches allowed domain pattern (subdomains of your domain)
      const allowedDomain = configService.get<string>('CORS_ALLOWED_DOMAIN');
      if (allowedDomain) {
        const allowedDomainPattern = new RegExp(
          `^https?:\\/\\/([a-zA-Z0-9-]+\\.)?${allowedDomain.replace(/\./g, '\\.')}(:[0-9]+)?$`,
        );
        if (allowedDomainPattern.test(origin)) {
          return callback(null, true);
        }
      }

      // If CORS_ORIGIN is explicitly set in env, also allow that
      const corsOrigin = configService.get<string>('CORS_ORIGIN');
      if (corsOrigin && origin === corsOrigin) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Protect Swagger docs with basic auth (credentials from env)
  const swaggerUser = configService.get<string>('SWAGGER_USER') ?? 'admin';
  const swaggerPass = configService.get<string>('SWAGGER_PASS') ?? 'admin';
  app.use(
    ['/docs', '/docs-json'],
    expressBasicAuth({
      challenge: true,
      users: { [swaggerUser]: swaggerPass },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Kyung API')
    .setDescription('Ecommerce API')
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        name: 'JWT',
        in: 'header',
      },
      'access-token',
    )
    .addTag('app')
    .build();

  const environment = configService.get<string>('ENVIRONMENT');
  if (environment !== 'production') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Kyung API Docs',
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
      },
    });
  }
}
