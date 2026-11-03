import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createMachineSchema, updateMachineSchema } from '@ltv/shared';
import { MachinesService } from './machines.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('machines')
export class MachinesController {
  constructor(private service: MachinesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.get(user.tenantId, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createMachineSchema)) body: ReturnType<typeof createMachineSchema.parse>,
  ) {
    return this.service.create(user.tenantId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMachineSchema)) body: ReturnType<typeof updateMachineSchema.parse>,
  ) {
    return this.service.update(user.tenantId, id, body);
  }
}
