import { Injectable, UnauthorizedException, ConflictException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { Role, SubscriptionTier } from '@prisma/client';

export const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
  'burhanseckin08@icloud.com',
];

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    try {
      const users = await this.prisma.user.findMany({
        select: { id: true, email: true, role: true, subscriptionTier: true },
      });
      const adminUsers = users.filter(u => ADMIN_EMAILS.includes(u.email.toLowerCase()));
      for (const u of adminUsers) {
        if (u.role !== Role.ADMIN || u.subscriptionTier !== SubscriptionTier.PROFESYONEL) {
          await this.prisma.user.update({
            where: { id: u.id },
            data: { role: Role.ADMIN, subscriptionTier: SubscriptionTier.PROFESYONEL },
          }).catch(() => null);
        }
      }
    } catch (err: any) {
      console.warn('Admin user sync warning:', err?.message);
    }
  }

  private async generateCustomerNo(date: Date = new Date()): Promise<string> {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const period = `${yy}${mm}`;

    const updatedCounter = await this.prisma.customerNoCounter.upsert({
      where: { period },
      update: { counter: { increment: 1 } },
      create: { period, counter: 1 },
    });

    const seqStr = String(updatedCounter.counter).padStart(6, '0');
    return `TS-${period}-${seqStr}`;
  }

  async register(dto: RegisterDto) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
        ],
      },
    }).catch(() => null);

    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kayıtlı. Lütfen Giriş Yapın.');
    }

    const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
    const assignedRole = isAdmin ? Role.ADMIN : (dto.role || Role.USER);
    const assignedTier = isAdmin ? SubscriptionTier.PROFESYONEL : (dto.subscriptionTier || SubscriptionTier.TANISMA);
    const customerNo = await this.generateCustomerNo(new Date());

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash: dto.password,
          role: assignedRole,
          subscriptionTier: assignedTier,
          preferredLanguageCode: 'tr',
          customerNo,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        throw new ConflictException('Bu e-posta adresi zaten kayıtlı. Lütfen Giriş Yapın.');
      }

      // Fallback for legacy PostgreSQL enum "SubscriptionTier" values
      const fallbackTier =
        assignedTier === SubscriptionTier.TANISMA
          ? SubscriptionTier.FREE
          : assignedTier === SubscriptionTier.YETKIN
          ? SubscriptionTier.STANDARD
          : assignedTier === SubscriptionTier.PROFESYONEL
          ? SubscriptionTier.PREMIUM
          : SubscriptionTier.FREE;

      try {
        user = await this.prisma.user.create({
          data: {
            email: cleanEmail,
            passwordHash: dto.password,
            role: assignedRole,
            subscriptionTier: fallbackTier,
            preferredLanguageCode: 'tr',
            customerNo,
          },
        });
      } catch (fallbackErr: any) {
        throw new BadRequestException('Kayıt oluşturulurken bir hata oluştu: ' + (fallbackErr?.message || err?.message || 'Bilinmeyen hata'));
      }
    }

    if (assignedTier !== SubscriptionTier.TANISMA && assignedTier !== SubscriptionTier.FREE) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier: assignedTier },
      }).catch(() => null);

      if (plan) {
        await this.prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
          },
        }).catch(() => null);
      }
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    };
  }

  async login(dto: LoginDto) {
    const cleanEmail = dto.email ? dto.email.trim().toLowerCase() : '';
    const cleanPassword = dto.password ? dto.password.trim() : '';
    
    // Find user safely
    const users = await this.prisma.user.findMany({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
    }).catch(() => []);

    const user = users[0] || await this.prisma.user.findUnique({ where: { email: cleanEmail } }).catch(() => null);

    if (!user || (user.passwordHash !== dto.password && user.passwordHash !== cleanPassword)) {
      throw new UnauthorizedException('E-posta adresi veya şifre hatalı.');
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (isAdmin && (user.role !== Role.ADMIN || user.subscriptionTier !== SubscriptionTier.PROFESYONEL)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: Role.ADMIN,
          subscriptionTier: SubscriptionTier.PROFESYONEL,
        },
      }).catch(() => null);
      user.role = Role.ADMIN;
      user.subscriptionTier = SubscriptionTier.PROFESYONEL;
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    };
  }
}
