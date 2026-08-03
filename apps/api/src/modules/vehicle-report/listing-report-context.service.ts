import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ListingReportContextService {
  constructor(private prisma: PrismaService) {}

  async buildListingContext(listingId: string) {
    const listing = await this.prisma.vehicleListing.findUnique({
      where: { id: listingId },
      include: {
        vehicleVariant: {
          include: {
            brand: true,
            model: true,
            generation: true,
            engine: true,
            transmission: true,
            trim: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            moderationStatus: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`İlan bulunamadı: ${listingId}`);
    }

    const variant = listing.vehicleVariant;

    const rawDesc = listing.description || '';
    const sanitizedDesc = rawDesc
      .replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[TELEFON Numarası Gizlendi]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[E-POSTA Adresi Gizlendi]')
      .trim();

    const missingFields: { fieldKey: string; fieldLabel: string; importance: 'MEDIUM' | 'HIGH' }[] = [];
    if (!listing.engineDisplacement) missingFields.push({ fieldKey: 'engineDisplacement', fieldLabel: 'Motor Hacmi', importance: 'HIGH' });
    if (!listing.enginePower) missingFields.push({ fieldKey: 'enginePower', fieldLabel: 'Motor Gücü', importance: 'HIGH' });
    if (!listing.color) missingFields.push({ fieldKey: 'color', fieldLabel: 'Renk', importance: 'MEDIUM' });

    const listingContextObj = {
      listingId: listing.id,
      title: listing.title,
      priceAmount: parseFloat(listing.priceAmount.toString()),
      currency: listing.currency || 'TRY',
      countryCode: listing.countryCode || 'TR',
      city: listing.city,
      district: listing.district || undefined,
      modelYear: listing.modelYear,
      kilometers: listing.kilometers,
      fuelType: listing.fuelType || variant?.fuelType || 'Belirtilmemiş',
      transmission: listing.transmission || variant?.transmission?.name || 'Belirtilmemiş',
      bodyType: listing.bodyType || variant?.bodyType || 'Belirtilmemiş',
      sellerType: listing.sellerType || 'Bireysel Satıcı',
      hasWarranty: listing.hasWarranty,
      heavyDamage: listing.heavyDamage,
      tramerAmount: listing.tramerAmount || 0,
      damageRecord: listing.damageRecord || undefined,
      paintedParts: listing.paintedParts || [],
      changedParts: listing.changedParts || [],
      localPaintedParts: listing.localPaintedParts || [],
      maintenanceHistory: listing.maintenanceHistory || undefined,
      missingFields,
      photoCount: listing.media?.length || 0,
      approvedPhotoCount: listing.media?.filter((m) => m.moderationStatus === 'APPROVED').length || 0,
      sellerDescriptionWrapped: `<SELLER_DESCRIPTION>\n${sanitizedDesc}\n</SELLER_DESCRIPTION>`,
    };

    const listingContextHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(listingContextObj))
      .digest('hex');

    return {
      listingContext: listingContextObj,
      listingContextHash,
      variantId: listing.vehicleVariantId || undefined,
    };
  }
}
