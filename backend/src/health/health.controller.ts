import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('salud')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica que la API esté disponible' })
  status() {
    return { status: 'ok' };
  }
}
