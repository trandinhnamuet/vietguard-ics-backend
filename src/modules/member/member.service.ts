import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Member } from '../../entities/member.entity';
import { MemberVerification } from '../../entities/member-verification.entity';
import { MemberService as MemberServiceEntity } from '../../entities/member-service.entity';
import { AppTotalGoTask } from '../../entities/app-total-go-task.entity';
import { DownloadToken } from '../../entities/download-token.entity';
import { ExternalApiService } from '../external-api/external-api.service';
import { AccessLogService } from '../access-log/access-log.service';
import { SendOtpDto } from '../../dto/send-otp.dto';
import { VerifyOtpDto } from '../../dto/verify-otp.dto';
import { SubmitUserInfoDto } from '../../dto/submit-user-info.dto';
import { CreateMemberWithServiceDto } from '../../dto/create-member-with-service.dto';
import { CreateTaskDto } from '../../dto/create-task.dto';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class MemberService {
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(Member)
    private readonly memberRepo: Repository<Member>,
    @InjectRepository(MemberVerification)
    private readonly verificationRepo: Repository<MemberVerification>,
    @InjectRepository(MemberServiceEntity)
    private readonly memberServiceRepo: Repository<MemberServiceEntity>,
    @InjectRepository(AppTotalGoTask)
    private readonly taskRepo: Repository<AppTotalGoTask>,
    @InjectRepository(DownloadToken)
    private readonly downloadTokenRepo: Repository<DownloadToken>,
    private readonly externalApiService: ExternalApiService,
    private readonly accessLogService: AccessLogService,
  ) {
    // Initialize email transporter with SMTP config from environment
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Generate random 6-digit OTP
   */
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create download token for task (valid for 7 days)
   */
  private async createDownloadToken(taskId: string): Promise<string> {
    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days

    const downloadToken = this.downloadTokenRepo.create({
      task_id: taskId,
      token: token,
      expires_at: expiresAt,
      used: false,
    });

    await this.downloadTokenRepo.save(downloadToken);
    return token;
  }

  /**
   * Get OTP expiration time in milliseconds (from environment or default 10 minutes)
   */
  private getOtpExpirationTime(): number {
    const expirationSeconds = parseInt(process.env.OTP_EXPIRATION_TIME || '600', 10);
    return expirationSeconds * 1000; // Convert to milliseconds
  }

  /**
   * Send OTP to email (real implementation using nodemailer)
   */
  private async sendEmailOtp(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'VietGuardScan - Mã xác thực OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Xác thực VietGuardScan</h2>
            <p style="color: #666; font-size: 16px;">Mã xác thực OTP của bạn là:</p>
            <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
              <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</h1>
            </div>
            <p style="color: #999; font-size: 14px;">Mã này có hiệu lực trong 10 phút.</p>
            <p style="color: #999; font-size: 14px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">© 2024 VietGuardScan. All rights reserved.</p>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`OTP sent successfully to ${email}`);
    } catch (error) {
      console.error(`Failed to send OTP to ${email}:`, error);
      throw new BadRequestException('Failed to send OTP email');
    }
  }

  /**
   * Send report email with PDF attachment
   */
  async sendReportEmail(params: {
    to: string;
    taskId: string;
    fileName: string;
    fileBuffer: Buffer;
    contentType: string;
  }): Promise<void> {
    const { to, taskId, fileName, fileBuffer, contentType } = params;

    try {
      // Create secure download token
      const downloadToken = await this.createDownloadToken(taskId);
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      const downloadUrl = `${baseUrl}/api/service/app-total-go/download/${downloadToken}`;

      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: to,
        subject: `VietGuardScan - Báo cáo quét hoàn tất (Task ID: ${taskId})`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
                .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
                .content h2 { color: #1f2937; margin-top: 0; font-size: 22px; }
                .info-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .info-row { margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
                .info-row:last-child { border-bottom: none; }
                .label { font-weight: 600; color: #4b5563; display: inline-block; min-width: 140px; }
                .value { color: #1f2937; }
                .status { color: #10b981; font-weight: 600; }
                .file-name { color: #667eea; font-weight: 500; word-break: break-all; }
                .button-container { text-align: center; margin: 35px 0 25px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); transition: transform 0.2s; }
                .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4); }
                .note { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; color: #1e40af; font-size: 14px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
                .footer p { margin: 5px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🛡️ VietGuardScan</h1>
                  <p>Báo cáo quét hoàn tất</p>
                </div>
                <div class="content">
                  <h2>Kết quả quét của bạn đã sẵn sàng!</h2>
                  <p>Xin chào,</p>
                  <p>Quá trình quét bảo mật của bạn đã hoàn tất thành công. Báo cáo chi tiết được đính kèm trong email này.</p>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="label">Task ID:</span>
                      <span class="value">${taskId}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Tên file báo cáo:</span>
                      <span class="file-name">${fileName}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Trạng thái:</span>
                      <span class="status">✓ Hoàn thành</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Kích thước file:</span>
                      <span class="value">${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>

                  <div class="note">
                    📎 <strong>File đính kèm:</strong> ${fileName}<br/>
                    <small style="color: #6b7280; margin-top: 5px; display: block;">Bạn có thể mở file trực tiếp từ phần đính kèm email hoặc tải về qua link bên dưới.</small>
                  </div>

                  <p>Báo cáo chứa kết quả phân tích bảo mật toàn diện. Vui lòng xem xét kỹ các thông tin trong báo cáo.</p>
                  
                  <div class="button-container">
                    <a href="${downloadUrl}" class="button" target="_blank">📥 Tải về báo cáo</a>
                  </div>
                  
                  <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px;">
                    <small>⏰ Link tải có hiệu lực trong 7 ngày. Chỉ người nhận email này mới có thể tải báo cáo.</small>
                  </p>
                  
                  <div class="footer">
                    <p>Đây là email tự động từ VietGuardScan</p>
                    <p>© 2025 VietGuardScan. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
            contentType: contentType,
          },
        ],
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Report email sent successfully to ${to} for task ${taskId}`);
    } catch (error) {
      console.error(`Failed to send report email to ${to}:`, error);
      throw new BadRequestException('Failed to send report email');
    }
  }

  /**
   * Send error notification email when scan fails
   */
  async sendErrorEmail(params: {
    to: string;
    taskId: string;
  }): Promise<void> {
    const { to, taskId } = params;

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: to,
        subject: `VietGuardScan - Quét không thành công (Task ID: ${taskId})`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
                .content { background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
                .content h2 { color: #1f2937; margin-top: 0; font-size: 22px; }
                .error-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .info-row { margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #fee2e2; }
                .info-row:last-child { border-bottom: none; }
                .label { font-weight: 600; color: #4b5563; display: inline-block; min-width: 140px; }
                .value { color: #1f2937; }
                .status { color: #ef4444; font-weight: 600; }
                .note { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; color: #92400e; font-size: 14px; }
                .button-container { text-align: center; margin: 35px 0 25px 0; }
                .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); transition: transform 0.2s; }
                .button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4); }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
                .footer p { margin: 5px 0; }
                .support { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; }
                .support h3 { margin-top: 0; color: #1f2937; font-size: 18px; }
                .support p { margin: 8px 0; color: #4b5563; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>⚠️ VietGuardScan</h1>
                  <p>Thông báo quét không thành công</p>
                </div>
                <div class="content">
                  <h2>Đã có lỗi xảy ra trong quá trình quét</h2>
                  <p>Xin chào,</p>
                  <p>Rất tiếc, quá trình quét bảo mật của bạn không thể hoàn thành do file APK của bạn có vấn đề về cấu trúc hoặc chưa có chữ ký.</p>
                  
                  <div class="error-box">
                    <div class="info-row">
                      <span class="label">Task ID:</span>
                      <span class="value">${taskId}</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Trạng thái:</span>
                      <span class="status">✗ Quét không thành công</span>
                    </div>
                    <div class="info-row">
                      <span class="label">Lý do:</span>
                      <span class="value">File APK sai cấu trúc hoặc chưa có chữ ký</span>
                    </div>
                  </div>

                  <div class="note">
                    ⚠️ <strong>Nguyên nhân có thể:</strong><br/>
                    • File APK không đúng định dạng<br/>
                    • File APK bị hỏng hoặc không hoàn chỉnh<br/>
                    • File APK chưa được ký (unsigned APK)<br/>
                    • File không phải là file APK hợp lệ
                  </div>

                  <div class="support">
                    <h3>🔧 Hướng dẫn khắc phục:</h3>
                    <p><strong>1.</strong> Kiểm tra lại file APK của bạn có đúng định dạng và hoàn chỉnh không</p>
                    <p><strong>2.</strong> Đảm bảo file APK đã được ký (signed APK)</p>
                    <p><strong>3.</strong> Thử build lại file APK từ source code</p>
                    <p><strong>4.</strong> Upload lại file APK mới và thử quét lại</p>
                  </div>
                  
                  <div class="button-container">
                    <a href="https://vietguardscan.icss.com.vn" class="button">🔄 Thử quét lại</a>
                  </div>

                  <p style="margin-top: 30px;">Nếu bạn cần hỗ trợ thêm, vui lòng liên hệ với chúng tôi qua email hoặc hotline.</p>
                  
                  <div class="footer">
                    <p><strong>Hỗ trợ:</strong> support@vietguardscan.com | <strong>Hotline:</strong> 1900-xxxx</p>
                    <p>Đây là email tự động từ VietGuardScan</p>
                    <p>© 2025 VietGuardScan. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Error notification email sent successfully to ${to} for task ${taskId}`);
    } catch (error) {
      console.error(`Failed to send error email to ${to}:`, error);
      throw new BadRequestException('Failed to send error notification email');
    }
  }

  /**
   * Send OTP for verification
   */
  async sendOtp(sendOtpDto: SendOtpDto): Promise<{ message: string }> {
    const { email } = sendOtpDto;

    // Find or create member
    let member = await this.memberRepo.findOne({ where: { name: email } });
    if (!member) {
      member = this.memberRepo.create({
        name: email,
        email: email,
      });
      await this.memberRepo.save(member);
    }

    // Generate and save OTP
    const otp = this.generateOtp();
    const expirationTime = this.getOtpExpirationTime();
    const expiresAt = new Date(Date.now() + expirationTime);

    const verification = this.verificationRepo.create({
      member_id: member.id,
      otp: otp,
      otp_verified: false,
      otp_expires_at: expiresAt,
    });

    await this.verificationRepo.save(verification);

    // Send OTP via email
    await this.sendEmailOtp(email, otp);

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ message: string; verified: boolean }> {
    const { email, otp, ipv4, ipv6 } = verifyOtpDto;

    const member = await this.memberRepo.findOne({ where: { name: email } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Find the most recent unverified OTP
    const verification = await this.verificationRepo.findOne({
      where: {
        member_id: member.id,
        otp: otp,
        otp_verified: false
      },
      order: { created_at: 'DESC' }
    });

    if (!verification) {
      throw new BadRequestException('Invalid OTP');
    }

    // Check if OTP is expired
    const now = new Date();
    if (verification.otp_expires_at && now > verification.otp_expires_at) {
      throw new BadRequestException('OTP expired');
    }

    // Mark as verified
    verification.otp_verified = true;
    await this.verificationRepo.save(verification);

    // Update email in access logs for this IP
    if (ipv4 || ipv6) {
      try {
        await this.accessLogService.updateEmailByIp(ipv4, ipv6, email);
      } catch (error) {
        console.error('Failed to update email in access logs:', error);
        // Don't throw error, just log it - OTP verification was successful
      }
    }

    return { message: 'OTP verified successfully', verified: true };
  }

  /**
   * Submit user information after OTP verification
   */
  async submitUserInfo(submitUserInfoDto: SubmitUserInfoDto): Promise<{ message: string }> {
    const { email, otp, full_name, company_name, phone, note, file_name, file_size } = submitUserInfoDto;

    const member = await this.memberRepo.findOne({ where: { name: email } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Find the verified OTP record
    const verification = await this.verificationRepo.findOne({
      where: {
        member_id: member.id,
        otp: otp,
        otp_verified: true
      },
      order: { created_at: 'DESC' }
    });

    if (!verification) {
      throw new BadRequestException('OTP not verified or invalid');
    }

    // Update verification record with user information
    verification.full_name = full_name;
    verification.company_name = company_name;
    if (phone) verification.phone = phone;
    if (note) verification.note = note;
    if (file_name) verification.file_name = file_name;
    if (file_size) verification.file_size = file_size;

    await this.verificationRepo.save(verification);

    return { message: 'User information saved successfully' };
  }

  /**
   * Create member with services (both local DB and external API)
   */
  async createMemberWithService(createMemberDto: CreateMemberWithServiceDto): Promise<any> {
    const { email, services } = createMemberDto;

    // Check if member exists
    let member = await this.memberRepo.findOne({ where: { name: email } });
    if (!member) {
      throw new BadRequestException('Member does not exist. Please send OTP and verify first.');
    }

    // Check if OTP has been verified
    const verification = await this.verificationRepo.findOne({
      where: {
        member_id: member.id,
        otp_verified: true,
      },
      order: { created_at: 'DESC' }
    });

    if (!verification) {
      throw new ForbiddenException('Email has not been verified. Please verify OTP and submit user info first.');
    }

    // Check if member already exists in external system
    if (member.external_id) {
      console.log(`Member already exists in external system with ID: ${member.external_id}`);
    } else {
      // Log payload trước khi gọi external API
      const payload = {
        name: `Guest${member.id}`,
        services: services,
      };
      console.log('Payload gửi external API:', JSON.stringify(payload));
      try {
        const externalResponse = await this.externalApiService.createMember(payload);
        console.log('External member creation response:', externalResponse);

        // Save external ID if returned
        if (externalResponse && externalResponse.data && externalResponse.data.id) {
          member.external_id = externalResponse.data.id.toString();
          await this.memberRepo.save(member);
          console.log(`Member created in external system with ID: ${member.external_id}`);
        }
      } catch (error) {
        console.error('Failed to create member in external system:', error);
        // Continue with local creation even if external fails
      }
    }

    // Save services locally
    for (const service of services) {
      const memberService = this.memberServiceRepo.create({
        member_id: member.id,
        service_type: service.serviceType,
      });
      await this.memberServiceRepo.save(memberService);
    }

    let res = {
      message: 'Member created successfully with services',
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        services: services
      }
    };

    console.log(res)

    return {
      message: 'Member created successfully with services',
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        services: services
      }
    };
  }

  /**
   * Check if member can scan (rate limiting: max 3 times per hour)
   */
  async canScan(memberName: string): Promise<boolean> {
    const member = await this.memberRepo.findOne({ where: { name: memberName } });
    if (!member) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const taskCount = await this.taskRepo.count({
      where: {
        member_id: member.id,
        created_at: MoreThan(oneHourAgo),
      },
    });

    return taskCount < 3;
  }

  /**
   * Create AppTotalGo task with rate limiting
   */
  async createTask(createTaskDto: CreateTaskDto, file: any): Promise<any> {
    const { memberName, clientIp } = createTaskDto;

    // Check rate limiting
    const canScan = await this.canScan(memberName);
    if (!canScan) {
      throw new ForbiddenException('Scan quá nhiều, hãy thử lại sau hoặc liên hệ với chúng tôi.');
    }

    const member = await this.memberRepo.findOne({ where: { name: memberName } });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Create task in local DB first
    const task = this.taskRepo.create({
      member_id: member.id,
      file_name: file.originalname,
      status: 'pending',
    });
    await this.taskRepo.save(task);

    // Call external API
    try {
      const externalResponse = await this.externalApiService.createAppTotalGo({
        memberName: `Guest${member.id}`, // Use same format as createMemberWithService
        clientIp: clientIp,
        file: file
      }, file);

      // Update task with external response
      if (externalResponse && externalResponse.data && externalResponse.data.id) {
        task.external_task_id = externalResponse.data.id.toString();
        task.status = 'submitted';
        await this.taskRepo.save(task);
      }

      return {
        message: 'Task created successfully',
        taskId: task.id,
        externalTaskId: task.external_task_id,
        status: task.status
      };
    } catch (error) {
      // Update local task status to failed
      task.status = 'failed';
      await this.taskRepo.save(task);

      throw new BadRequestException('Failed to create task in external system');
    }
  }

  /**
   * Get member information and verification history
   */
  async getMemberInfo(email: string): Promise<any> {
    const member = await this.memberRepo.findOne({
      where: { name: email },
      relations: ['verifications', 'services', 'tasks']
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      external_id: member.external_id,
      verifications: member.verifications,
      services: member.services,
      tasks: member.tasks,
      created_at: member.created_at,
      updated_at: member.updated_at
    };
  }

  /**
   * Get all member verifications with member email
   */
  async getAllMemberVerifications(): Promise<any[]> {
    const verifications = await this.verificationRepo.find({
      relations: ['member'],
      order: {
        created_at: 'DESC'
      }
    });

    return verifications.map(verification => ({
      id: verification.id,
      full_name: verification.full_name,
      phone: verification.phone,
      company_name: verification.company_name,
      note: verification.note,
      file_name: verification.file_name,
      file_size: verification.file_size,
      member_email: verification.member?.email || verification.member?.name,
      created_at: verification.created_at
    }));
  }
}