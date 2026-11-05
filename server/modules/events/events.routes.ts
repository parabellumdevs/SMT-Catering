import { createRouter } from '../../types/http.ts'
import { EventsController } from './events.controller.ts'

export const eventsRouter = createRouter()

eventsRouter.get('/', EventsController.list)
eventsRouter.post('/', EventsController.create)
eventsRouter.patch('/:id', EventsController.update)
eventsRouter.get('/my-events', EventsController.myEvents)
