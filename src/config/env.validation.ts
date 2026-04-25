import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // App
  PORT: Joi.number().default(3000),
  ENVIRONMENT: Joi.string()
    .valid('local', 'development', 'staging', 'production')
    .default('local'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),

  // Swagger (optional, defaults handled in app.config)
  SWAGGER_USER: Joi.string().default('admin'),
  SWAGGER_PASS: Joi.string().default('admin'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  // CORS (optional, only required in production)
  CORS_ALLOWED_DOMAIN: Joi.string().optional(),
  CORS_ORIGIN: Joi.string().optional(),

  // Docker Postgres (used by docker-compose, not the app directly)
  POSTGRES_USER: Joi.string().optional(),
  POSTGRES_PASSWORD: Joi.string().optional(),
  POSTGRES_DB: Joi.string().optional(),
  POSTGRES_PORT: Joi.number().optional(),
});
