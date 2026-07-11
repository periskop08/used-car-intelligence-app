import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { CreateConversationDto, CreateMessageDto } from './message.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser, UserPayload } from '../auth/get-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class MessageController {
  constructor(private messageService: MessageService) {}

  @Get()
  @ApiOperation({ summary: 'Kullanıcının Sohbet Listesini Getir' })
  getConversations(@GetUser() user: UserPayload) {
    return this.messageService.getConversations(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sohbet Detayını ve Mesajları Getir' })
  getConversationDetail(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
  ) {
    return this.messageService.getConversationDetail(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Yeni Sohbet Başlat' })
  @ApiResponse({ status: 201, description: 'Sohbet başarıyla başlatıldı.' })
  createConversation(
    @GetUser() user: UserPayload,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messageService.createConversation(user.id, dto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Sohbete Yeni Mesaj Gönder' })
  @ApiResponse({ status: 201, description: 'Mesaj başarıyla gönderildi.' })
  createMessage(
    @Param('id') id: string,
    @GetUser() user: UserPayload,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messageService.createMessage(user.id, id, dto);
  }
}
