import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateHomeworkDto } from './create-homework.dto';
 
export class UpdateHomeworkDto extends PartialType(
  OmitType(CreateHomeworkDto, ['userId', 'lessonId'] as const),
) {}
 