import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminPassword) {
      throw new UnauthorizedException('Admin password is not configured on the server.');
    }

    const provided = request.headers['x-admin-password'];
    if (!provided || provided !== adminPassword) {
      throw new UnauthorizedException('Invalid admin password.');
    }

    return true;
  }
}
