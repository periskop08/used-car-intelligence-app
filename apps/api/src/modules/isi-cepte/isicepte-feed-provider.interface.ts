import { IsiCepteProviderPostFeedItem } from '@used-car-intelligence/shared';

export interface GetEligiblePostsParams {
  cityId?: string | null;
  limit: number;
  seed?: string;
  excludeIds?: string[];
}

export interface IsiCepteFeedProvider {
  getEligiblePosts(params: GetEligiblePostsParams): Promise<IsiCepteProviderPostFeedItem[]>;
}

export const ISICEPTE_FEED_PROVIDER = 'ISICEPTE_FEED_PROVIDER';
