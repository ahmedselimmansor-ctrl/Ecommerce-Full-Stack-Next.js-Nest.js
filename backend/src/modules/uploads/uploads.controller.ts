import { Body, Controller, Delete, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { StorageService } from '../../common/storage/storage.service';
import { SignedUploadDto } from './dto/upload.dto';

@ApiTags('uploads')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post('signed-url')
  @ApiOperation({
    summary: 'Mint a short-lived V4 signed PUT URL so the browser uploads straight to Cloud Storage',
  })
  createSignedUpload(@Body() dto: SignedUploadDto) {
    return this.storage.createSignedUpload({
      folder: dto.folder ?? 'products',
      filename: dto.filename,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  @Delete('object')
  @ApiOperation({ summary: 'Delete an object from the bucket' })
  async remove(@Query('path') objectPath: string) {
    await this.storage.delete(objectPath);
    return { deleted: true };
  }
}
