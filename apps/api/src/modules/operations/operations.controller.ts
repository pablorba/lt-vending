import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import {
  addSlotSchema,
  createRestockSchema,
  registerCollectionSchema,
  registerWasteSchema,
  setSlotProductsSchema,
  updateSlotSchema,
} from '@ltv/shared';
import { OperationsService } from './operations.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller()
export class OperationsController {
  constructor(private service: OperationsService) {}

  // ----- Dashboard -----
  @Get('dashboard')
  dashboard(
    @CurrentUser() user: AuthenticatedUser,
    @Query('machineId') machineId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const f = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const t = to ? new Date(to) : new Date(new Date().setHours(24, 0, 0, 0));
    return this.service.dashboard(user.tenantId, machineId, f, t);
  }

  // ----- Plan de surtido (rutas estáticas de /machines antes que :id en MachinesController) -----
  @Get('machines/:id/restock-plan')
  restockPlan(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.restockPlan(user.tenantId, id);
  }

  // ----- Planograma -----
  @Post('machines/:id/slots')
  addSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addSlotSchema)) body: ReturnType<typeof addSlotSchema.parse>,
  ) {
    return this.service.addSlot(user.tenantId, id, body);
  }

  @Patch('slots/:id')
  updateSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSlotSchema)) body: ReturnType<typeof updateSlotSchema.parse>,
  ) {
    return this.service.updateSlot(user.tenantId, id, body);
  }

  @Put('slots/:id/products')
  setSlotProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setSlotProductsSchema)) body: ReturnType<typeof setSlotProductsSchema.parse>,
  ) {
    return this.service.setSlotProducts(user.tenantId, id, body);
  }

  // ----- Surtidos -----
  @Get('restocks')
  listRestocks(
    @CurrentUser() user: AuthenticatedUser,
    @Query('machineId') machineId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listRestocks(user.tenantId, machineId, limit ? parseInt(limit, 10) : 30);
  }

  @Get('restocks/:id')
  getRestock(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getRestock(user.tenantId, id);
  }

  @Post('restocks')
  createRestock(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createRestockSchema)) body: ReturnType<typeof createRestockSchema.parse>,
  ) {
    return this.service.createRestock(user.tenantId, body, user.userId);
  }

  // ----- Merma y dinero -----
  @Post('waste')
  registerWaste(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerWasteSchema)) body: ReturnType<typeof registerWasteSchema.parse>,
  ) {
    return this.service.registerWaste(user.tenantId, body, user.userId);
  }

  @Post('collections')
  registerCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(registerCollectionSchema))
    body: ReturnType<typeof registerCollectionSchema.parse>,
  ) {
    return this.service.registerCollection(user.tenantId, body, user.userId);
  }
}
