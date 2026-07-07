import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ResearchService } from './research.service';

@Injectable()
export class ResearchWorkerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ResearchWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(private readonly researchService: ResearchService) {}

  onApplicationBootstrap() {
    this.logger.log('Starting background vehicle research worker loop...');
    // Poll every 15 seconds
    this.timer = setInterval(() => this.runWorkerCycle(), 15000);
    // Run once immediately after startup
    setTimeout(() => this.runWorkerCycle(), 2000);
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async runWorkerCycle() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let processed = true;
      while (processed) {
        processed = await this.researchService.processNextJob();
        if (processed) {
          this.logger.log('Successfully processed a queued vehicle research job.');
        }
      }
    } catch (err) {
      this.logger.error(`Error in research worker cycle: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
