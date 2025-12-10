import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppDataSource } from '../data-source';

async function bootstrap() {
  try {
    // Initialize database connection
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connection established successfully');

    // Run pending migrations manually
    console.log('Checking for pending migrations...');
    const pendingMigrations = await AppDataSource.showMigrations();
    
    if (pendingMigrations) {
      console.log('Running migrations...');
      await AppDataSource.runMigrations();
      console.log('All migrations executed successfully');
    } else {
      console.log('No pending migrations found');
    }

    // Create NestJS application
    console.log('Starting NestJS application...');
    const app = await NestFactory.create(AppModule);
    
    // Enable CORS for all origins
    app.enableCors({
      origin: '*',
      credentials: false,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type,Authorization',
    });
    
    // Start the application
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Application is running on port ${port}`);
    console.log('CORS enabled for all origins');
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Try to close database connection if it exists
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    
    process.exit(1);
  }
}

bootstrap();
