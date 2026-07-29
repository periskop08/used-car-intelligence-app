import { Injectable, UnauthorizedException, ConflictException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';
import { Role, SubscriptionTier } from '@prisma/client';

export const ADMIN_EMAILS = [
  'efeguven9991@gmail.com',
  'm.efeeguven@gmail.com',
  'burhanseckin08@gmail.com',
];

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // Automatically promote admin/founder emails to Role.ADMIN & SubscriptionTier.PROFESYONEL on startup
    await this.prisma.user.updateMany({
      where: {
        email: { in: ADMIN_EMAILS, mode: 'insensitive' },
      },
      data: {
        role: Role.ADMIN,
        subscriptionTier: SubscriptionTier.PROFESYONEL,
      },
    }).catch(err => console.warn('Admin sync warning:', err?.message));
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email address already registered');
    }

    const isAdmin = ADMIN_EMAILS.includes(dto.email.toLowerCase());
    const assignedRole = isAdmin ? Role.ADMIN : (dto.role || Role.USER);
    const assignedTier = isAdmin ? SubscriptionTier.PROFESYONEL : (dto.subscriptionTier || SubscriptionTier.TANISMA);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: dto.password,
        role: assignedRole,
        subscriptionTier: assignedTier,
        preferredLanguageCode: 'tr',
      },
    });

    if (assignedTier !== SubscriptionTier.TANISMA && assignedTier !== SubscriptionTier.FREE) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { tier: assignedTier },
      });
      if (plan) {
        await this.prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 years
          },
        });
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || user.passwordHash !== dto.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (isAdmin && (user.role !== Role.ADMIN || user.subscriptionTier !== SubscriptionTier.PROFESYONEL)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: Role.ADMIN,
          subscriptionTier: SubscriptionTier.PROFESYONEL,
        },
      });
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
