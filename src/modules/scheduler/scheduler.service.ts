import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppTotalGoTask } from '../../entities/app-total-go-task.entity';
import { ExternalApiService } from '../external-api/external-api.service';
import { MemberService } from '../member/member.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(AppTotalGoTask)
    private readonly taskRepo: Repository<AppTotalGoTask>,
    private readonly externalApiService: ExternalApiService,
    private readonly memberService: MemberService,
  ) {}

  /**
   * Check pending tasks every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkPendingTasks() {
    const startTime = Date.now();
    this.logger.log('=== CHECKING PENDING TASKS ===');

    try {
      // First, log all tasks to see their actual status
      const allTasks = await this.taskRepo.find({
        relations: ['member'],
      });
      
      this.logger.log(`[DEBUG] Total tasks in DB: ${allTasks.length}`);
      allTasks.forEach((task) => {
        this.logger.log(`[DEBUG] Task ${task.external_task_id}: status='${task.status}', member=${task.member?.email || task.member?.name}`);
      });

      // Find all tasks that are InProgress (still scanning)
      const pendingTasks = await this.taskRepo.find({
        where: [
          { status: 'InProgress' },
        ],
        relations: ['member'],
      });

      const duration = Date.now() - startTime;
      this.logger.log(`[DB QUERY] Found ${pendingTasks.length} InProgress tasks (took ${duration}ms)`);

      if (pendingTasks.length === 0) {
        this.logger.log('[SKIP] No InProgress tasks to check');
        return;
      }

      // Check each task
      for (const task of pendingTasks) {
        await this.checkAndProcessTask(task);
      }

      const totalDuration = Date.now() - startTime;
      this.logger.log(`[COMPLETE] Finished checking all tasks (total time: ${totalDuration}ms)`);
    } catch (error) {
      this.logger.error('[ERROR] Error checking pending tasks:', error);
    }
  }

  /**
   * Check individual task status and process if completed
   */
  private async checkAndProcessTask(task: AppTotalGoTask) {
    const taskStartTime = Date.now();
    try {
      const memberEmail = task.member?.email || task.member?.name;
      this.logger.debug(`[TASK] Starting check for task ID: ${task.external_task_id}`);
      this.logger.debug(`[TASK] Member: ${memberEmail}, Current Status: ${task.status}`);

      // Get status from external API
      const apiCallStart = Date.now();
      const status = await this.externalApiService.getAppTotalGoStatus(task.external_task_id);
      const apiCallDuration = Date.now() - apiCallStart;
      
      this.logger.log(`[API] Task ${task.external_task_id} - Status: ${status.status} (API call took ${apiCallDuration}ms)`);

      // Update task status
      const previousStatus = task.status;
      task.status = status.status;

      await this.taskRepo.save(task);
      this.logger.debug(`[DB] Task ${task.external_task_id} - Status updated: ${previousStatus} → ${status.status}`);

      // If task completed successfully and status changed, send email with report
      if (status.status === 'Success' && previousStatus !== 'Success') {
        this.logger.log(`[SUCCESS] Task ${task.external_task_id} completed! Sending report email to ${memberEmail}...`);
        await this.sendReportEmail(task);
      } else if (status.status === 'Success' && previousStatus === 'Success') {
        this.logger.debug(`[SKIP] Task ${task.external_task_id} already success and email sent`);
      }

      const taskDuration = Date.now() - taskStartTime;
      this.logger.debug(`[DONE] Task ${task.external_task_id} check completed in ${taskDuration}ms`);
    } catch (error) {
      this.logger.error(`[ERROR] Error checking task ${task.external_task_id}:`, error.message);
      
      // Update task with error if it's not already failed
      if (task.status !== 'failed') {
        task.status = 'failed';
        await this.taskRepo.save(task);
        this.logger.warn(`[FAILED] Task ${task.external_task_id} marked as failed`);
      }
    }
  }

  /**
   * Send report email to user
   */
  private async sendReportEmail(task: AppTotalGoTask) {
    const emailStartTime = Date.now();
    try {
      const memberEmail = task.member?.email || task.member?.name;
      
      if (!memberEmail) {
        this.logger.error(`[EMAIL] Cannot send report for task ${task.external_task_id}: member email not found`);
        return;
      }

      this.logger.log(`[EMAIL] Downloading report for task ${task.external_task_id}...`);

      // Download report file from external API
      const downloadStart = Date.now();
      const { buffer, contentType, filename } = await this.externalApiService.getAppTotalGoFiles(task.external_task_id);
      const downloadDuration = Date.now() - downloadStart;

      const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      this.logger.log(`[EMAIL] Report downloaded: ${filename} (${contentType}), size: ${fileSizeMB} MB (took ${downloadDuration}ms)`);

      // Send email with PDF attachment using existing mail service
      const mailStart = Date.now();
      await this.memberService.sendReportEmail({
        to: memberEmail,
        taskId: task.external_task_id,
        fileName: filename,
        fileBuffer: buffer,
        contentType: contentType,
      });
      const mailDuration = Date.now() - mailStart;

      this.logger.log(`[EMAIL] Report email sent successfully to ${memberEmail} for task ${task.external_task_id} (took ${mailDuration}ms)`);
      
      // Mark task as email sent (keep status as 'success' but we know email was sent)
      task.status = 'success'; // Keep success status
      await this.taskRepo.save(task);

      const totalDuration = Date.now() - emailStartTime;
      this.logger.log(`[EMAIL] Complete email process for task ${task.external_task_id} took ${totalDuration}ms total`);
    } catch (error) {
      this.logger.error(`[EMAIL] Error sending report email for task ${task.external_task_id}:`, error.message);
      // Don't change task status to failed, just log the email error
      // Task is still successful, just email delivery failed
    }
  }
}
