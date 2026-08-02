import { Injectable, Logger } from '@nestjs/common';

export interface SemanticValidationResult {
  isValid: boolean;
  needsRepair: boolean;
  reason?: string;
  sanitizedAnswer?: string;
}

@Injectable()
export class ListingAiSemanticValidationService {
  private readonly logger = new Logger(ListingAiSemanticValidationService.name);

  validate(answer: string, contextJson: any): SemanticValidationResult {
    if (!answer || answer.length < 10) {
      return { isValid: false, needsRepair: true, reason: 'Answer too short' };
    }

    const answerLower = answer.toLowerCase();

    // 1. Absolute legal/purchase guarantees check
    const prohibitedGuarantees = [
      'kesinlikle satın alın',
      'kesinlikle kaçırmayın',
      'garanti ederim araç sağlamdır',
      'bu araç yüzde yüz hatasızdır',
    ];

    for (const pg of prohibitedGuarantees) {
      if (answerLower.includes(pg)) {
        return {
          isValid: false,
          needsRepair: true,
          reason: `Response contains prohibited guarantee phrasing: "${pg}"`,
        };
      }
    }

    // 2. Generic un-contextualized sentences check
    if (
      answer.includes('Araçtan araca değişir.') &&
      !answer.includes('Satıcının beyanına göre')
    ) {
      this.logger.warn('AI answer contained raw un-contextualized boilerplate statement');
    }

    return {
      isValid: true,
      needsRepair: false,
      sanitizedAnswer: answer,
    };
  }
}
