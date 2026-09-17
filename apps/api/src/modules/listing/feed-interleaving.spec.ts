import { NullIsiCepteFeedProvider } from '../isi-cepte/null-isicepte-feed.provider';
import { MockIsiCepteFeedProvider } from '../isi-cepte/mock-isicepte-feed.provider';
import { encodeFeedCursor, decodeFeedCursor } from './feed-cursor.util';
import { PROVIDER_POST_INTERVAL, FeedItem, IsiCepteProviderPostFeedItem, VehicleListingFeedItem } from '@used-car-intelligence/shared';
import { BadRequestException } from '@nestjs/common';

describe('Feed Interleaving, Port & Adapter, and HMAC Cursor Suite', () => {
  describe('1. Port & Adapter Behavior', () => {
    it('NullIsiCepteFeedProvider returns strictly empty array with zero side effects', async () => {
      const nullProvider = new NullIsiCepteFeedProvider();
      const posts = await nullProvider.getEligiblePosts({ cityId: 'TR-41', limit: 20 });
      expect(posts).toEqual([]);
      expect(posts.length).toBe(0);
    });

    it('MockIsiCepteFeedProvider returns mock posts filtered by city when requested', async () => {
      const mockProvider = new MockIsiCepteFeedProvider();
      const kocaeliPosts = await mockProvider.getEligiblePosts({ cityId: 'TR-41', limit: 10 });
      expect(kocaeliPosts.length).toBeGreaterThan(0);
      kocaeliPosts.forEach((post) => {
        expect(post.cityId).toBe('TR-41');
        expect(post.sourcePostId).toBeDefined();
        expect(post.businessName).toBeDefined();
      });

      const istanbulPosts = await mockProvider.getEligiblePosts({ cityId: 'TR-34', limit: 10 });
      expect(istanbulPosts.length).toBeGreaterThan(0);
      istanbulPosts.forEach((post) => {
        expect(post.cityId).toBe('TR-34');
      });
    });
  });

  describe('2. 5:1 Interleaving Logic', () => {
    function composeFeed(
      vehicles: VehicleListingFeedItem[],
      providerPosts: IsiCepteProviderPostFeedItem[],
      initialVehicleCount: number = 0,
      initialProviderPosition: number = 0
    ) {
      const mixedItems: FeedItem[] = [];
      let vehicleCountSinceLastPost = initialVehicleCount % PROVIDER_POST_INTERVAL;
      let providerIdx = initialProviderPosition;

      for (const vehicle of vehicles) {
        mixedItems.push({
          type: 'VEHICLE_LISTING',
          id: vehicle.id,
          data: vehicle,
        });
        vehicleCountSinceLastPost++;

        if (vehicleCountSinceLastPost === PROVIDER_POST_INTERVAL) {
          if (providerIdx < providerPosts.length) {
            const post = providerPosts[providerIdx++];
            mixedItems.push({
              type: 'ISICEPTE_PROVIDER_POST',
              id: post.sourcePostId,
              data: post,
            });
          }
          vehicleCountSinceLastPost = 0;
        }
      }

      return {
        items: mixedItems,
        vehicleTotalCount: vehicles.length,
        totalCount: vehicles.length,
        nextProviderPosition: providerIdx,
      };
    }

    it('interleaves exactly 1 provider post after every 5 vehicle listings', () => {
      // 12 fake vehicles
      const fakeVehicles: VehicleListingFeedItem[] = Array.from({ length: 12 }, (_, i) => ({
        id: `veh-${i + 1}`,
        title: `Vehicle ${i + 1}`,
        description: 'Test Description',
        price: 500000 + i * 10000,
        currency: 'TRY',
        listingDate: '17.09.2026',
        listingNo: `TS-${1000 + i}`,
        location: { city: 'Kocaeli', district: 'İzmit' },
        seller: { id: `seller-${i}`, displayName: 'Test Seller', memberSince: '2026' },
        vehicle: {
          brand: 'BMW',
          modelFamily: '3 Serisi',
          modelName: '320d',
          year: 2020,
          fuelType: 'DIESEL',
          transmissionType: 'AUTOMATIC',
          mileage: 80000,
        },
        photos: [],
        breadcrumb: ['Vasıta', 'Otomobil', 'BMW'],
        isFavorite: false,
      }));

      // 5 fake provider posts
      const fakePosts: IsiCepteProviderPostFeedItem[] = Array.from({ length: 5 }, (_, i) => ({
        sourcePostId: `post-${i + 1}`,
        providerId: `prov-${i + 1}`,
        businessName: `Usta Garaj ${i + 1}`,
        cityId: 'TR-41',
        cityName: 'Kocaeli',
        districtName: 'İzmit',
        postTitle: `Tamir ve Bakım ${i + 1}`,
        postDescription: 'Periyodik bakım tamamlandı',
        isShowcaseActive: true,
      }));

      const result = composeFeed(fakeVehicles, fakePosts);

      // Total items: 12 vehicles + 2 provider posts = 14 items
      expect(result.items.length).toBe(14);
      expect(result.vehicleTotalCount).toBe(12);
      expect(result.totalCount).toBe(12);

      // Verify sequence:
      // Items 0..4: VEHICLE_LISTING
      for (let i = 0; i < 5; i++) {
        expect(result.items[i].type).toBe('VEHICLE_LISTING');
      }
      // Item 5 (after 5 vehicles): ISICEPTE_PROVIDER_POST
      expect(result.items[5].type).toBe('ISICEPTE_PROVIDER_POST');
      expect(result.items[5].id).toBe('post-1');

      // Items 6..10: VEHICLE_LISTING
      for (let i = 6; i < 11; i++) {
        expect(result.items[i].type).toBe('VEHICLE_LISTING');
      }
      // Item 11 (after another 5 vehicles): ISICEPTE_PROVIDER_POST
      expect(result.items[11].type).toBe('ISICEPTE_PROVIDER_POST');
      expect(result.items[11].id).toBe('post-2');

      // Items 12..13: Remaining 2 vehicles
      expect(result.items[12].type).toBe('VEHICLE_LISTING');
      expect(result.items[13].type).toBe('VEHICLE_LISTING');
    });

    it('leaves feed unmodified when provider post list is empty (Null Provider in prod)', () => {
      const fakeVehicles: VehicleListingFeedItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `veh-${i + 1}`,
        title: `Vehicle ${i + 1}`,
        description: 'Test',
        price: 500000,
        currency: 'TRY',
        listingDate: '17.09.2026',
        listingNo: `TS-${i}`,
        location: { city: 'Kocaeli', district: 'İzmit' },
        seller: { id: `s-${i}`, displayName: 'Seller', memberSince: '2026' },
        vehicle: { brand: 'BMW', modelFamily: '3', modelName: '320d', year: 2020, fuelType: 'D', transmissionType: 'A', mileage: 1000 },
        photos: [],
        breadcrumb: [],
        isFavorite: false,
      }));

      const result = composeFeed(fakeVehicles, []); // empty provider posts
      expect(result.items.length).toBe(10);
      result.items.forEach((item) => {
        expect(item.type).toBe('VEHICLE_LISTING');
      });
      expect(result.vehicleTotalCount).toBe(10);
    });
  });

  describe('3. HMAC-Signed Tamper-Resistant Cursor & City Context', () => {
    it('successfully encodes and decodes a valid cursor', () => {
      const payload = {
        version: 1,
        offset: 20,
        globalVehicleCount: 20,
        seed: 'seed123',
        cityId: 'TR-41',
        providerPosition: 4,
      };

      const token = encodeFeedCursor(payload);
      expect(typeof token).toBe('string');
      expect(token).toContain('.');

      const decoded = decodeFeedCursor(token, 'TR-41');
      expect(decoded).not.toBeNull();
      expect(decoded?.offset).toBe(20);
      expect(decoded?.globalVehicleCount).toBe(20);
      expect(decoded?.seed).toBe('seed123');
      expect(decoded?.cityId).toBe('TR-41');
      expect(decoded?.providerPosition).toBe(4);
    });

    it('rejects a tampered signature with 400 BadRequestException', () => {
      const payload = {
        version: 1,
        offset: 20,
        globalVehicleCount: 20,
        seed: 'seed123',
        cityId: 'TR-41',
        providerPosition: 4,
      };

      const token = encodeFeedCursor(payload);
      const parts = token.split('.');
      const tamperedToken = `${parts[0]}.tamperedSignature`;

      expect(() => {
        decodeFeedCursor(tamperedToken, 'TR-41');
      }).toThrow(BadRequestException);
    });

    it('rejects tampered base64 JSON payload with 400 BadRequestException', () => {
      const payload = {
        version: 1,
        offset: 20,
        globalVehicleCount: 20,
        seed: 'seed123',
        cityId: 'TR-41',
        providerPosition: 4,
      };

      const token = encodeFeedCursor(payload);
      const parts = token.split('.');
      // Tamper the payload by replacing base64 data
      const modifiedPayload = Buffer.from(JSON.stringify({ ...payload, offset: 9999 })).toString('base64url');
      const tamperedToken = `${modifiedPayload}.${parts[1]}`;

      expect(() => {
        decodeFeedCursor(tamperedToken, 'TR-41');
      }).toThrow(BadRequestException);
    });

    it('returns null and cleanly resets continuation when active city changes (cross-city isolation)', () => {
      const payload = {
        version: 1,
        offset: 20,
        globalVehicleCount: 20,
        seed: 'seed123',
        cityId: 'TR-41', // Created in Kocaeli
        providerPosition: 4,
      };

      const token = encodeFeedCursor(payload);

      // User switched active city to TR-34 (Istanbul)
      const decodedForDifferentCity = decodeFeedCursor(token, 'TR-34');
      expect(decodedForDifferentCity).toBeNull();

      // User switched to Tüm Türkiye (null)
      const decodedForNullCity = decodeFeedCursor(token, null);
      expect(decodedForNullCity).toBeNull();
    });
  });
});
