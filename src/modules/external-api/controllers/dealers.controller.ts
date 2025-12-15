import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ExternalApiService } from '../external-api.service';

@ApiTags('Dealers')
@Controller('dealers')
export class DealersController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get('export-service-usage-logs')
  @ApiOperation({
    summary: 'Export service usage logs',
    description: 'Export service usage logs for the authenticated dealer as an Excel file',
  })
  @ApiResponse({ status: 200, description: 'Excel file exported successfully' })
  async exportServiceUsageLogs(@Res() res: Response) {
    try {
      const fileBuffer = await this.externalApiService.exportServiceUsageLogs();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=service-usage-logs.xlsx');
      
      return res.send(fileBuffer);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}