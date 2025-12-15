import { Controller, Get, Post, Body, Query, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExternalApiService } from '../external-api.service';
import { CreateMemberDto } from '../dto/create-member.dto';
import { GetMembersDto } from '../dto/get-members.dto';
import { AssignServicesDto } from '../dto/assign-services.dto';

@ApiTags('Members')
@Controller('members')
export class MembersController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new member',
    description: 'Create a new member with specified services and limits for the authenticated dealer',
  })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  async createMember(@Body(ValidationPipe) createMemberDto: CreateMemberDto) {
    return await this.externalApiService.createMember(createMemberDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of members',
    description: 'Returns members for the current dealer',
  })
  @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
  async getMembers(@Query(ValidationPipe) getMembersDto: GetMembersDto) {
    return await this.externalApiService.getMembers(getMembersDto);
  }

  @Post('services')
  @ApiOperation({
    summary: 'Assign services to a member',
    description: 'Assign services to a member',
  })
  @ApiResponse({ status: 200, description: 'Services assigned successfully' })
  async assignServices(@Body(ValidationPipe) assignServicesDto: AssignServicesDto) {
    return await this.externalApiService.assignServices(assignServicesDto);
  }
}