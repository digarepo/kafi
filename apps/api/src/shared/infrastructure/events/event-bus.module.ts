import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * In-process event bus wrapper. Domain events are published and subscribed
 * locally. A future iteration may replace this with a persistent broker.
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
    }),
  ],
})
export class EventBusModule {}
