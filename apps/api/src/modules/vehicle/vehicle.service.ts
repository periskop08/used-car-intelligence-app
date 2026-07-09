import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ApprovalStatus, Role, TransmissionType, FuelType, BodyType, RiskLevel, VehicleInfoCategory } from '@prisma/client';
import { AiGenerateVehicleDto, SuggestVehicleDto, AdminUpdateVariantDto } from './vehicle.dto';



function checkIfEngineHasTurbo(code: string, fuelType: FuelType): boolean {
  const lower = code.toLowerCase();
  if (fuelType === FuelType.DIESEL) return true;
  if (fuelType === FuelType.ELECTRIC) return false;
  
  if (
    lower.includes('turbo') || 
    lower.includes('tsi') || 
    lower.includes('tfsi') || 
    lower.includes('t-gdi') || 
    lower.includes('thp') || 
    lower.includes('tce') || 
    lower.includes('ecoboost') || 
    lower.includes('boosterjet')
  ) {
    return true;
  }
  
  if (/\b\d\.\d\s*[tT]\b/.test(code) || /\b\d\s*[tT]\b/.test(code) || /\d+s*[tT]\b/.test(code)) {
    if (!lower.includes('vtec') && !lower.includes('vvti') && !lower.includes('vti') && !lower.includes('puretech')) {
      return true;
    }
  }
  
  return false;
}

@Injectable()
export class VehicleService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async getBrands() {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getModels(brandId: string) {
    return this.prisma.model.findMany({
      where: { brandId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getVariants(modelId: string) {
    return this.prisma.vehicleVariant.findMany({
      where: { modelId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        country: true,
      },
      orderBy: { year: 'desc' },
    });
  }

  async getVariantDetail(variantId: string, userId?: string) {
    const variant = await this.prisma.vehicleVariant.findFirst({
      where: { id: variantId, status: ApprovalStatus.APPROVED },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        country: true,
        specs: true,
        problems: {
          where: { status: ApprovalStatus.APPROVED },
          include: { translations: true },
        },
        recalls: {
          where: { status: ApprovalStatus.APPROVED },
        },
        questions: {
          where: { status: ApprovalStatus.APPROVED },
          include: { translations: true },
        },
        checklists: {
          where: { status: ApprovalStatus.APPROVED },
          include: { translations: true },
        },
        reviews: {
          where: { status: ApprovalStatus.APPROVED },
          include: { rating: true, user: true },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Araç varyantı bulunamadı.');
    }

    // Check if we have completed a real AI research job for this variant
    const completedJob = await this.prisma.vehicleResearchJob.findFirst({
      where: {
        vehicleVariantId: variantId,
        status: 'COMPLETED',
      },
    });

    if (!completedJob) {
      // 1. Clean up old/mock data if any
      await this.prisma.commonProblem.deleteMany({ where: { variantId } });
      await this.prisma.recall.deleteMany({ where: { variantId } });
      await this.prisma.sellerQuestion.deleteMany({ where: { variantId } });
      await this.prisma.inspectionChecklistItem.deleteMany({ where: { variantId } });

      // 2. Ensure TechnicalSpec is populated
      await this.populateVariantDetails(variant.id);

      // 3. Check if a job is already queued or running
      const activeJob = await this.prisma.vehicleResearchJob.findFirst({
        where: {
          vehicleVariantId: variantId,
          status: { in: ['QUEUED', 'RUNNING'] },
        },
      });

      if (!activeJob) {
        // Enqueue the research job
        await this.prisma.vehicleResearchJob.create({
          data: {
            vehicleVariantId: variantId,
            languageCode: 'tr',
            countryCode: 'TR',
            researchScope: 'FULL_REPORT',
            priority: 'MEDIUM',
            status: 'QUEUED',
          },
        });

        // Trigger the process-next endpoint asynchronously in the background
        const adminSecret = process.env.ADMIN_SECRET || 'torque-scout-super-secret-admin-key';
        const baseUrl = process.env.MOBILE_API_URL || 'http://localhost:3000';
        
        global.fetch(`${baseUrl}/research/process-next`, {
          method: 'POST',
          headers: {
            'x-admin-secret': adminSecret,
          },
        }).catch((err: any) => {
          console.error(`Failed to trigger background research worker: ${err.message}`);
        });
      }

      // Re-fetch fully populated variant with fresh specs/problems (which will be empty initially)
      const freshVariant = await this.prisma.vehicleVariant.findFirst({
        where: { id: variantId, status: ApprovalStatus.APPROVED },
        include: {
          brand: true,
          model: true,
          generation: true,
          engine: true,
          transmission: true,
          trim: true,
          country: true,
          specs: true,
          problems: {
            where: { status: ApprovalStatus.APPROVED },
            include: { translations: true },
          },
          recalls: {
            where: { status: ApprovalStatus.APPROVED },
          },
          questions: {
            where: { status: ApprovalStatus.APPROVED },
            include: { translations: true },
          },
          checklists: {
            where: { status: ApprovalStatus.APPROVED },
            include: { translations: true },
          },
          reviews: {
            where: { status: ApprovalStatus.APPROVED },
            include: { rating: true, user: true },
          },
        },
      });

      return this.formatVariantDetail(freshVariant || variant, userId);
    }

    return this.formatVariantDetail(variant, userId);
  }

  private formatVariantDetail(variant: any, userId?: string) {
    // Default: Locked state if user is Free or Anonymous
    let isPremiumUnlocked = false;
    // (We will handle this check in formatVariantDetail)
    return {
      id: variant.id,
      brand: variant.brand.name,
      model: variant.model.name,
      generation: variant.generation.name,
      year: variant.year,
      bodyType: variant.generation.bodyType,
      engine: variant.engine.code,
      fuelType: variant.engine.fuelType,
      transmission: variant.transmission.name,
      trim: variant.trim.name,
      country: variant.country.name,
      specs: variant.specs?.specs || null,
      problems: variant.problems.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        riskLevel: p.riskLevel,
        symptoms: p.symptoms,
        checkRecommendation: p.checkRecommendation,
        sourceCount: p.sourceCount,
        problemType: p.problemType,
        dataConfidence: p.dataConfidence,
        metadata: p.metadata,
      })),
      recalls: variant.recalls.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        riskLevel: r.riskLevel,
        date: r.date,
      })),
      premiumFeatures: {
        isUnlocked: true, // Auto unlocked for testing convenience or check membership
        sellerQuestions: variant.questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          reason: q.reason,
          category: q.category,
          riskLevel: q.riskLevel,
        })),
        inspectionChecklist: variant.checklists.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          riskLevel: c.riskLevel,
          sortOrder: c.sortOrder,
        })),
      },
      reviews: variant.reviews.map((rev: any) => ({
        id: rev.id,
        email: rev.user.email,
        comment: rev.comment,
        usageDuration: rev.usageDuration,
        recommend: rev.recommend,
        createdAt: rev.createdAt,
        rating: rev.rating,
      })),
    };
  }

  async aiGenerateVehicle(dto: AiGenerateVehicleDto) {
    let brandName = dto.brand.trim();
    brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase();

    let modelName = dto.model.trim();
    modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);


    const year = Number(dto.year) || 2018;
    let bodyType: BodyType = BodyType.SEDAN;
    const bodyStr = dto.bodyType.toUpperCase();
    if (bodyStr === 'HATCHBACK') bodyType = BodyType.HATCHBACK;
    else if (bodyStr === 'SUV') bodyType = BodyType.SUV;
    else if (bodyStr === 'COUPE') bodyType = BodyType.COUPE;
    else if (bodyStr === 'CABRIOLET' || bodyStr === 'CONVERTIBLE') bodyType = BodyType.CONVERTIBLE;
    else if (bodyStr === 'WAGON') bodyType = BodyType.WAGON;
    else if (bodyStr === 'MINIVAN') bodyType = BodyType.MINIVAN;
    else if (bodyStr === 'OTHER') bodyType = BodyType.OTHER;

    const engineMatch = dto.engine.match(/\b(\d\.\d)\b/);
    const engineSize = engineMatch ? engineMatch[0] : '1.6';

    let fuelType: FuelType = FuelType.PETROL;
    const lowerEngine = dto.engine.toLowerCase();
    if (lowerEngine.includes('dizel') || lowerEngine.includes('diesel') || lowerEngine.includes('tdi') || lowerEngine.includes('dci') || lowerEngine.includes('cdti') || lowerEngine.includes('bluehdi') || lowerEngine.includes('hdi')) {
      fuelType = FuelType.DIESEL;
    } else if (lowerEngine.includes('lpg') || lowerEngine.includes('eco')) {
      fuelType = FuelType.LPG;
    } else if (lowerEngine.includes('hybrid') || lowerEngine.includes('hibrit')) {
      fuelType = FuelType.HYBRID;
    } else if (lowerEngine.includes('electric') || lowerEngine.includes('ev') || lowerEngine.includes('elektrik')) {
      fuelType = FuelType.ELECTRIC;
    }

    let engineCode = dto.engine.trim();

    let transName = dto.transmission.trim();
    let transType: TransmissionType = TransmissionType.AUTOMATIC;
    let speeds = 6;
    const lowerTrans = dto.transmission.toLowerCase();
    if (lowerTrans.includes('dsg') || lowerTrans.includes('s tronic') || lowerTrans.includes('dct') || lowerTrans.includes('edc') || lowerTrans.includes('çift kavrama')) {
      transType = TransmissionType.DCT;
      speeds = 7;
    } else if (lowerTrans.includes('cvt') || lowerTrans.includes('multidrive')) {
      transType = TransmissionType.CVT;
      speeds = 7;
    } else if (lowerTrans.includes('manuel') || lowerTrans.includes('düz') || lowerTrans.includes('manual')) {
      transType = TransmissionType.MANUAL;
      speeds = 6;
    }

    let dbBrand = await this.prisma.brand.findFirst({
      where: { name: { equals: brandName, mode: 'insensitive' } }
    });

    if (dbBrand) {
      const dbModel = await this.prisma.model.findFirst({
        where: { brandId: dbBrand.id, name: { equals: modelName, mode: 'insensitive' } }
      });
      if (dbModel) {
        const dbVariant = await this.prisma.vehicleVariant.findFirst({
          where: {
            modelId: dbModel.id,
            year,
            engine: { code: { equals: engineCode, mode: 'insensitive' } },
            transmission: { name: { equals: transName, mode: 'insensitive' } },
            status: ApprovalStatus.APPROVED
          }
        });
        if (dbVariant) {
          return { variantId: dbVariant.id, isNew: false };
        }
      }
    }

    if (!dbBrand) {
      dbBrand = await this.prisma.brand.create({
        data: { name: brandName, isActive: true }
      });
    }

    let dbModel = await this.prisma.model.findFirst({
      where: { brandId: dbBrand.id, name: { equals: modelName, mode: 'insensitive' } }
    });
    if (!dbModel) {
      dbModel = await this.prisma.model.create({
        data: { brandId: dbBrand.id, name: modelName, startYear: year - 5, isActive: true }
      });
    }

    const genName = `${modelName} ${year - 2}-${year + 3}`;
    let dbGen = await this.prisma.generation.findFirst({
      where: { modelId: dbModel.id, name: { equals: genName, mode: 'insensitive' } }
    });
    if (!dbGen) {
      dbGen = await this.prisma.generation.create({
        data: {
          modelId: dbModel.id,
          name: genName,
          startYear: year - 2,
          endYear: year + 3,
          bodyType,
          description: `${brandName} ${modelName} ${year} Jenerasyonu`
        }
      });
    }


    let dbEngine = await this.prisma.engine.findFirst({
      where: { code: { equals: engineCode, mode: 'insensitive' } }
    });
    if (!dbEngine) {
      const dispVal = Math.round(parseFloat(engineSize) * 1000);
      dbEngine = await this.prisma.engine.create({
        data: {
          code: engineCode,
          displacement: dispVal || 1598,
          horsepower: fuelType === FuelType.ELECTRIC ? 204 : parseFloat(engineSize) > 2.0 ? 250 : 150,
          torque: fuelType === FuelType.ELECTRIC ? 310 : parseFloat(engineSize) > 2.0 ? 400 : 250,
          fuelType,
          hasTurbo: checkIfEngineHasTurbo(engineCode, fuelType)
        }
      });
    }

    let dbTrans = await this.prisma.transmission.findFirst({
      where: { name: { equals: transName, mode: 'insensitive' } }
    });
    if (!dbTrans) {
      dbTrans = await this.prisma.transmission.create({
        data: { name: transName, type: transType, speeds }
      });
    }

    const trimName = 'Standard';
    let dbTrim = await this.prisma.trim.findFirst({
      where: { name: { equals: trimName, mode: 'insensitive' } }
    });
    if (!dbTrim) {
      dbTrim = await this.prisma.trim.create({
        data: { name: trimName, description: 'Standart Paket' }
      });
    }

    const countryTr = await this.prisma.country.findFirst({ where: { code: 'TR' } });
    const countryId = countryTr ? countryTr.id : (await this.prisma.country.findFirst())?.id;
    if (!countryId) {
      throw new BadRequestException('Aktif ülke bulunamadı.');
    }

    const adminUser = await this.prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) {
      throw new BadRequestException('Sistem yöneticisi bulunamadı.');
    }

    const dispMultiplier = parseFloat(engineSize) || 1.6;
    const topSpd = Math.round(160 + dispMultiplier * 20);
    const accel0to100 = parseFloat((14 - dispMultiplier * 2).toFixed(1));
    const avgFuel = fuelType === FuelType.ELECTRIC ? 0 : parseFloat((8.5 - dispMultiplier * 1.5).toFixed(1));

    const variant = await this.prisma.vehicleVariant.create({
      data: {
        brandId: dbBrand.id,
        modelId: dbModel.id,
        generationId: dbGen.id,
        engineId: dbEngine.id,
        transmissionId: dbTrans.id,
        trimId: dbTrim.id,
        countryId,
        year,
        status: ApprovalStatus.APPROVED,
        createdById: adminUser.id,
        approvedById: adminUser.id,
        approvedAt: new Date()
      }
    });

    await this.populateVariantDetails(variant.id);

    return { variantId: variant.id, isNew: true };
  }

  async populateVariantDetails(variantId: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id: variantId },
      include: {
        brand: true,
        model: true,
        generation: true,
        engine: true,
        transmission: true,
        trim: true,
        specs: true,
      }
    });

    if (!variant) return;

    // Check if it already has specs
    if (variant.specs) {
      return;
    }

    const engineCode = variant.engine.code;
    const fuelType = variant.engine.fuelType;

    const engineMatch = engineCode.match(/\b(\d\.\d)\b/);
    const engineSize = engineMatch ? engineMatch[0] : '1.6';

    const dispMultiplier = parseFloat(engineSize) || 1.6;
    const topSpd = Math.round(160 + dispMultiplier * 20);
    const accel0to100 = parseFloat((14 - dispMultiplier * 2).toFixed(1));
    const avgFuel = fuelType === FuelType.ELECTRIC ? 0 : parseFloat((8.5 - dispMultiplier * 1.5).toFixed(1));

    // Create Technical Specs
    await this.prisma.technicalSpec.create({
      data: {
        variantId: variant.id,
        specs: {
          topSpeed: topSpd,
          acceleration0to100: accel0to100,
          averageFuelConsumption: avgFuel,
          luggageCapacity: 450,
          weight: 1350
        }
      }
    });
  }

  // Helper mappings
  private mapBodyType(bodyStr: string): BodyType {
    const clean = bodyStr.toLowerCase().trim();
    if (clean === 'sedan') return BodyType.SEDAN;
    if (clean === 'hatchback') return BodyType.HATCHBACK;
    if (clean === 'suv') return BodyType.SUV;
    if (clean === 'coupe') return BodyType.COUPE;
    if (clean === 'cabrio' || clean === 'cabriolet' || clean === 'convertible') return BodyType.CONVERTIBLE;
    if (clean === 'station wagon' || clean === 'wagon') return BodyType.WAGON;
    if (clean === 'minivan') return BodyType.MINIVAN;
    if (clean === 'van') return BodyType.VAN;
    if (clean === 'pick-up' || clean === 'pickup') return BodyType.PICKUP;
    return BodyType.OTHER;
  }

  private mapFuelType(fuelStr: string): FuelType {
    const clean = fuelStr.toLowerCase().trim();
    if (clean === 'benzin' || clean === 'petrol') return FuelType.PETROL;
    if (clean === 'dizel' || clean === 'diesel') return FuelType.DIESEL;
    if (clean === 'hibrit' || clean === 'hybrid') return FuelType.HYBRID;
    if (clean === 'elektrik' || clean === 'electric') return FuelType.ELECTRIC;
    if (clean === 'lpg' || clean === 'lpg & benzin') return FuelType.LPG;
    return FuelType.OTHER;
  }

  private async resolveEngine(engineCodeStr: string, fuelType: FuelType): Promise<any> {
    const code = engineCodeStr.trim();
    let dbEngine = await this.prisma.engine.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } }
    });
    if (!dbEngine) {
      const engineMatch = code.match(/\b(\d\.\d)\b/);
      const engineSize = engineMatch ? engineMatch[0] : '1.6';
      const dispVal = Math.round(parseFloat(engineSize) * 1000);
      dbEngine = await this.prisma.engine.create({
        data: {
          code,
          displacement: dispVal || 1598,
          horsepower: fuelType === FuelType.ELECTRIC ? 204 : parseFloat(engineSize) > 2.0 ? 250 : 150,
          torque: fuelType === FuelType.ELECTRIC ? 310 : parseFloat(engineSize) > 2.0 ? 400 : 250,
          fuelType,
          hasTurbo: checkIfEngineHasTurbo(code, fuelType)
        }
      });
    }
    return dbEngine;
  }

  private async resolveTransmission(transNameStr: string): Promise<any> {
    const name = transNameStr.trim();
    let dbTrans = await this.prisma.transmission.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    if (!dbTrans) {
      let transType: TransmissionType = TransmissionType.AUTOMATIC;
      let speeds = 6;
      const lowerTrans = name.toLowerCase();
      if (lowerTrans.includes('dsg') || lowerTrans.includes('s tronic') || lowerTrans.includes('dct') || lowerTrans.includes('edc') || lowerTrans.includes('çift kavrama')) {
        transType = TransmissionType.DCT;
        speeds = 7;
      } else if (lowerTrans.includes('cvt') || lowerTrans.includes('multidrive')) {
        transType = TransmissionType.CVT;
        speeds = 7;
      } else if (lowerTrans.includes('manuel') || lowerTrans.includes('düz') || lowerTrans.includes('manual')) {
        transType = TransmissionType.MANUAL;
        speeds = 6;
      }
      dbTrans = await this.prisma.transmission.create({
        data: { name, type: transType, speeds }
      });
    }
    return dbTrans;
  }

  private async resolveTrim(trimNameStr: string): Promise<any> {
    const name = trimNameStr.trim();
    let dbTrim = await this.prisma.trim.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });
    if (!dbTrim) {
      dbTrim = await this.prisma.trim.create({
        data: { name, description: `${name} Donanım Paketi` }
      });
    }
    return dbTrim;
  }

  // Suggest a variant (pending approval)
  async suggestVariant(dto: SuggestVehicleDto, userId?: string) {
    const bodyType = this.mapBodyType(dto.bodyType);
    const fuelType = this.mapFuelType(dto.fuelType);
    
    const dbEngine = await this.resolveEngine(dto.engine, fuelType);
    const dbTrans = await this.resolveTransmission(dto.transmission);
    const dbTrim = await this.resolveTrim(dto.trimName);

    // Verify model exists
    const dbModel = await this.prisma.model.findUnique({
      where: { id: dto.modelId }
    });
    if (!dbModel) {
      throw new NotFoundException('Seçilen model bulunamadı.');
    }

    // Get or create generation
    let dbGen = await this.prisma.generation.findFirst({
      where: { modelId: dto.modelId }
    });
    if (!dbGen) {
      dbGen = await this.prisma.generation.create({
        data: {
          modelId: dto.modelId,
          name: `${dbModel.name} Generation`,
          startYear: dto.year - 5,
          bodyType
        }
      });
    }

    // Get country
    const countryTr = await this.prisma.country.findFirst({ where: { code: 'TR' } });
    const countryId = countryTr ? countryTr.id : (await this.prisma.country.findFirst())?.id;
    if (!countryId) {
      throw new BadRequestException('Aktif ülke bulunamadı.');
    }

    // Check duplicate
    const existing = await this.prisma.vehicleVariant.findFirst({
      where: {
        brandId: dto.brandId,
        modelId: dto.modelId,
        engineId: dbEngine.id,
        transmissionId: dbTrans.id,
        trimId: dbTrim.id,
        year: dto.year
      }
    });

    if (existing) {
      if (existing.status === ApprovalStatus.APPROVED) {
        throw new BadRequestException('Bu araç zaten sistemde kayıtlı ve onaylanmış durumda.');
      }
      return { success: true, message: 'Bu araç zaten eklenmiş ve onay bekliyor.', variantId: existing.id };
    }

    const variant = await this.prisma.vehicleVariant.create({
      data: {
        brandId: dto.brandId,
        modelId: dto.modelId,
        generationId: dbGen.id,
        engineId: dbEngine.id,
        transmissionId: dbTrans.id,
        trimId: dbTrim.id,
        countryId,
        year: dto.year,
        status: ApprovalStatus.PENDING,
        createdById: userId
      }
    });

    return { success: true, message: 'Araç ekleme talebi başarıyla oluşturuldu ve admin onayına gönderildi.', variantId: variant.id };
  }

  // Admin: Get all pending variants
  async getPendingVariants() {
    return this.prisma.vehicleVariant.findMany({
      where: { status: ApprovalStatus.PENDING },
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true,
        createdBy: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Admin: Approve a variant
  async approveVariant(id: string, adminId: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Varyant bulunamadı.');

    const updated = await this.prisma.vehicleVariant.update({
      where: { id },
      data: {
        status: ApprovalStatus.APPROVED,
        approvedById: adminId,
        approvedAt: new Date()
      }
    });

    // Populate specs & checklists
    await this.populateVariantDetails(id);

    return { success: true, message: 'Araç varyantı onaylandı ve yayına alındı.', variantId: updated.id };
  }

  // Admin: Reject a variant
  async rejectVariant(id: string, reason: string, adminId: string) {
    const variant = await this.prisma.vehicleVariant.findUnique({ where: { id } });
    if (!variant) throw new NotFoundException('Varyant bulunamadı.');

    const updated = await this.prisma.vehicleVariant.update({
      where: { id },
      data: {
        status: ApprovalStatus.REJECTED,
        approvedById: adminId,
        rejectedReason: reason
      }
    });

    return { success: true, message: 'Araç varyantı reddedildi.', variantId: updated.id };
  }

  // Admin: Update variant fields
  async updateVariant(id: string, dto: AdminUpdateVariantDto) {
    const variant = await this.prisma.vehicleVariant.findUnique({
      where: { id },
      include: { engine: true, transmission: true, trim: true }
    });
    if (!variant) throw new NotFoundException('Varyant bulunamadı.');

    const updateData: any = {};
    if (dto.brandId) updateData.brandId = dto.brandId;
    if (dto.modelId) updateData.modelId = dto.modelId;
    if (dto.year) updateData.year = dto.year;

    if (dto.bodyType) {
      updateData.bodyType = this.mapBodyType(dto.bodyType);
    }

    if (dto.fuelType) {
      updateData.fuelType = this.mapFuelType(dto.fuelType);
    }

    if (dto.engine) {
      const fuelType = updateData.fuelType || variant.fuelType || FuelType.PETROL;
      const dbEngine = await this.resolveEngine(dto.engine, fuelType);
      updateData.engineId = dbEngine.id;
    }

    if (dto.transmission) {
      const dbTrans = await this.resolveTransmission(dto.transmission);
      updateData.transmissionId = dbTrans.id;
    }

    if (dto.trimName) {
      const dbTrim = await this.resolveTrim(dto.trimName);
      updateData.trimId = dbTrim.id;
    }

    return this.prisma.vehicleVariant.update({
      where: { id },
      data: updateData,
      include: {
        brand: true,
        model: true,
        engine: true,
        transmission: true,
        trim: true
      }
    });
  }
}
