import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly configService: ConfigService) {}

  @Post('verify-password')
  @ApiOperation({ summary: 'Verify admin password' })
  @ApiResponse({ status: 200, description: 'Password is correct' })
  @ApiResponse({ status: 401, description: 'Invalid password' })
  verifyPassword(@Body('password') password: string) {
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!adminPassword) {
      throw new UnauthorizedException('Admin password is not configured on the server.');
    }

    if (!password || password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin password.');
    }

    return { ok: true };
  }
}
