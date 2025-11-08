import { Body, Controller, Get, Post } from '@nestjs/common';
import { UploadService } from './upload.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { CreateUploadDto } from './dto/create-upload.dto';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('/presigned-url')
  async getUploadUrl(@Body() presignedUrlDto: PresignedUrlDto) {
    return this.uploadService.getUploadUrl(presignedUrlDto.contentType);
  }

  @Post()
  async create(@Body() createUploadDto: CreateUploadDto) {
    return this.uploadService.createUpload(createUploadDto);
  }

  @Get()
  async findAll() {
    return this.uploadService.findAll();
  }
}
