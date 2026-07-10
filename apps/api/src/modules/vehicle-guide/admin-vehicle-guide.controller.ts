import { Controller, Get, Post, Patch, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehicleGuideService } from './vehicle-guide.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';
import { 
  CreateGuideCardDto, UpdateGuideCardDto,
  CreateGuideFactDto, UpdateGuideFactDto,
  CreateTechnicalInfoDto, CardTranslationDto, FactTranslationDto
} from './vehicle-guide.dto';

@ApiTags('Admin Vehicle Guide')
@Controller('admin/vehicle-guide')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AdminVehicleGuideController {
  constructor(private guideService: VehicleGuideService) {}

  @Get('cards')
  @ApiOperation({ summary: 'Tüm araç rehberi kartlarını listeler.' })
  async getCards(@GetUser() user: UserPayload) {
    this.assertAdmin(user);
    return this.guideService.adminGetCards();
  }

  @Post('cards')
  @ApiOperation({ summary: 'Yeni bir rehber kartı oluşturur.' })
  async createCard(@Body() dto: CreateGuideCardDto, @GetUser() user: UserPayload) {
    this.assertAdmin(user);
    return this.guideService.adminCreateCard(dto);
  }

  @Patch('cards/:id')
  @ApiOperation({ summary: 'Rehber kartı bilgilerini veya statüsünü düzenler.' })
  async updateCard(
    @Param('id') id: string,
    @Body() dto: UpdateGuideCardDto,
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    return this.guideService.adminUpdateCard(id, dto);
  }

  @Post('cards/:id/facts')
  @ApiOperation({ summary: 'Karta yeni bir hap bilgi (fact) ekler.' })
  async addFact(
    @Param('id') cardId: string,
    @Body() dto: CreateGuideFactDto,
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    return this.guideService.adminAddFact(cardId, dto);
  }

  @Patch('facts/:id')
  @ApiOperation({ summary: 'Hap bilgi alanlarını veya statüsünü düzenler.' })
  async updateFact(
    @Param('id') id: string,
    @Body() dto: UpdateGuideFactDto,
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    return this.guideService.adminUpdateFact(id, dto);
  }

  @Post('cards/:id/technical-info')
  @ApiOperation({ summary: 'Karta ait teknik özellikleri ekler/günceller.' })
  async saveTechnicalInfo(
    @Param('id') cardId: string,
    @Body() dto: CreateTechnicalInfoDto,
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    return this.guideService.adminSaveTechnicalInfo(cardId, dto);
  }

  @Post('cards/:id/translation')
  @ApiOperation({ summary: 'Kartın çeviri metinlerini kaydeder.' })
  async saveCardTranslation(
    @Param('id') cardId: string,
    @Body() dto: CardTranslationDto,
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    return this.guideService.adminSaveCardTranslation(cardId, dto);
  }

  @Post('facts/:id/translation')
  @ApiOperation({ summary: 'Fact metinlerinin çevirisini kaydeder.' })
  async saveFactTranslation(
    @Param('id') factId: string,
    @Body() dto: FactTranslationDto,
    @GetUser() user: UserPayload,
  ) {
    this.assertAdmin(user);
    return this.guideService.adminSaveFactTranslation(factId, dto);
  }

  // ==========================================
  // HELPER METHOD FOR ROLE VALIDATION
  // ==========================================
  private assertAdmin(user: UserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Bu işlem için yönetici (Admin) yetkisi gerekmektedir.');
    }
  }
}
