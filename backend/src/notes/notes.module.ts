import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { NotesController } from './notes.controller';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [NotesController],
  providers: [NotesRepository, NotesService],
})
export class NotesModule {}
