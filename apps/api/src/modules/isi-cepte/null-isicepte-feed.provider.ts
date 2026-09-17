import { Injectable } from '@nestjs/common';
import { IsiCepteFeedProvider, GetEligiblePostsParams } from './isicepte-feed-provider.interface';
import { IsiCepteProviderPostFeedItem } from '@used-car-intelligence/shared';

/**
 * NullIsiCepteFeedProvider (Production Default)
 * Guarantees zero side-effects, zero network calls, zero DB queries,
 * and zero fake data when real İşiCepte integration is not active.
 */
@Injectable()
export class NullIsiCepteFeedProvider implements IsiCepteFeedProvider {
  async getEligiblePosts(_params: GetEligiblePostsParams): Promise<IsiCepteProviderPostFeedItem[]> {
    return [];
  }
}
