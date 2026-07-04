import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { ApprovalStatus, Role, TransmissionType, FuelType, BodyType, RiskLevel, VehicleInfoCategory } from '@prisma/client';
import { AiGenerateVehicleDto } from './vehicle.dto';



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

    // Auto-generate details on demand if missing (dynamic shell catalog support)
    if (!variant.specs || variant.problems.length === 0) {
      await this.populateVariantDetails(variant.id);

      // Re-fetch fully populated variant
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

      if (!freshVariant) {
        throw new NotFoundException('Araç varyantı bulunamadı.');
      }

      // Assign the fresh variant to continue
      return this.formatVariantDetail(freshVariant, userId);
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
          hasTurbo: fuelType === FuelType.ELECTRIC ? false : true
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
        problems: true
      }
    });

    if (!variant) return;

    // Check if it already has specs or problems
    if (variant.specs || variant.problems.length > 0) {
      return;
    }

    const adminUser = await this.prisma.user.findFirst({ where: { role: Role.ADMIN } });
    if (!adminUser) {
      throw new BadRequestException('Sistem yöneticisi bulunamadı.');
    }

    const demoUser = await this.prisma.user.findFirst({ where: { role: Role.USER } }) || adminUser;

    const brandName = variant.brand.name;
    const engineCode = variant.engine.code;
    const fuelType = variant.engine.fuelType;
    const transType = variant.transmission.type;
    const transName = variant.transmission.name;

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

    // Generate Problems
    const problems: { title: string; desc: string; symp: string; check: string; risk: RiskLevel }[] = [];
    
    if (transType === TransmissionType.DCT) {
      problems.push({
        title: `${transName} Mekatronik ve Çift Kavrama Aşınması`,
        desc: `Çift kavramalı ${transName} şanzımanlarda dur-kalk trafikte ısınma, basınç tüpü gevşemesi ve kavrama setinde aşınma kroniktir.`,
        symp: 'Kalkışta titreme, vites geçişlerinde vuruntu, vites geçişlerinde kararsızlık.',
        check: 'Test sürüşünde dik rampada yarım debriyaj kalkış testi yapılmalı ve titreme kontrol edilmelidir.',
        risk: RiskLevel.HIGH
      });
    } else if (transType === TransmissionType.CVT) {
      problems.push({
        title: 'CVT Şanzıman Kayış Kaçırması ve Uğultu',
        desc: 'Sürekli değişken oranlı CVT şanzımanlarda yüksek kilometrede kayış aşınması ve kasnak uğultusu kronikleşebilir.',
        symp: 'Hızlanırken motor devrinin artmasına rağmen hızlanmanın yavaş kalması, yüksek hızlarda uğultulu ses.',
        check: 'Düz yolda ani tam gaz verilerek devir saatinin dalgalanıp dalgalanmadığı izlenmelidir.',
        risk: RiskLevel.MEDIUM
      });
    }

    if (fuelType === FuelType.DIESEL) {
      problems.push({
        title: 'Dizel Partikül Filtresi (DPF) Tıkanması',
        desc: 'Şehir içi kısa mesafe ve düşük devirli kullanımlarda DPF dolması ve egzoz tıkanması sık görülür.',
        symp: 'Motor arıza lambası, egzozdan siyah duman, yakıt tüketiminde artış.',
        check: 'Göstergede DPF lambası yanıp sönmediği kontrol edilmeli, rölantide duman takibi yapılmalıdır.',
        risk: RiskLevel.MEDIUM
      });
    }

    if (brandName.toLowerCase() === 'bmw') {
      problems.push({
        title: 'Vanos Valfi ve Yağ Kaçakları',
        desc: 'BMW motorlarında supap zamanlama vanos valfleri ve karter conta bölgesinde yağ kaçakları yaygındır.',
        symp: 'Motor altında yağ damlamaları, rölanti düzensizliği, motor gücünde kayıp.',
        check: 'Lifte kaldırıldığında karter ve motor üst kapak contası altı kontrol edilmelidir.',
        risk: RiskLevel.MEDIUM
      });
    } else if (brandName.toLowerCase() === 'audi' && fuelType === FuelType.PETROL) {
      problems.push({
        title: 'TFSI Piston Segman Yağ Yakması',
        desc: 'Audi benzinli TFSI motorlarında piston segman yapısı nedeniyle yüksek miktarda motor yağı eksiltme görülebilir.',
        symp: 'Egzozdan mavi duman gelmesi, yağ çubuğundaki hızlı düşüş.',
        check: 'Ekzoz çıkışındaki kurum birikimi ve yağ çubuğu kontrol edilmelidir.',
        risk: RiskLevel.HIGH
      });
    } else if (brandName.toLowerCase() === 'opel') {
      problems.push({
        title: 'Ateşleme Bobini ve Piston Kırma Riski',
        desc: 'Özellikle Opel turbo benzinli motorlarda kalitesiz yakıt kullanımı sonucu ateşleme bobini arızası ve segman/piston hasarı oluşabilir.',
        symp: 'Yüksek devirde tekleme, sarsıntılı çalışma, motor arıza lambasının yanması.',
        check: 'Ani hızlanmalarda motorda tekleme veya kesiklik olup olmadığı test sürüşünde izlenmelidir.',
        risk: RiskLevel.HIGH
      });







    }

    if (problems.length === 0) {
      problems.push({
        title: 'Trim Sesleri ve Plastik Aşınması',
        desc: 'İç mekandaki plastik aksamların zamanla gevşemesi sonucu trim sesleri ve konsol tıkırtıları oluşabilir.',
        symp: 'Bozuk yollarda kokpitten gelen tıkırtılar.',
        check: 'Test sürüşünde iç mekan sesleri dinlenmelidir.',
        risk: RiskLevel.LOW
      });
    }

    for (const prob of problems) {
      await this.prisma.commonProblem.create({
        data: {
          variantId: variant.id,
          title: prob.title,
          description: prob.desc,
          riskLevel: prob.risk,
          symptoms: prob.symp,
          checkRecommendation: prob.check,
          status: ApprovalStatus.APPROVED,
          createdById: adminUser.id,
          approvedById: adminUser.id,
          approvedAt: new Date()
        }
      });
    }
  }
}
