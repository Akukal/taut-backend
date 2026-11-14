import { Injectable, OnModuleInit } from '@nestjs/common';

// Load the generated client without relying on its type exports.
const PrismaClient: any = require('@prisma/client').PrismaClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}