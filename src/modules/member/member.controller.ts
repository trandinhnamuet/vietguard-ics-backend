import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { SendOtpDto } from '../../dto/send-otp.dto';
import { VerifyOtpDto } from '../../dto/verify-otp.dto';
import { SubmitUserInfoDto } from '../../dto/submit-user-info.dto';
import { CreateMemberWithServiceDto } from '../../dto/create-member-with-service.dto';

@ApiTags('Members')
@Controller('api/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) { }

  @Post('send-otp')
  @ApiOperation({
    summary: 'Send OTP to email',
    description: 'Send 6-digit OTP to user email for verification',
  })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  async sendOtp(@Body(ValidationPipe) sendOtpDto: SendOtpDto) {
    return await this.memberService.sendOtp(sendOtpDto);
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP',
    description: 'Verify the 6-digit OTP sent to user email',
  })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyOtp(@Body(ValidationPipe) verifyOtpDto: VerifyOtpDto) {
    return await this.memberService.verifyOtp(verifyOtpDto);
  }

  @Post('submit-info')
  @ApiOperation({
    summary: 'Submit user information',
    description: 'Submit user information after OTP verification (full name, company, phone, note)',
  })
  @ApiResponse({ status: 200, description: 'User information saved successfully' })
  async submitUserInfo(@Body(ValidationPipe) submitUserInfoDto: SubmitUserInfoDto) {
    return await this.memberService.submitUserInfo(submitUserInfoDto);
  }

  @Post('create-with-service')
  @ApiOperation({
    summary: 'Create member with services',
    description: 'Create a new member and assign services (both local DB and external API)',
  })
  @ApiResponse({ status: 201, description: 'Member created successfully with services' })
  async createMemberWithService(@Body(ValidationPipe) createMemberDto: CreateMemberWithServiceDto) {
    return await this.memberService.createMemberWithService(createMemberDto);
  }

  @Get(':email')
  @ApiOperation({
    summary: 'Get member information',
    description: 'Get member information including verification history, services, and tasks',
  })
  @ApiResponse({ status: 200, description: 'Member information retrieved successfully' })
  async getMemberInfo(@Param('email') email: string) {
    return await this.memberService.getMemberInfo(email);
  }
}