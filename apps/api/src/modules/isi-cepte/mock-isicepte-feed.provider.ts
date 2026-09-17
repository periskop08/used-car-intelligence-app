import { Injectable } from '@nestjs/common';
import { IsiCepteFeedProvider, GetEligiblePostsParams } from './isicepte-feed-provider.interface';
import { IsiCepteProviderPostFeedItem } from '@used-car-intelligence/shared';

/**
 * MockIsiCepteFeedProvider (Test runtime only)
 * Used in unit/integration tests to verify 5:1 interleaving,
 * provider diversity, pool exhaustion, and city matching.
 */
@Injectable()
export class MockIsiCepteFeedProvider implements IsiCepteFeedProvider {
  private mockPosts: IsiCepteProviderPostFeedItem[] = [];

  constructor(initialPosts?: IsiCepteProviderPostFeedItem[]) {
    if (initialPosts) {
      this.mockPosts = initialPosts;
    } else {
      this.mockPosts = [
        {
          sourcePostId: 'mock-post-1',
          providerId: 'mock-prov-1',
          businessName: 'Kocaeli Uzman Oto Servis',
          cityId: 'TR-41',
          cityName: 'Kocaeli',
          districtName: 'İzmit',
          postTitle: 'BMW F30 Periyodik Bakım',
          postDescription: 'Motor yağı, filtreler ve genel kontrol eksiksiz tamamlandı.',
          isShowcaseActive: true,
          rating: 4.9,
          reviewCount: 38,
        },
        {
          sourcePostId: 'mock-post-2',
          providerId: 'mock-prov-2',
          businessName: 'İzmit Mekanik Garaj',
          cityId: 'TR-41',
          cityName: 'Kocaeli',
          districtName: 'Gebze',
          postTitle: 'Triger Kayışı ve Devirdaim Değişimi',
          postDescription: 'Orijinal parçalarla triger seti montajı yapıldı.',
          isShowcaseActive: true,
          rating: 4.8,
          reviewCount: 24,
        },
        {
          sourcePostId: 'mock-post-3',
          providerId: 'mock-prov-3',
          businessName: 'İstanbul Maslak Premium Servis',
          cityId: 'TR-34',
          cityName: 'İstanbul',
          districtName: 'Sarıyer',
          postTitle: 'Mercedes E250 Fren ve Şanzıman Bakımı',
          postDescription: 'Şanzıman yağı ve balata değişimi uygulandı.',
          isShowcaseActive: true,
          rating: 5.0,
          reviewCount: 52,
        },
      ];
    }
  }

  setMockPosts(posts: IsiCepteProviderPostFeedItem[]) {
    this.mockPosts = posts;
  }

  async getEligiblePosts(params: GetEligiblePostsParams): Promise<IsiCepteProviderPostFeedItem[]> {
    const { cityId, limit, excludeIds = [] } = params;
    const excludeSet = new Set(excludeIds);

    let candidates = this.mockPosts.filter((p) => !excludeSet.has(p.sourcePostId));

    if (cityId) {
      // Filter strictly by requested city
      candidates = candidates.filter((p) => p.cityId === cityId);
    }

    return candidates.slice(0, limit);
  }
}
