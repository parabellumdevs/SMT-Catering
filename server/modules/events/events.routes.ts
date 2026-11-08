import { createRouter } from '../../types/http.ts'
import { EventsController } from './events.controller.ts'
import { authGuard } from '../../middleware/authGuard.ts'

export const eventsRouter = createRouter()

eventsRouter.get('/', EventsController.list)
eventsRouter.post('/', EventsController.create)
eventsRouter.patch('/:id', authGuard, EventsController.update)
eventsRouter.get('/my-events', EventsController.myEvents)
