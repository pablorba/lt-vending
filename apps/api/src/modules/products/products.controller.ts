import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { createProductSchema, updateProductSchema } from '@ltv/shared';
import { ProductsService } from './products.service';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

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
    @Body(new ZodValidationPipe(createProductSchema)) body: ReturnType<typeof createProductSchema.parse>,
  ) {
    return this.service.create(user.tenantId, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: ReturnType<typeof updateProductSchema.parse>,
  ) {
    return this.service.update(user.tenantId, id, body);
  }
}
